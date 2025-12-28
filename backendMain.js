import { GazeStream } from './core/GazeStream.js';
import { GazeTracker } from './core/GazeTracker.js';
import { CalibrationModule } from './calibration/CalibrationModule.js';
import { bindUI } from './ui/uiBindings.js';
import { ZoneRegistry } from './zones/ZoneRegistry.js';
import { ZoneDetector } from './zones/ZoneDetector.js';

const gazeStream = new GazeStream();
const tracker = new GazeTracker(gazeStream);
const calibration = new CalibrationModule(tracker);

// ═══════════════════════════════════════════════════════════
// ZONE DETECTION SETUP
// ═══════════════════════════════════════════════════════════

const zoneRegistry = new ZoneRegistry();
const zoneDetector = new ZoneDetector(zoneRegistry);

// ⚠️ TEMPORARY MOCK GEOMETRY - Replace with DOM-based bounds later
// These placeholder bounds allow zone detection to work before UI is finalized
zoneRegistry.register('PAY_BUTTON', () => ({
  left: 100, top: 500, right: 300, bottom: 560
}));

zoneRegistry.register('PRICE_SUMMARY', () => ({
  left: 400, top: 100, right: 700, bottom: 300
}));

zoneRegistry.register('PAYMENT_METHODS', () => ({
  left: 100, top: 100, right: 350, bottom: 400
}));

zoneRegistry.register('PREMIUM_CHARGES', () => ({
  left: 400, top: 350, right: 700, bottom: 450
}));

zoneRegistry.register('TERMS_AND_CONDITIONS', () => ({
  left: 100, top: 600, right: 700, bottom: 700
}));

// Connect ZoneDetector to GazeStream
gazeStream.subscribe(({ x, y, t }) => {
  zoneDetector.update(x, y, t);
});

// Debug: Log zone events (temporary - remove later)
zoneDetector.onZoneEvent((event) => {
  console.log('Zone Event:', event);
});

// ═══════════════════════════════════════════════════════════

bindUI(tracker, calibration, gazeStream);