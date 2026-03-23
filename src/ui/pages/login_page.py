from playwright.sync_api import Page
from .base_page import BasePage
from src.ui.locators import LoginLocators

class LoginPage(BasePage):
    def __init__(self, page: Page) -> None:
        """
        Example LoginPage object. Replace selectors and methods as needed for your app.
        Extend this class for your own login workflows.
        """
        super().__init__(page)

    def login(self, username: str, password: str) -> None:
        """
        Perform login action by filling in the username and password fields and clicking the submit button.

        Args:
            username (str): The username to input.
            password (str): The password to input.

        Returns:
            None
        """
        self.page.fill(LoginLocators.USERNAME_INPUT, username)
        self.page.fill(LoginLocators.PASSWORD_INPUT, password)
        self.page.click(LoginLocators.SUBMIT_BUTTON)

# Example usage:
# class MyLoginPage(LoginPage):
#     ...
