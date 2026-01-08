import React from 'react'
import useStore from '../store/useStore'
import LoadGpxButton from './buttons/LoadGpxButton'
import LoadDemoGpxButton from './buttons/LoadDemoGpxButton'

function ActivitySection() {
  const { gpxFilename, dummyDurationSeconds } = useStore()
  const minutes = Math.floor(dummyDurationSeconds / 60)
  const seconds = dummyDurationSeconds % 60

  return (
    <div className="col-auto">
      <div className="card bg-light w-auto">
        <div className="card-body">
          <h6 className="card-title">Activity </h6>
          <div className="mb-3 text-muted small">
            <span>Name:</span> {gpxFilename ?? 'None loaded'}
            <br />
            <span>Duration:</span> {minutes}m {seconds}s
          </div>
          <div className="d-flex flex-wrap gap-2">
            <LoadGpxButton />
            <LoadDemoGpxButton />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivitySection
