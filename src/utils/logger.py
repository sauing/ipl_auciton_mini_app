import logging
import sys

LOGGER_NAME = "hybrid"

_logger = logging.getLogger(LOGGER_NAME)
if not _logger.handlers:
    _logger.setLevel(logging.INFO)
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    _logger.addHandler(h)

log = _logger
"""
Logger instance for the hybrid automation framework.

Attributes:
    log (logging.Logger): Configured logger for use throughout the project.

Note:
    You can change the log level by calling log.setLevel(logging.DEBUG) or similar.
    To add file logging, add a FileHandler to the logger in this file.
"""

def get_logger() -> logging.Logger:
    """
    Get the configured logger instance.

    Returns:
        logging.Logger: The logger instance for the project.
    """
    return log
