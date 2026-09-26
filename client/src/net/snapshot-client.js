export class SnapshotClient {
constructor(netgraph = null) {
this.netgraph = netgraph;


this.latestSnapshot = null;

this.snapshots = [];

this.maxSnapshots = 30;

this.listeners = new Set();


}

receive(snapshot) {
if (
!snapshot ||
snapshot.type !== "snapshot"
) {
return;
}


const receivedAt =
  performance.now();

const bufferedSnapshot = {
  snapshot,
  receivedAt
};

this.snapshots.push(
  bufferedSnapshot
);

if (
  this.snapshots.length >
  this.maxSnapshots
) {
  this.snapshots.shift();
}

this.latestSnapshot =
  snapshot;

this.netgraph?.recordSnapshot(
  snapshot.lastProcessedSeq
);

for (
  const listener of
  this.listeners
) {
  listener(snapshot);
}


}

onSnapshot(callback) {
this.listeners.add(
callback
);


return () => {
  this.listeners.delete(
    callback
  );
};


}

getSnapshot() {
return this.latestSnapshot;
}

getSnapshots() {
return this.snapshots;
}


getInterpolationPair(
renderTime
) {


if (
  this.snapshots.length <
  2
) {
  return null;
}


for (
  let i = 0;
  i <
  this.snapshots.length - 1;
  i++
) {

  const previous =
    this.snapshots[i];

  const next =
    this.snapshots[i + 1];

  if (
    previous.receivedAt <=
      renderTime &&
    renderTime <=
      next.receivedAt
  ) {

    const duration =
      next.receivedAt -
      previous.receivedAt;

    const alpha =
      duration > 0
        ? (
            renderTime -
            previous.receivedAt
          ) / duration
        : 0;

    return {
      previous:
        previous.snapshot,

      next:
        next.snapshot,

      alpha:
        Math.max(
          0,
          Math.min(
            1,
            alpha
          )
        )
    };
  }
}


const first =
  this.snapshots[0];

const second =
  this.snapshots[1];

if (
  renderTime <
  first.receivedAt
) {

  return {
    previous:
      first.snapshot,

    next:
      second.snapshot,

    alpha: 0
  };
}



const previous =
  this.snapshots[
    this.snapshots.length - 2
  ];

const next =
  this.snapshots[
    this.snapshots.length - 1
  ];

const duration =
  next.receivedAt -
  previous.receivedAt;

const alpha =
  duration > 0
    ? (
        renderTime -
        previous.receivedAt
      ) / duration
    : 1;

return {
  previous:
    previous.snapshot,

  next:
    next.snapshot,

  alpha:
    Math.max(
      0,
      Math.min(
        1,
        alpha
      )
    )
};


}
}
