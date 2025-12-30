/**
 * Zone UI Bridge - Backend → Frontend Integration
 * 
 * This module subscribes to backend zone events and applies visual feedback
 * to frontend elements using data-zone attributes.
 * 
 * NO LOGIC - Only DOM manipulation based on backend signals.
 */

export function bindZoneUI(zoneDetector, confusionDetector) {
    // Track currently active zone for cleanup
    let currentActiveZone = null;
  
    // ═══════════════════════════════════════════════════════════
    // ZONE ACTIVITY FEEDBACK
    // ═══════════════════════════════════════════════════════════
  
    zoneDetector.onZoneEvent((event) => {
      const { type, zoneId, fromZone, toZone } = event;
  
      if (type === 'ZONE_ENTER') {
        activateZone(zoneId);
      } 
      else if (type === 'ZONE_EXIT') {
        deactivateZone(zoneId);
      } 
      else if (type === 'ZONE_SWITCH') {
        deactivateZone(fromZone);
        activateZone(toZone);
      }
    });
  
    // ═══════════════════════════════════════════════════════════
    // CONFUSION HOTSPOT FEEDBACK
    // ═══════════════════════════════════════════════════════════
  
    confusionDetector.onConfusionEvent((event) => {
      const { zoneId } = event;
      markZoneConfused(zoneId);
      console.log('🚨 Confusion detected in zone:', zoneId, event.metrics);
    });
  
    // ═══════════════════════════════════════════════════════════
    // DOM MANIPULATION HELPERS
    // ═══════════════════════════════════════════════════════════
  
    function activateZone(zoneId) {
      const element = document.querySelector(`[data-zone="${zoneId}"]`);
      if (!element) return;
  
      // Remove active class from previous zone
      if (currentActiveZone) {
        const prevElement = document.querySelector(`[data-zone="${currentActiveZone}"]`);
        if (prevElement) {
          prevElement.classList.remove('zone-active');
        }
      }
  
      // Add active class to current zone
      element.classList.add('zone-active');
      currentActiveZone = zoneId;
    }
  
    function deactivateZone(zoneId) {
      const element = document.querySelector(`[data-zone="${zoneId}"]`);
      if (!element) return;
  
      element.classList.remove('zone-active');
      
      if (currentActiveZone === zoneId) {
        currentActiveZone = null;
      }
    }
  
    function markZoneConfused(zoneId) {
      const element = document.querySelector(`[data-zone="${zoneId}"]`);
      if (!element) return;
  
      // Add confusion class (persistent - no auto-removal)
      element.classList.add('zone-confused');
    }
  }