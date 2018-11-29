/* global Map */

class Observable { // eslint-disable-line no-unused-vars
  constructor() {
    this.observers = new Map();
  }

  addObserver(label, callback) {
    this.observers.has(label) || this.observers.set(label, []);
    this.observers.get(label).push(callback);
  }

  notify(label, e) {
    const observers = this.observers.get(label);
    if (observers && observers.length) {
      observers.forEach((callback) => {
        callback(e);
      });
    }
  }
}
