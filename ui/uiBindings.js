import { TrackerState } from '../core/TrackerState.js';

export function bindUI(tracker, calibration, gazeStream) {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const calibrateBtn = document.getElementById("calibrateBtn");
  const stateEl = document.getElementById("state");
  const xEl = document.getElementById("x");
  const yEl = document.getElementById("y");

  gazeStream.subscribe(({ x, y }) => {
    xEl.textContent = Math.round(x);
    yEl.textContent = Math.round(y);
  });

  tracker.onStateChange = (s) => {
    stateEl.textContent = s;
    startBtn.disabled = s !== TrackerState.IDLE;
    pauseBtn.disabled = s !== TrackerState.TRACKING;
    resumeBtn.disabled = s !== TrackerState.PAUSED;
    calibrateBtn.disabled = s === TrackerState.IDLE || s === TrackerState.CALIBRATING;
  };

  startBtn.onclick = async () => await tracker.initialize();
  pauseBtn.onclick = () => tracker.pauseTracking();
  resumeBtn.onclick = () => tracker.startTracking();
  calibrateBtn.onclick = () => calibration.start();
}