import os
import pytest
from src.api.client import ApiClient
from src.utils.config import CFG

@pytest.fixture
def cfg():
    return CFG

@pytest.fixture
def api_client():
    token = os.getenv("API_TOKEN") or CFG.get("api_token")
    return ApiClient(token=token)
