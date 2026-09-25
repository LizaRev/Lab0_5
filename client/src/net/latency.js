export class LatencyInjector {
  constructor(options = {}) {
    this.latency = options.latency ?? 0;
    this.jitter = options.jitter ?? 0;
    this.packetLoss = options.packetLoss ?? 0;
  }

  setLatency(ms) {
    this.latency = Math.max(0, ms);
  }

  setJitter(ms) {
    this.jitter = Math.max(0, ms);
  }

  setPacketLoss(percent) {
    this.packetLoss = Math.max(
      0,
      Math.min(100, percent)
    );
  }

  shouldDrop() {
    return Math.random() * 100 < this.packetLoss;
  }

  getDelay() {
    if (this.jitter === 0) {
      return this.latency;
    }

    const variation =
      (Math.random() * 2 - 1) * this.jitter;

    return Math.max(
      0,
      this.latency + variation
    );
  }

  send(callback) {
    if (this.shouldDrop()) {
      return false;
    }

    const delay = this.getDelay();

    setTimeout(() => {
      callback();
    }, delay);

    return true;
  }
}