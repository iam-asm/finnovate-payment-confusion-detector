import { TrackerState } from './TrackerState.js';

export class GazeTracker {
  constructor(stream) {
    if (!stream || typeof stream.emit !== 'function') {
      throw new Error('GazeTracker requires a valid GazeStream with emit() method');
    }
    this.stream = stream;
    this.state = TrackerState.IDLE;
    this.isInitialized = false;
    this.onGazeData = this.onGazeData.bind(this);
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      webgazer.setGazeListener(this.onGazeData);

      webgazer.applyKalmanFilter(true);

      webgazer
        .showVideo(false)
        .showFaceOverlay(false)
        .showFaceFeedbackBox(false);

      await webgazer.begin();

      this.isInitialized = true;
      this.setState(TrackerState.PAUSED);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  startTracking() {
    if (this.state !== TrackerState.PAUSED) return;
    webgazer.resume();
    this.setState(TrackerState.TRACKING);
  }

  pauseTracking() {
    if (this.state !== TrackerState.TRACKING) return;
    webgazer.pause();
    this.setState(TrackerState.PAUSED);
  }

  pauseSensor() {
    webgazer.pause();
  }

  onGazeData(data) {
    if (!data || this.state !== TrackerState.TRACKING) return;
    this.stream.emit({ x: data.x, y: data.y });
  }

  setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }
}