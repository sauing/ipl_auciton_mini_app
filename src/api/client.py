import requests
from src.utils.config import CFG
from src.utils.logger import log

class ApiClient:
    def __init__(self, token: str | None = None) -> None:
        """
        Initialize the ApiClient.

        Args:
            token (str | None, optional): Bearer token for authentication. Defaults to None.

        Note:
            Replace or extend the methods below with your own API endpoints.
            Use this class as a template for your API client implementation.
        """
        self.base = CFG["api_base"].rstrip("/")
        self.session = requests.Session()
        # Only add Authorization header if token is provided and not empty
        if token:
            token = token.strip()
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})

    # Example endpoint method. Replace or extend as needed.
    def get_example(self) -> requests.Response:
        """
        Example method for a GET endpoint. Replace with your own endpoints.

        Returns:
            requests.Response: The HTTP response object.
        """
        url = f"{self.base}/example"
        log.info(f"GET {url} | headers={self.session.headers}")
        return self.session.get(url, timeout=30)

    # Remove or modify the methods below as needed for your project.
    def get_products(self) -> requests.Response:
        """
        Retrieve the list of products from the API.

        Returns:
            requests.Response: The HTTP response object containing the products list.
        """
        url = f"{self.base}/products"
        log.info(f"GET {url} | headers={self.session.headers}")
        return self.session.get(url, timeout=30)

    def get_product(self, product_id: int) -> requests.Response:
        """
        Retrieve a single product by its ID from the API.

        Args:
            product_id (int): The ID of the product to retrieve.

        Returns:
            requests.Response: The HTTP response object containing the product details.
        """
        url = f"{self.base}/products/{product_id}"
        log.info(f"GET {url} | headers={self.session.headers}")
        return self.session.get(url, timeout=30)

    def get_headers(self) -> dict:
        """
        Return the current session headers.
        """
        return dict(self.session.headers)
