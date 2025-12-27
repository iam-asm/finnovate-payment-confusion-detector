export class ZoneMetricsTracker {
    constructor() {
      this.zoneMetrics = new Map();
      this.lastGazePoint = null;
      this.currentZone = null;
    }
  
    _initZone(zoneId) {
      if (!this.zoneMetrics.has(zoneId)) {
        this.zoneMetrics.set(zoneId, {
          totalDwellTime: 0,
          revisitCount: 0,
          hasBeenVisited: false,
          lastEnterTimestamp: null,
          lastExitTimestamp: null,
          saccadeDistance: 0
        });
      }
    }
  
    onZoneEvent(event) {
      const { type, zoneId, fromZone, toZone, timestamp } = event;
  
      // ENTER
      if (type === 'ZONE_ENTER') {
        this._initZone(zoneId);
        const metrics = this.zoneMetrics.get(zoneId);
  
        if (metrics.hasBeenVisited) {
          metrics.revisitCount++;
        }
  
        metrics.hasBeenVisited = true;
        metrics.lastEnterTimestamp = timestamp;
        this.currentZone = zoneId;
      }
  
      // EXIT
      else if (type === 'ZONE_EXIT') {
        if (this.currentZone === zoneId) {
          const metrics = this.zoneMetrics.get(zoneId);
          if (metrics?.lastEnterTimestamp !== null) {
            metrics.totalDwellTime += timestamp - metrics.lastEnterTimestamp;
            metrics.lastEnterTimestamp = null;
            metrics.lastExitTimestamp = timestamp;
          }
          this.currentZone = null;
        }
      }
  
      // SWITCH
      else if (type === 'ZONE_SWITCH') {
        // Exit old
        this._initZone(fromZone);
        const fromMetrics = this.zoneMetrics.get(fromZone);
  
        if (fromMetrics?.lastEnterTimestamp !== null) {
          fromMetrics.totalDwellTime += timestamp - fromMetrics.lastEnterTimestamp;
          fromMetrics.lastEnterTimestamp = null;
          fromMetrics.lastExitTimestamp = timestamp;
        }
  
        // Enter new
        this._initZone(toZone);
        const toMetrics = this.zoneMetrics.get(toZone);
  
        if (toMetrics.hasBeenVisited) {
          toMetrics.revisitCount++;
        }
  
        toMetrics.hasBeenVisited = true;
        toMetrics.lastEnterTimestamp = timestamp;
        this.currentZone = toZone;
      }
    }
  
    onGazePoint({ x, y }) {
      if (this.lastGazePoint && this.currentZone) {
        const dx = x - this.lastGazePoint.x;
        const dy = y - this.lastGazePoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
  
        const metrics = this.zoneMetrics.get(this.currentZone);
        if (metrics) {
          metrics.saccadeDistance += dist;
        }
      }
  
      this.lastGazePoint = { x, y };
    }
  
    getZoneMetrics(zoneId) {
      return this.zoneMetrics.get(zoneId) ?? {
        totalDwellTime: 0,
        revisitCount: 0,
        hasBeenVisited: false,
        saccadeDistance: 0
      };
    }
  
    getAllMetrics() {
      const result = {};
      for (const [zoneId, metrics] of this.zoneMetrics.entries()) {
        result[zoneId] = { ...metrics };
      }
      return result;
    }
  
    reset() {
      this.zoneMetrics.clear();
      this.lastGazePoint = null;
      this.currentZone = null;
    }
  }
  