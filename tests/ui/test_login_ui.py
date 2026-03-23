import pytest
from src.ui.pages.login_page import LoginPage
from src.ui.pages.inventory_page import InventoryPage

pytestmark = [pytest.mark.ui, pytest.mark.smoke]

def test_login_success(page, cfg) -> None:
    """
    Test successful login and inventory page visibility.

    Args:
        page: Playwright Page fixture for browser interaction.
        cfg: Configuration dictionary with user credentials and base URL.

    Returns:
        None

    Raises:
        AssertionError: If the inventory page is not visible after login.
    """
    lp = LoginPage(page)
    lp.goto(cfg["web_base"])
    lp.login(cfg["user"], cfg["pass"])

    inv = InventoryPage(page)
    inv.should_be_visible()
