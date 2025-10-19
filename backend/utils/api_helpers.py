"""
API response helpers for consistent JSON responses
"""

from flask import jsonify
from typing import Any, Dict, Optional, Tuple


def success_response(
    data: Any = None, message: str = "Success", status_code: int = 200
) -> Tuple[Any, int]:
    """
    Create a successful API response

    Args:
        data: Response data (optional)
        message: Success message
        status_code: HTTP status code (default 200)

    Returns:
        Tuple of (response, status_code)
    """
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return jsonify(response), status_code


def error_response(
    message: str,
    status_code: int = 400,
    error_code: Optional[str] = None,
    details: Optional[Dict] = None,
) -> Tuple[Any, int]:
    """
    Create an error API response

    Args:
        message: Error message
        status_code: HTTP status code (default 400)
        error_code: Optional error code for client handling
        details: Optional additional error details

    Returns:
        Tuple of (response, status_code)
    """
    response = {"success": False, "error": message}
    if error_code:
        response["error_code"] = error_code
    if details:
        response["details"] = details
    return jsonify(response), status_code


def validation_error(errors: Dict[str, str]) -> Tuple[Any, int]:
    """
    Create a validation error response

    Args:
        errors: Dictionary of field: error_message

    Returns:
        Tuple of (response, status_code)
    """
    return error_response(
        message="Validation failed",
        status_code=422,
        error_code="VALIDATION_ERROR",
        details={"fields": errors},
    )


def not_found_error(resource: str = "Resource") -> Tuple[Any, int]:
    """Create a 404 not found response"""
    return error_response(
        message=f"{resource} not found", status_code=404, error_code="NOT_FOUND"
    )


def server_error(message: str = "Internal server error") -> Tuple[Any, int]:
    """Create a 500 server error response"""
    return error_response(message=message, status_code=500, error_code="SERVER_ERROR")
