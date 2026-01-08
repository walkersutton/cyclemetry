import React, { useRef, useEffect } from "react";
import useStore from "../store/useStore";
import generateDemoFrame from "../api/generateDemoFrame";

const TimeInputGroup = ({ label, value, onChange, maxMinutes, maxSeconds }) => (
  <div className="d-flex align-items-center justify-content-center gap-2">
    <small className="text-muted time-input-label">{label}</small>
    <div className="input-group input-group-sm" style={{ width: "110px" }}>
      <span className="input-group-text">m</span>
      <input
        type="number"
        className="form-control"
        min={0}
        max={Math.floor(maxMinutes)}
        step={1}
        value={Math.floor(value / 60)}
        onChange={(e) => {
          const mins = parseInt(e.target.value, 10);
          const validMins = Number.isNaN(mins) ? 0 : mins;
          const secs = value % 60;
          let total = validMins * 60 + secs;
          total = Math.max(0, Math.min(maxMinutes, total));
          onChange(total);
        }}
      />
    </div>
    <div className="input-group input-group-sm" style={{ width: "110px" }}>
      <span className="input-group-text">s</span>
      <input
        type="number"
        className="form-control"
        min={0}
        max={maxSeconds}
        step={1}
        value={value % 60}
        onChange={(e) => {
          const secs = parseInt(e.target.value, 10);
          const validSecs = Number.isNaN(secs)
            ? 0
            : Math.max(0, Math.min(maxSeconds, secs));
          const mins = Math.floor(value / 60);
          let total = mins * 60 + validSecs;
          total = Math.max(0, Math.min(maxMinutes, total));
          onChange(total);
        }}
      />
    </div>
  </div>
);

const TimelineSlider = ({
  sliderRef,
  didDragRef,
  getSecondFromClientX,
  setSelectedSecond,
  startSecond,
  endSecond,
  selectedSecond,
  dummyDurationSeconds,
  beginDrag,
}) => (
  <div
    className="multi-slider mt-2"
    ref={sliderRef}
    onClick={(e) => {
      if (didDragRef.current) return;
      const sec = getSecondFromClientX(e.clientX);
      setSelectedSecond(Math.max(startSecond, Math.min(endSecond, sec)));
    }}
  >
    <div className="rail" />
    <div
      className="range"
      style={{
        left: `${(startSecond / dummyDurationSeconds) * 100}%`,
        width: `${((endSecond - startSecond) / dummyDurationSeconds) * 100}%`,
      }}
      onClick={(e) => e.stopPropagation()}
    />
    <div
      className="handle handle-start"
      style={{ left: `${(startSecond / dummyDurationSeconds) * 100}%` }}
      onPointerDown={beginDrag("start")}
      onTouchStart={beginDrag("start")}
      onClick={(e) => e.stopPropagation()}
    />
    <div
      className="handle handle-current"
      style={{ left: `${(selectedSecond / dummyDurationSeconds) * 100}%` }}
      onPointerDown={beginDrag("current")}
      onTouchStart={beginDrag("current")}
      onClick={(e) => e.stopPropagation()}
    />
    <div
      className="handle handle-end"
      style={{ left: `${(endSecond / dummyDurationSeconds) * 100}%` }}
      onPointerDown={beginDrag("end")}
      onTouchStart={beginDrag("end")}
    />
  </div>
);

const TimelineInputs = ({
  startSecond,
  endSecond,
  selectedSecond,
  dummyDurationSeconds,
  setStartSecond,
  setEndSecond,
  setSelectedSecond,
  onInputChange,
}) => (
  <div className="d-flex flex-column align-items-center gap-2">
    <TimeInputGroup
      label="Start"
      value={startSecond}
      onChange={(total) => {
        total = Math.max(0, Math.min(dummyDurationSeconds, total));
        // Ensure start is before end
        if (total >= endSecond) {
          setEndSecond(Math.min(total + 1, dummyDurationSeconds));
        }
        // Ensure selected is within range
        if (selectedSecond < total) setSelectedSecond(total);
        setStartSecond(total);
        onInputChange();
      }}
      maxMinutes={dummyDurationSeconds}
      maxSeconds={59}
    />

    <TimeInputGroup
      label="Demo position"
      value={selectedSecond}
      onChange={(total) => {
        total = Math.max(startSecond, Math.min(endSecond, total));
        setSelectedSecond(total);
        onInputChange();
      }}
      maxMinutes={dummyDurationSeconds}
      maxSeconds={59}
    />

    <TimeInputGroup
      label="End"
      value={endSecond}
      onChange={(total) => {
        total = Math.max(0, Math.min(dummyDurationSeconds, total));
        // Ensure end is after start
        if (total <= startSecond) {
          setStartSecond(Math.max(0, total - 1));
        }
        // Ensure selected is within range
        if (selectedSecond > total) setSelectedSecond(total);
        setEndSecond(total);
        onInputChange();
      }}
      maxMinutes={dummyDurationSeconds}
      maxSeconds={59}
    />
  </div>
);

