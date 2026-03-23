from playwright.sync_api import Page, expect

class BasePage:
    def __init__(self, page: Page) -> None:
        """
        Initialize the BasePage object.

        Args:
            page (Page): The Playwright Page instance to interact with.

        Note:
            Use this class as a base for your own page objects.
            Extend and add common methods for your UI automation needs.
        """
        self.page = page

    def goto(self, url: str) -> None:
        """
        Navigate the browser to the specified URL.

        Args:
            url (str): The URL to navigate to.

        Returns:
            None
        """
        self.page.goto(url)

    def assert_text_visible(self, text: str) -> None:
        """
        Assert that the specified text is visible on the page.

        Args:
            text (str): The text to check for visibility.

        Returns:
            None
        """
        expect(self.page.get_by_text(text)).to_be_visible()

# Example usage:
# class MyPage(BasePage):
#     ...
