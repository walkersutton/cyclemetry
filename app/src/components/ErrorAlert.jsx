import React from "react";
import { Alert } from "react-bootstrap";
import useStore from "../store/useStore";

function ErrorAlert() {
  const { errorMessage, clearError } = useStore();

  if (!errorMessage) {
    return null;
  }

  return (
    <Alert variant="danger" dismissible onClose={clearError} className="mb-3">
      <Alert.Heading>
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        Error
      </Alert.Heading>
      <p className="mb-0">{errorMessage}</p>
    </Alert>
  );
}

export default ErrorAlert;
