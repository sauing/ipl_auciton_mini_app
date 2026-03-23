import pytest
import jsonschema
import requests

pytestmark = [pytest.mark.api, pytest.mark.smoke]

PRODUCT_LIST_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["id", "title", "price"],
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "string"},
            "price": {"type": "number"}
        }
    }
}

def test_products_list_schema(api_client) -> None:
    """
    Test that the products API returns a list of products matching the expected schema.
    If a 403 is received, the test will be skipped with a clear message.

    Args:
        api_client: An instance of ApiClient fixture for making API requests.

    Returns:
        None

    Raises:
        AssertionError: If the response status is not 200, the schema does not match,
                        or the returned list is empty.
    """
    resp = api_client.get_products()
    if resp.status_code == 403:
        pytest.skip("Received 403 Forbidden from fakestoreapi.com. This may be due to IP blocking or rate limiting in CI. Skipping test.")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} with body: {resp.text}"
    data = resp.json()
    jsonschema.validate(instance=data, schema=PRODUCT_LIST_SCHEMA)
    assert len(data) > 0

def test_no_auth_header_for_public_api(api_client):
    """
    Ensure that no Authorization header is sent for public APIs like fakestoreapi.com.
    """
    headers = api_client.get_headers()
    assert 'Authorization' not in headers, f"Authorization header should not be sent, but got: {headers}"

def test_public_api_jsonplaceholder():
    """
    Test that a different public API (jsonplaceholder.typicode.com) returns 200 OK.
    Helps diagnose if fakestoreapi.com is blocking CI runners.
    """
    url = "https://jsonplaceholder.typicode.com/posts"
    headers = {"User-Agent": "hybrid-automation/1.0"}
    resp = requests.get(url, headers=headers, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list) and len(data) > 0
