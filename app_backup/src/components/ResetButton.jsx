import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

function ResetButton() {
  const [showModal, setShowModal] = useState(false);

  const handleReset = () => {
    // Clear all localStorage
    localStorage.clear();

    // Reload the page to reset state
    window.location.reload();
  };

  return (
    <>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => setShowModal(true)}
        className="w-100"
      >
        Start Over
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Start Over?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This will clear all saved data including:</p>
          <ul>
            <li>Timeline settings (start, end, position)</li>
            <li>Editor configuration</li>
            <li>Selected GPX file</li>
            <li>All cached images</li>
          </ul>
          <p className="mb-0">
            <strong>This action cannot be undone.</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReset}>
            Reset
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ResetButton;
