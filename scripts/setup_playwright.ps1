param(
  [switch]$RunTests = $false,
  [string]$EnvName = "dev",
  [switch]$Headed = $false,
  [switch]$InstallScoop = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Setup Script" -ForegroundColor Cyan

# Ensure we're at repo root (script may be invoked from anywhere)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $ScriptDir ".."))

# 1) Create venv if missing
if (-Not (Test-Path ".venv")) {
  Write-Host "Creating virtual environment..."
  python -m venv .venv
} else {
  Write-Host "Virtual environment already exists."
}

# 2) Activate venv
Write-Host "Activating virtual environment..."
. .\.venv\Scripts\Activate.ps1

# 3) Upgrade pip & install deps
Write-Host "Upgrading pip..."
python -m pip install --upgrade pip
Write-Host "Installing dependencies from requirements.txt..."
pip install -q -r requirements.txt

# 4) Install Playwright browsers
Write-Host "Installing Playwright browsers..."
python -m playwright install

# 5) Verify install
Write-Host "Verifying Playwright installation..."
$pythonCheck = @'
import sys
try:
    import playwright  # noqa
    print("Playwright Python package OK")
except Exception as e:
    print("Playwright import failed:", e)
    sys.exit(1)
'@
$tempPy = [System.IO.Path]::GetTempFileName() + ".py"
Set-Content -Path $tempPy -Value $pythonCheck
python $tempPy
Remove-Item $tempPy

# 6) Run tests (always)
Write-Host "Running smoke tests..." -ForegroundColor Green
$env:ENV = $EnvName
$headedFlag = if ($Headed) { "--headed" } else { "" }
pytest -m smoke -n auto --alluredir=allure-results $headedFlag
Write-Host "`nAllure results generated in ./allure-results" -ForegroundColor Yellow

# Ensure Allure CLI is installed
if (-not (Get-Command allure -ErrorAction SilentlyContinue)) {
  Write-Host "Allure CLI not found." -ForegroundColor Yellow
  Write-Host "To generate HTML reports, please install Allure CLI:" -ForegroundColor Yellow
  Write-Host "1. (Recommended) Install via Scoop: https://scoop.sh/ then run 'scoop install allure'" -ForegroundColor Yellow
  Write-Host "2. Or install manually: https://docs.qameta.io/allure/#_installing_a_commandline" -ForegroundColor Yellow
  Write-Host "Skipping Allure HTML report generation." -ForegroundColor Red
} else {
  # Generate Allure HTML report
  Write-Host "Generating Allure HTML report..." -ForegroundColor Green
  allure generate allure-results --clean -o allure-report
  Write-Host "Allure HTML report generated in ./allure-report" -ForegroundColor Yellow
}

Write-Host "`nSetup complete!" -ForegroundColor Cyan
