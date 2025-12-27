export class ZoneRegistry {
    constructor() {
      this.zones = new Map();
    }
  
    register(zoneId, getBoundsFn) {
      if (typeof getBoundsFn !== 'function') {
        throw new Error('getBounds must be a function');
      }
      this.zones.set(zoneId, { id: zoneId, getBounds: getBoundsFn });
    }
  
    unregister(zoneId) {
      this.zones.delete(zoneId);
    }
  
    getZone(zoneId) {
      return this.zones.get(zoneId);
    }
  
    getAllZones() {
      return Array.from(this.zones.values());
    }
  
    findZoneAtPoint(x, y) {
      for (const zone of this.zones.values()) {
        const bounds = zone.getBounds();
        
        if (x >= bounds.left && x <= bounds.right &&
            y >= bounds.top && y <= bounds.bottom) {
          return zone.id;
        }
      }
      return null;
    }
  }