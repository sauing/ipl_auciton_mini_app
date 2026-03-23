from playwright.sync_api import Page, expect
from .base_page import BasePage
from src.ui.locators import InventoryLocators

class InventoryPage(BasePage):
    def __init__(self, page: Page) -> None:
        """
        Example InventoryPage object. Replace selectors and methods as needed for your app.
        Extend this class for your own inventory/product workflows.
        """
        super().__init__(page)

    def should_be_visible(self) -> None:
        """
        Assert that the inventory container is visible on the page.

        Returns:
            None
        """
        expect(self.page.locator(InventoryLocators.INVENTORY_CONTAINER)).to_be_visible()

    def add_backpack_to_cart(self) -> None:
        """
        Click the 'Add to cart' button for the backpack item.

        Returns:
            None
        """
        self.page.click(InventoryLocators.ADD_TO_CART_BACKPACK)

    def open_cart(self) -> None:
        """
        Click the cart icon to open the shopping cart.

        Returns:
            None
        """
        self.page.click(InventoryLocators.CART_ICON)

# Example usage:
# class MyInventoryPage(InventoryPage):
#     ...
