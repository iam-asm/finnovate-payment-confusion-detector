export class GazeStream {
    constructor() {
      this.subscribers = new Set();
    }
    subscribe(fn) {
      this.subscribers.add(fn);
      return () => this.subscribers.delete(fn);
    }
    emit(event) {
      this.subscribers.forEach(fn => fn(event));
    }
  }