"""
Centralized logging utility for consistent log formatting
"""

import logging
import sys

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(name)


def log_error(logger: logging.Logger, context: str, error: Exception):
    """Log an error with context and traceback"""
    logger.error(f"{context}: {str(error)}", exc_info=True)


def log_request(logger: logging.Logger, method: str, path: str, **kwargs):
    """Log an incoming request with optional parameters"""
    params_str = ", ".join(f"{k}={v}" for k, v in kwargs.items())
    logger.info(f"Request: {method} {path} | {params_str}")


def log_response(logger: logging.Logger, status: int, message: str = ""):
    """Log a response"""
    level = logging.INFO if status < 400 else logging.WARNING
    logger.log(level, f"Response: {status} | {message}")
