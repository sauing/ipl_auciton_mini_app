import json
import os

ENV = os.getenv("ENV", "dev")
# Resolve config path relative to this file's parent directory (project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(BASE_DIR, "config", f"{ENV}.json")

def load_config(config_path: str) -> dict:
    """
    Load the configuration from a JSON file.

    Args:
        config_path (str): The path to the configuration JSON file.

    Returns:
        dict: The loaded configuration as a dictionary.

    Raises:
        FileNotFoundError: If the configuration file does not exist.
        json.JSONDecodeError: If the file is not valid JSON.

    Note:
        Use the template.json file in the config directory as a starting point for your own environment configs.
        Add or modify config keys as needed for your project.
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config not found: {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

CFG = load_config(CONFIG_PATH)
