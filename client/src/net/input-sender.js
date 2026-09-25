export class InputSender {
  constructor(send, netgraph = null) {
    this.sendMessage = send;
    this.netgraph = netgraph;
    this.seq = 0;
  }

  send(input) {
    const seq = this.seq++;

    this.sendMessage({
      version: 1,
      type: "input",
      seq,
      input: {
        left: Boolean(input.left),
        right: Boolean(input.right),
        thrust: Boolean(input.thrust),
        fire: Boolean(input.fire),
      },
    });

    this.netgraph?.recordInput();

    return seq;
  }
}