import { LatencyInjector } from "./latency.js";
import { NetGraph } from "./netgraph.js";
import { InputSender } from "./input-sender.js";
import { SnapshotClient } from "./snapshot-client.js";

export class ClientNetwork {
  constructor(connection) {
    this.connection = connection;

    this.netgraph =
      new NetGraph();

    this.latency =
      new LatencyInjector({
        latency: 0,
      });

    this.snapshotClient =
      new SnapshotClient(
        this.netgraph
      );

    this.inputSender =
      new InputSender(
        (message) => {
          this.send(message);
        },
        this.netgraph
      );
  }

  send(message) {
    this.latency.send(
      () => {
        this.connection.send(
          message
        );
      }
    );
  }

  sendInput(input) {
    return this.inputSender.send(
      input
    );
  }

  handleMessage(message) {
    if (
      message.type !== "snapshot"
    ) {
      return;
    }

    this.latency.send(
      () => {
        this.snapshotClient.receive(
          message
        );
      }
    );
  }

  onSnapshot(callback) {
    return this.snapshotClient.onSnapshot(
      callback
    );
  }

  setLatency(ms) {
    this.latency.setLatency(ms);
  }

  setJitter(ms) {
    this.latency.setJitter(ms);
  }

  setPacketLoss(percent) {
    this.latency.setPacketLoss(
      percent
    );
  }
}