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

    // Create overlay with themed styling
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create instruction text
    const instruction = document.createElement("div");
    instruction.style.cssText = `
      position: fixed;
      top: 40px;
      left: 50%;
      transform: translateX(-50%);
      color: #f5e8c7;
      font-size: 18px;
      font-family: 'Cinzel', serif;
      z-index: 10000;
      text-align: center;
    `;
    instruction.textContent = "Follow the golden dot with your eyes";

    // Create calibration dot - THEMED (yellow fill, brown border)
    this.dot = document.createElement("div");
    this.dot.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: #ffd700;
      border: 3px solid #8b4513;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
      transition: all 0.3s ease;
    `;

    this.overlay.appendChild(this.dot);
    document.body.appendChild(this.overlay);
    document.body.appendChild(instruction);

    const points = this.generateCalibrationPoints();

    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];
      
      // Update instruction
      instruction.textContent = `Calibration Point ${i + 1} of ${points.length}`;
      
      this.dot.style.left = `${x}px`;
      this.dot.style.top = `${y}px`;

      await new Promise(r => setTimeout(r, 700));

      const end = performance.now() + 2000;
      while (performance.now() < end) {
        webgazer.recordScreenPosition(x, y);
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Cleanup
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
    }
    if (instruction && instruction.parentNode) {
      instruction.remove();
    }
    this.overlay = null;
    this.dot = null;
    
    this.tracker.setState(TrackerState.PAUSED);
    this.isActive = false;
  }
}