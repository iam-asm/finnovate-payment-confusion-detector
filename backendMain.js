import { GazeStream } from './core/GazeStream.js';
import { GazeTracker } from './core/GazeTracker.js';
import { CalibrationModule } from './calibration/CalibrationModule.js';
import { bindUI } from './ui/uiBindings.js';
import { ZoneRegistry } from './zones/ZoneRegistry.js';
import { ZoneDetector } from './zones/ZoneDetector.js';
import { ZoneMetricsTracker } from './metrics/ZoneMetricsTracker.js';
import { ConfusionDetector } from './confusion/ConfusionDetector.js';
import { bindZoneUI } from './ui/zoneUIBridge.js';

/* =========================================================
   SYSTEM INITIALIZATION
   ========================================================= */

const gazeStream = new GazeStream();
const tracker = new GazeTracker(gazeStream);
const calibration = new CalibrationModule(tracker);

/* =========================================================
   ZONE DETECTION SETUP (DOM-BASED)
   ========================================================= */

const zoneRegistry = new ZoneRegistry();
const zoneDetector = new ZoneDetector(zoneRegistry);

/**
 * Canonical Zone IDs
 * These MUST match data-zone attributes in the frontend UI
 */
const ZONES = [
  'PRICE_SUMMARY',
  'ITEMS_SUMMARY',
  'PAYMENT_DETAILS',
  'PREMIUM_BOX',
  'TERMS_AND_CONDITIONS',
  'FINAL_SUBMIT_BUTTON'
];

/**
 * Register zones using DOM geometry
 * Frontend controls layout, backend reads bounds dynamically
 */
ZONES.forEach(zoneId => {
  zoneRegistry.register(zoneId, () => {
    const el = document.querySelector(`[data-zone="${zoneId}"]`);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom
    };
  });
});

/* =========================================================
   METRICS & CONFUSION DETECTION
   ========================================================= */

const metricsTracker = new ZoneMetricsTracker();
const confusionDetector = new ConfusionDetector(metricsTracker);

/* =========================================================
   GAZE → ZONE → METRICS → CONFUSION PIPELINE
   ========================================================= */

// Feed gaze points into ZoneDetector
gazeStream.subscribe(({ x, y, t }) => {
  zoneDetector.update(x, y, t);
});

// Feed gaze points into MetricsTracker (for saccade calculation)
gazeStream.subscribe((gazePoint) => {
  metricsTracker.onGazePoint(gazePoint);
});

// Feed zone events into MetricsTracker
zoneDetector.onZoneEvent((event) => {
  metricsTracker.onZoneEvent(event);
  
  // Evaluate confusion after each zone event
  confusionDetector.evaluate();
});

/* =========================================================
   FRONTEND INTEGRATION
   ========================================================= */

// Connect backend events to frontend visuals
bindZoneUI(zoneDetector, confusionDetector);

/* =========================================================
   UI BINDINGS (existing)
   ========================================================= */

bindUI(tracker, calibration, gazeStream);

/* =========================================================
   CONSENT-BASED ACTIVATION
   ========================================================= */

let isSystemActive = false;

async function activateEyeGuardian() {
  if (isSystemActive) {
    console.log('Eye Guardian already active');
    return;
  }

  console.log('🚀 Activating Eye Guardian...');
  
  // Initialize tracker
  const success = await tracker.initialize();
  
  if (!success) {
    alert('Camera access denied. Please allow camera and refresh.');
    return;
  }

  // Start calibration immediately
  await calibration.start();

  // Start tracking after calibration
  tracker.startTracking();
  
  isSystemActive = true;
  console.log('✅ Eye Guardian active');
}

// Check if consent was given on index.html
const consentGranted = localStorage.getItem('eyeConsent') === 'granted';
const urlParams = new URLSearchParams(window.location.search);
const trackingParam = urlParams.get('tracking') === 'on';

if (consentGranted || trackingParam) {
  // Auto-activate if consent already given
  window.addEventListener('load', () => {
    setTimeout(() => activateEyeGuardian(), 500);
  });
}

// Listen for manual activation from UI toggle
window.addEventListener('eyeGuardianToggle', (e) => {
  if (e.detail.enabled && !isSystemActive) {
    activateEyeGuardian();
  } else if (!e.detail.enabled && isSystemActive) {
    tracker.pauseTracking();
    console.log('⏸️ Eye Guardian paused');
  }
});

// Expose activation function globally for UI
window.activateEyeGuardian = activateEyeGuardian;

/* =========================================================
   GAZE POINTER VISUALIZATION
   ========================================================= */

// Create red gaze pointer dot
const gazePointer = document.createElement('div');
gazePointer.id = 'gazePointer';
gazePointer.style.cssText = `
  position: fixed;
  width: 12px;
  height: 12px;
  background: red;
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: none;
  z-index: 99999;
  display: none;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
  transition: transform 0.05s ease;
`;
document.body.appendChild(gazePointer);

// Update pointer position on gaze data
gazeStream.subscribe(({ x, y }) => {
  gazePointer.style.display = 'block';
  gazePointer.style.left = `${x - 6}px`; // Center the dot
  gazePointer.style.top = `${y - 6}px`;
});

/* =========================================================
   DEBUG LOGGING
   ========================================================= */

zoneDetector.onZoneEvent(event => {
  console.log('Zone Event:', event);
});

confusionDetector.onConfusionEvent(event => {
  console.log('🚨 Confusion Event:', event);
});