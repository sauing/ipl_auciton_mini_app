import pytest
from src.ui.pages.login_page import LoginPage
from src.ui.pages.inventory_page import InventoryPage

pytestmark = [pytest.mark.e2e]

def test_simple_buy_flow(page, cfg, api_client):
    """
    Test the simple buy flow from login to adding a backpack to the cart.

    Args:
        page: Playwright Page fixture for browser interaction.
        cfg: Configuration dictionary with user credentials and base URL.
        api_client: API client fixture (not used in this test, but available).

    Returns:
        None

    Raises:
        AssertionError: If the cart badge is not visible or the cart item count is not 1.
    """
    lp = LoginPage(page)
    lp.goto(cfg["web_base"])
    lp.login(cfg["user"], cfg["pass"])

    inv = InventoryPage(page)
    inv.should_be_visible()
    inv.add_backpack_to_cart()
    inv.open_cart()

    assert page.locator(".shopping_cart_badge").is_visible()
    assert page.locator(".cart_item").count() == 1
