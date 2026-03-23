# src/ui/locators.py
"""
Centralized locators for all UI pages/components.
Update selectors here if the UI changes.
"""

class LoginLocators:
    USERNAME_INPUT = "#user-name"  # Username input field
    PASSWORD_INPUT = "#password"   # Password input field
    SUBMIT_BUTTON = "#login-button"  # Login button

class InventoryLocators:
    INVENTORY_CONTAINER = ".inventory_list"  # Main inventory list
    ADD_TO_CART_BACKPACK = "button[data-test='add-to-cart-sauce-labs-backpack']"
    CART_ICON = ".shopping_cart_link"

