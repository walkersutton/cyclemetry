import React from 'react'
import Alert from 'react-bootstrap/Alert'

function OnboardingState() {
  return (
    <div className="p-4 text-center bg-light rounded border">
      <div className="mb-4">
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <Alert variant="info" className="text-start">
        <Alert.Heading className="h6">🚀 Quick Start</Alert.Heading>
        <ol className="mb-0 ps-3">
          <li className="mb-2">
            <strong>Load an activity</strong>
            <br />
            <small className="text-muted">
              Click <strong>"Try Demo Activity"</strong> to use sample data, or{' '}
              <strong>"Load Activity"</strong> to upload your own GPX file
            </small>
          </li>
          <li className="mb-2">
            <strong>Choose a template</strong>
            <br />
            <small className="text-muted">
              Select a community template or customize your own in the editor
            </small>
          </li>
          <li className="mb-0">
            <strong>Render your video</strong>
            <br />
            <small className="text-muted">
              Adjust the timeline and click "Render Video" to create your
              overlay
            </small>
          </li>
        </ol>
      </Alert>

      <div className="mt-4 p-3 bg-success bg-opacity-10 rounded border border-success">
        <p className="small mb-2">
          <strong>💡 Pro Tip:</strong>
        </p>
        <p className="small mb-0">
          Start with the <strong>"Try Demo Activity"</strong> button and a
          community template to see how it works!
        </p>
      </div>
    </div>
  )
}

export default OnboardingState
