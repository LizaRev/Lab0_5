import {
  encodeInput,
  decodeInput,
  encodeSnapshot,
} from "./shared/protocol/binary.js";

const input = {
  version: 1,
  type: "input",
  seq: 123,
  input: {
    left: true,
    right: false,
    thrust: true,
    fire: false,
  },
};

const snapshot = {
  version: 1,
  type: "snapshot",
  roomId: "room-1",
  lastProcessedSeq: 123,
  world: {
    width: 1200,
    height: 800,
    score: 10,
    entities: [
      {
        id: "player-1",
        kind: "ship",
        x: 123.456,
        y: 654.321,
        angle: 1.2345,
        vx: 10.5,
        vy: -3.25,
        radius: 20,
        hp: 100,
        thrust: 1,
        type: "player",
        ttl: 5,
      },
      {
        id: "player-2",
        kind: "ship",
        x: 300,
        y: 200,
        angle: 2.1,
        vx: -5,
        vy: 3,
        radius: 20,
        hp: 95,
        thrust: 0,
        type: "player",
        ttl: 5,
      },
      {
        id: "player-3",
        kind: "ship",
        x: 700,
        y: 400,
        angle: 3.5,
        vx: 2,
        vy: -4,
        radius: 20,
        hp: 80,
        thrust: 1,
        type: "player",
        ttl: 5,
      },
      {
        id: "player-4",
        kind: "ship",
        x: 900,
        y: 600,
        angle: 5.2,
        vx: -1,
        vy: -2,
        radius: 20,
        hp: 90,
        thrust: 0,
        type: "player",
        ttl: 5,
      },
    ],
  },
};

const jsonInput = JSON.stringify(input);
const jsonSnapshot = JSON.stringify(snapshot);

const binaryInput = encodeInput(input);
const binarySnapshot = encodeSnapshot(snapshot);

const jsonInputBytes = Buffer.byteLength(jsonInput, "utf8");
const jsonSnapshotBytes = Buffer.byteLength(jsonSnapshot, "utf8");

const binaryInputBytes = binaryInput.byteLength;
const binarySnapshotBytes = binarySnapshot.byteLength;

const hz = 30;

function kbPerSecond(bytes) {
  return (bytes * hz / 1024).toFixed(2);
}

function benchmark(fn, iterations = 100000) {
  for (let i = 0; i < 5000; i++) {
    fn();
  }

  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = process.hrtime.bigint();

  return Number(end - start) / iterations / 1000;
}

const jsonMicros = benchmark(() => {
  const encoded = JSON.stringify(snapshot);
  JSON.parse(encoded);
});

const binaryMicros = benchmark(() => {
  const encoded = encodeSnapshot(snapshot);
  // decodeSnapshot is imported dynamically below
});

const { decodeSnapshot } =
  await import("./shared/protocol/binary.js");

const binaryEncodeDecodeMicros = benchmark(() => {
  const encoded = encodeSnapshot(snapshot);
  decodeSnapshot(encoded);
});

console.log("");
console.log("=== M4 measurements ===");
console.log("");
console.log("30 Hz, 4-player-style snapshot fixture");
console.log("");
console.log("              JSON        Binary");
console.log(
  `Snapshot B:   ${jsonSnapshotBytes}        ${binarySnapshotBytes}`
);
console.log(
  `Down KB/s:    ${kbPerSecond(jsonSnapshotBytes)}      ${kbPerSecond(binarySnapshotBytes)}`
);
console.log(
  `Up KB/s:      ${kbPerSecond(jsonInputBytes)}      ${kbPerSecond(binaryInputBytes)}`
);
console.log(
  `Encode+decode: ${jsonMicros.toFixed(2)} µs   ${binaryEncodeDecodeMicros.toFixed(2)} µs`
);
console.log("");
