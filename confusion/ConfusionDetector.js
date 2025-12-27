export class ConfusionDetector {
    constructor(metricsTracker) {
      this.metricsTracker = metricsTracker;
      this.listeners = new Set();
      this.confusionFlags = new Map();
  
      this.DWELL_TIME_THRESHOLD = 5000; // ms
      this.REVISIT_COUNT_THRESHOLD = 3;
    }
  
    evaluate() {
      const allMetrics = this.metricsTracker.getAllMetrics();
  
      for (const [zoneId, metrics] of Object.entries(allMetrics)) {
        const isConfused =
          metrics.totalDwellTime > this.DWELL_TIME_THRESHOLD &&
          metrics.revisitCount > this.REVISIT_COUNT_THRESHOLD;
  
        const wasConfused = this.confusionFlags.get(zoneId) === true;
  
        if (isConfused && !wasConfused) {
          this.emit({
            type: 'CONFUSION_HOTSPOT',
            zoneId,
            metrics: {
              dwellTime: metrics.totalDwellTime,
              revisitCount: metrics.revisitCount,
              saccadeDistance: metrics.saccadeDistance
            },
            timestamp: performance.now()
          });
  
          this.confusionFlags.set(zoneId, true);
        }
      }
    }
  
    onConfusionEvent(cb) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
    }
  
    emit(event) {
      this.listeners.forEach(cb => cb(event));
    }
  
    reset() {
      this.confusionFlags.clear();
    }
  }
  