function TimelineControls() {
  const {
    dummyDurationSeconds,
    startSecond,
    endSecond,
    selectedSecond,
    setStartSecond,
    setEndSecond,
    setSelectedSecond,
  } = useStore();

  const sliderRef = React.useRef(null);
  const draggingHandleRef = React.useRef(null);
  const didDragRef = React.useRef(false);
  const debounceTimer = useRef(null);
  const lastRenderedSecond = useRef(selectedSecond);

  const getSecondFromClientX = React.useCallback(
    (clientX) => {
      const track = sliderRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      return Math.round(percent * dummyDurationSeconds);
    },
    [dummyDurationSeconds],
  );

  const onPointerMove = React.useCallback(
    (e) => {
      if (!draggingHandleRef.current) return;
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX == null) return;
      const sec = getSecondFromClientX(clientX);

      switch (draggingHandleRef.current) {
        case "start":
          {
            const newStart = Math.max(0, Math.min(sec, endSecond));
            setStartSecond(newStart);
            if (selectedSecond < newStart) setSelectedSecond(newStart);
          }
          break;
        case "end":
          {
            const newEnd = Math.max(
              startSecond,
              Math.min(sec, dummyDurationSeconds),
            );
            setEndSecond(newEnd);
            if (selectedSecond > newEnd) setSelectedSecond(newEnd);
          }
          break;
        case "current":
          {
            const cur = Math.max(startSecond, Math.min(sec, endSecond));
            setSelectedSecond(cur);
          }
          break;
        default:
          break;
      }
    },
    [
      endSecond,
      getSecondFromClientX,
      selectedSecond,
      startSecond,
      dummyDurationSeconds,
      setStartSecond,
      setEndSecond,
      setSelectedSecond,
    ],
  );

  const stopDragging = React.useCallback(() => {
    const wasStartOrEnd =
      draggingHandleRef.current === "start" ||
      draggingHandleRef.current === "end";
    draggingHandleRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", stopDragging);
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);

    // Trigger demo re-render after drag ends (debounced)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const state = useStore.getState();
      const currentSecond = state.selectedSecond;

      // Update editor with final values after drag
      if (wasStartOrEnd && state.editor && state.config) {
        console.log("📝 Updating editor with final timeline values");
        const updatedConfig = {
          ...state.config,
          scene: {
            ...state.config.scene,
            start: state.startSecond,
            end: state.endSecond,
          },
        };
        try {
          state.editor.setValue(updatedConfig);
        } catch (e) {
          console.warn("Could not update editor:", e);
        }
      }

      // Always re-render if we were dragging start/end, or if selected second changed
      if (wasStartOrEnd || currentSecond !== lastRenderedSecond.current) {
        console.log(
          `Timeline drag ended, re-rendering demo at second ${currentSecond}`,
        );
        lastRenderedSecond.current = currentSecond;
        generateDemoFrame();
      }
    }, 300);
  }, [onPointerMove]);

  const beginDrag = React.useCallback(
    (handle) => (e) => {
      draggingHandleRef.current = handle;
      didDragRef.current = true;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDragging, { once: true });
      window.addEventListener("touchmove", onPointerMove);
      window.addEventListener("touchend", stopDragging, { once: true });
      e.preventDefault();
      e.stopPropagation();
    },
    [onPointerMove, stopDragging],
  );

  const handleInputChange = React.useCallback(() => {
    // Debounce input changes
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const currentSecond = useStore.getState().selectedSecond;
      if (currentSecond !== lastRenderedSecond.current) {
        console.log(
          `Timeline input changed to second ${currentSecond}, re-rendering demo`,
        );
        lastRenderedSecond.current = currentSecond;
        generateDemoFrame();
      }
    }, 500); // Longer debounce for typing
  }, []);

  return (
    <div>
      <div className="d-flex flex-column gap-2">
        <TimelineInputs
          startSecond={startSecond}
          endSecond={endSecond}
          selectedSecond={selectedSecond}
          dummyDurationSeconds={dummyDurationSeconds}
          setStartSecond={setStartSecond}
          setEndSecond={setEndSecond}
          setSelectedSecond={setSelectedSecond}
          onInputChange={handleInputChange}
        />
      </div>

      <TimelineSlider
        sliderRef={sliderRef}
        didDragRef={didDragRef}
        getSecondFromClientX={getSecondFromClientX}
        setSelectedSecond={setSelectedSecond}
        startSecond={startSecond}
        endSecond={endSecond}
        selectedSecond={selectedSecond}
        dummyDurationSeconds={dummyDurationSeconds}
        beginDrag={beginDrag}
      />
    </div>
  );
}

export default TimelineControls;
