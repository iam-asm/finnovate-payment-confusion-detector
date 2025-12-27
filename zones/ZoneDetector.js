export class ZoneDetector {
    constructor(zoneRegistry) {
      this.registry = zoneRegistry;
      this.currentZone = null;
      this.listeners = new Set();
    }
  
    update(x, y, timestamp) {
      // FIX 2: Ensure valid timestamp for future dwell-time calculations
      const eventTimestamp = timestamp || performance.now();
  
      const detectedZone = this.registry.findZoneAtPoint(x, y);
  
      // FIX 3: Only emit events when actual zone change occurs
      if (detectedZone === this.currentZone) {
        return;
      }
  
      // FIX 1: Emit exactly ONE semantic event per transition
      
      // Case 1: Zone A → Outside
      if (this.currentZone !== null && detectedZone === null) {
        this.emit({
          type: 'ZONE_EXIT',
          zoneId: this.currentZone,
          timestamp: eventTimestamp
        });
      }
  
      // Case 2: Outside → Zone A
      else if (this.currentZone === null && detectedZone !== null) {
        this.emit({
          type: 'ZONE_ENTER',
          zoneId: detectedZone,
          timestamp: eventTimestamp
        });
      }
  
      // Case 3: Zone A → Zone B (direct switch)
      else if (this.currentZone !== null && detectedZone !== null) {
        this.emit({
          type: 'ZONE_SWITCH',
          fromZone: this.currentZone,
          toZone: detectedZone,
          timestamp: eventTimestamp
        });
      }
  
      this.currentZone = detectedZone;
    }
  
    onZoneEvent(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
  
    emit(event) {
      this.listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Zone event listener error:', error);
        }
      });
    }
  
    getCurrentZone() {
      return this.currentZone;
    }
  
    reset() {
      this.currentZone = null;
    }
  }