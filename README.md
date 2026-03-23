# Hybrid UI + API Automation Framework Template

A robust, scalable Python template for automated testing of both web UIs and APIs. Built with Playwright, Requests, and Pytest, it enables seamless end-to-end, UI, and API test automation with environment-based configuration and rich reporting.

---

[![CI](https://img.shields.io/github/actions/workflow/status/sauing/hybrid-automation/ci.yml?branch=main&label=CI)](https://github.com/sauing/hybrid-automation/actions)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-UI%20tests-2EAD33)
[![Template](https://img.shields.io/badge/Use%20this%20Template-ready-brightgreen)](https://github.com/sauing/hybrid-automation/generate)
[![Allure](https://img.shields.io/badge/Allure-report-blue)](https://sauing.github.io/hybrid-automation/)


## How to Use This Template

1. **Copy or Fork This Repository**
   - Use this repo as a starting point for your own automation project.

2. **Configuration**
   - Copy `config/template.json` to `config/dev.json`, `config/qa.json`, etc. and fill in your environment-specific values.
   - Add or modify config keys as needed for your project.

3. **API Client**
   - `src/api/client.py` contains example methods and endpoints. Replace or extend these with your own API endpoints.
   - Use the provided structure for authentication and session management

4. **UI Page Objects**
   - `src/ui/pages/base_page.py` is a generic base class for your page objects.
   - `src/ui/pages/login_page.py` and `src/ui/pages/inventory_page.py` are examples. Replace selectors and methods with those for your application, or add new page objects as needed.

5. **Utilities**
   - `src/utils/config.py` loads config based on the ENV variable. Extend as needed.
   - `src/utils/logger.py` provides a logger. Change log level or add file logging as needed.

6. **Writing Tests**
   - Place new API tests in `tests/api/`, UI tests in `tests/ui/`, and hybrid tests in `tests/e2e/`.
   - Use fixtures from `conftest.py` for config and API client access.
   - Use Playwright’s page object model for UI automation.

7. **Remove Example Code**
   - Remove or replace example endpoints, selectors, and test cases with your own.

---

## Features
- **Hybrid Testing:** Automate both UI (web) and API workflows, or combine them for end-to-end scenarios.
- **Playwright Integration:** Fast, reliable browser automation for modern web apps.
- **API Automation:** Use Requests for flexible, powerful API testing.
- **Configurable Environments:** Easily switch between environments (dev, qa, etc.) using JSON config files.
- **Parallel Execution:** Speed up test runs with pytest-xdist.
- **Allure Reporting:** Generate beautiful, interactive test reports.
- **Extensible Structure:** Modular codebase for easy maintenance and scaling.

---

## Technologies Used
- **Python 3.11+**
- **Pytest** (test runner)
- **Playwright** (UI automation)
- **Requests** (API automation)
- **pytest-xdist** (parallel test execution)
- **Allure-pytest** (reporting)
- **jsonschema** (API response validation)

---

## Project Structure
```
├── src/                # Framework source code
│   ├── api/            # API client, helpers (replace with your endpoints)
│   ├── ui/             # UI page objects, helpers (replace with your pages)
│   ├── utils/          # Config, logger, utilities
│   └── __init__.py
├── tests/              # Test cases (add your own)
│   ├── api/            # API tests
│   ├── ui/             # UI tests
│   └── e2e/            # End-to-end (hybrid) tests
├── config/             # Environment configs (copy template.json)
├── scripts/            # Setup scripts
│   └── setup_playwright.ps1
├── conftest.py         # Pytest fixtures (config, API client, etc.)
├── requirements.txt    # Python dependencies
├── pytest.ini          # Pytest config & markers
└── README.md           # Project documentation
```

---

## Quickstart

### 1. Clone the Repository
```bash
git clone <REPO_URL>
cd hybrid-automation
```

### 2. Setup Python Virtual Environment
```bash
python -m venv .venv
# Windows:
. .venv/Scripts/activate
# macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies & Playwright Browsers
```bash
pip install -r requirements.txt
python -m playwright install
```
Or use the provided PowerShell script (Windows):
```powershell
scripts/setup_playwright.ps1
```

### 4. Set Environment
Set the environment variable to select config (e.g., dev, qa):
```bash
# Windows:
set ENV=dev
# macOS/Linux:
export ENV=dev
```

### 5. Run Tests
- **Smoke tests:**
  ```bash
  pytest -m smoke -n auto --alluredir=allure-results
  ```
- **UI tests:**
  ```bash
  pytest -m ui --headed
  ```
- **API tests:**
  ```bash
  pytest -m api
  ```
- **E2E tests:**
  ```bash
  pytest -m e2e
  ```

### 6. View Allure Report
```bash
allure serve allure-results
```

---

## Configuration
- Copy `config/template.json` to your environment (e.g., `dev.json`, `qa.json`) and fill in values.
- Sensitive data (tokens, etc.) can be set via environment variables or config files.

---

## Markers
Defined in `pytest.ini`:
- `smoke`: Basic checks
- `ui`: UI tests
- `api`: API tests
- `e2e`: End-to-end (hybrid) tests

---

## Contributing
1. Fork the repo and create a feature branch.
2. Add/modify tests or framework code.
3. Ensure all tests pass and code is linted.
4. Submit a pull request with a clear description.

---

## License
[MIT](LICENSE)

---

## Support
For questions or issues, open an issue on GitHub or contact the maintainer.
