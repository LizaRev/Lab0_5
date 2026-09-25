export class NetGraph {
  constructor() {
    this.samples = [];
    this.maxSamples = 120;

    this.lastInputTime = null;
    this.lastSnapshotTime = null;

    this.inputRate = 0;
    this.snapshotRate = 0;

    this.element = null;
  }

  attach(parent = document.body) {
    this.element = document.createElement("div");

    this.element.style.position = "fixed";
    this.element.style.left = "10px";
    this.element.style.bottom = "10px";
    this.element.style.padding = "8px";
    this.element.style.background = "rgba(0, 0, 0, 0.7)";
    this.element.style.color = "white";
    this.element.style.fontFamily = "monospace";
    this.element.style.fontSize = "12px";
    this.element.style.zIndex = "9999";

    parent.appendChild(this.element);

    this.render();
  }

  recordInput() {
    const now = performance.now();

    if (this.lastInputTime !== null) {
      const delta =
        now - this.lastInputTime;

      if (delta > 0) {
        this.inputRate =
          1000 / delta;
      }
    }

    this.lastInputTime = now;

    this.addSample();
  }

  recordSnapshot(lastProcessedSeq) {
    const now = performance.now();

    if (this.lastSnapshotTime !== null) {
      const delta =
        now - this.lastSnapshotTime;

      if (delta > 0) {
        this.snapshotRate =
          1000 / delta;
      }
    }

    this.lastSnapshotTime = now;

    this.addSample(lastProcessedSeq);
  }

  addSample(lastProcessedSeq = null) {
    this.samples.push({
      time: performance.now(),
      inputRate: this.inputRate,
      snapshotRate: this.snapshotRate,
      lastProcessedSeq,
    });

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.render();
  }

  render() {
    if (!this.element) {
      return;
    }

    const latest =
      this.samples[this.samples.length - 1];

    const seq =
      latest?.lastProcessedSeq ?? "-";

    this.element.textContent =
      `NET\n` +
      `INPUT: ${this.inputRate.toFixed(1)} Hz\n` +
      `SNAP:  ${this.snapshotRate.toFixed(1)} Hz\n` +
      `SEQ:   ${seq}`;
  }
}
