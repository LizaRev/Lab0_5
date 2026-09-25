export class SnapshotClient {
  constructor(netgraph = null) {
    this.netgraph = netgraph;
    this.latestSnapshot = null;
    this.listeners = new Set();
  }

  receive(snapshot) {
    if (!snapshot || snapshot.type !== "snapshot") {
      return;
    }

    this.latestSnapshot = snapshot;

    this.netgraph?.recordSnapshot(
      snapshot.lastProcessedSeq
    );

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  onSnapshot(callback) {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  getSnapshot() {
    return this.latestSnapshot;
  }
}
