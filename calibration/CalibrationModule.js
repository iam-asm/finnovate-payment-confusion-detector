import { TrackerState } from '../core/TrackerState.js';

export class CalibrationModule {
  constructor(tracker) {
    this.tracker = tracker;
    this.isActive = false;
    this.overlay = null;
    this.dot = null;
  }

  generateCalibrationPoints() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const m = 20;

    return [
      { x: m, y: m },
      { x: w / 2, y: m },
      { x: w - m, y: m },
      { x: m, y: h / 2 },
      { x: w / 2, y: h / 2 },
      { x: w - m, y: h / 2 },
      { x: m, y: h - m },
      { x: w / 2, y: h - m },
      { x: w - m, y: h - m }
    ];
  }

  async start() {
    if (this.isActive) return;
    this.isActive = true;

    this.tracker.pauseSensor();
    this.tracker.setState(TrackerState.CALIBRATING);

    this.overlay = document.createElement("div");
    this.overlay.className = "calibration-overlay active";
    this.dot = document.createElement("div");
    this.dot.className = "calibration-dot";
    this.overlay.appendChild(this.dot);
    document.body.appendChild(this.overlay);

    const points = this.generateCalibrationPoints();

    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];
      this.dot.style.left = `${x}px`;
      this.dot.style.top = `${y}px`;

      await new Promise(r => setTimeout(r, 700));

      const end = performance.now() + 2000;
      while (performance.now() < end) {
        webgazer.recordScreenPosition(x, y);
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
    }
    this.overlay = null;
    this.dot = null;
    
    this.tracker.setState(TrackerState.PAUSED);
    this.isActive = false;
  }
}