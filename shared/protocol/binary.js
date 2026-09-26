const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export const BINARY_CODEC_VERSION = 1;

export const BINARY_MESSAGE = Object.freeze({
  INPUT: 1,
  SNAPSHOT: 2,
});

const TWO_PI = Math.PI * 2;

function quantizeAngle(angle) {
  const normalized =
    ((Number(angle) % TWO_PI) + TWO_PI) % TWO_PI;

  return Math.round(
    (normalized / TWO_PI) * 65535
  );
}

function dequantizeAngle(value) {
  return (
    (value / 65535) * TWO_PI
  );
}

class Writer {
  constructor(size = 1024) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  ensure(bytes) {
    if (this.offset + bytes <= this.buffer.byteLength) {
      return;
    }

    let size = this.buffer.byteLength;

    while (size < this.offset + bytes) {
      size *= 2;
    }

    const next = new ArrayBuffer(size);

    new Uint8Array(next).set(
      new Uint8Array(this.buffer)
    );

    this.buffer = next;
    this.view = new DataView(next);
  }

  u8(value) {
    this.ensure(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  u16(value) {
    this.ensure(2);
    this.view.setUint16(
      this.offset,
      value,
      true
    );
    this.offset += 2;
  }

  i32(value) {
    this.ensure(4);
    this.view.setInt32(
      this.offset,
      value,
      true
    );
    this.offset += 4;
  }

  u32(value) {
    this.ensure(4);
    this.view.setUint32(
      this.offset,
      value,
      true
    );
    this.offset += 4;
  }

  f32(value) {
    this.ensure(4);
    this.view.setFloat32(
      this.offset,
      Number(value) || 0,
      true
    );
    this.offset += 4;
  }

  string(value) {
    const bytes =
      TEXT_ENCODER.encode(
        String(value ?? "")
      );

    if (bytes.length > 65535) {
      throw new Error(
        "Binary string is too long"
      );
    }

    this.u16(bytes.length);

    this.ensure(bytes.length);

    new Uint8Array(
      this.buffer,
      this.offset,
      bytes.length
    ).set(bytes);

    this.offset += bytes.length;
  }

  finish() {
    return this.buffer.slice(
      0,
      this.offset
    );
  }
}

class Reader {
  constructor(buffer) {
    if (
      buffer instanceof Uint8Array
    ) {
      buffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset +
          buffer.byteLength
      );
    }

    if (
      !(buffer instanceof ArrayBuffer)
    ) {
      throw new TypeError(
        "Binary message must be an ArrayBuffer"
      );
    }

    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  ensure(bytes) {
    if (
      this.offset + bytes >
      this.view.byteLength
    ) {
      throw new Error(
        "Unexpected end of binary message"
      );
    }
  }

  u8() {
    this.ensure(1);

    const value =
      this.view.getUint8(
        this.offset
      );

    this.offset += 1;

    return value;
  }

  u16() {
    this.ensure(2);

    const value =
      this.view.getUint16(
        this.offset,
        true
      );

    this.offset += 2;

    return value;
  }

  i32() {
    this.ensure(4);

    const value =
      this.view.getInt32(
        this.offset,
        true
      );

    this.offset += 4;

    return value;
  }

  u32() {
    this.ensure(4);

    const value =
      this.view.getUint32(
        this.offset,
        true
      );

    this.offset += 4;

    return value;
  }

  f32() {
    this.ensure(4);

    const value =
      this.view.getFloat32(
        this.offset,
        true
      );

    this.offset += 4;

    return value;
  }

  string() {
    const length =
      this.u16();

    this.ensure(length);

    const bytes =
      new Uint8Array(
        this.buffer,
        this.offset,
        length
      );

    const value =
      TEXT_DECODER.decode(bytes);

    this.offset += length;

    return value;
  }

  done() {
    return (
      this.offset ===
      this.view.byteLength
    );
  }
}

/*
 * INPUT
 *
 * Layout:
 *
 * u8   codec version
 * u8   message type
 * u32  sequence
 * u8   input flags
 *
 * flags:
 * bit 0 = left
 * bit 1 = right
 * bit 2 = thrust
 * bit 3 = fire
 */

export function encodeInput(message) {
  const writer =
    new Writer(16);

  writer.u8(
    BINARY_CODEC_VERSION
  );

  writer.u8(
    BINARY_MESSAGE.INPUT
  );

  writer.u32(
    message.seq >>> 0
  );

  let flags = 0;

  if (message.input?.left) {
    flags |= 1;
  }

  if (message.input?.right) {
    flags |= 2;
  }

  if (message.input?.thrust) {
    flags |= 4;
  }

  if (message.input?.fire) {
    flags |= 8;
  }

  writer.u8(flags);

  return writer.finish();
}

export function decodeInput(buffer) {
  const reader =
    new Reader(buffer);

  const version =
    reader.u8();

  if (
    version !==
    BINARY_CODEC_VERSION
  ) {
    throw new Error(
      `Unsupported binary codec version: ${version}`
    );
  }

  const type =
    reader.u8();

  if (
    type !== BINARY_MESSAGE.INPUT
  ) {
    throw new Error(
      "Not a binary input message"
    );
  }

  const seq =
    reader.u32();

  const flags =
    reader.u8();

  if (!reader.done()) {
    throw new Error(
      "Unexpected bytes after input message"
    );
  }

  return {
    version: 1,
    type: "input",
    seq,
    input: {
      left: Boolean(flags & 1),
      right: Boolean(flags & 2),
      thrust: Boolean(flags & 4),
      fire: Boolean(flags & 8),
    },
  };
}

/*
 * SNAPSHOT
 *
 * Layout:
 *
 * u8   codec version
 * u8   message type
 * string roomId
 * string playerShipId
 * i32  lastProcessedSeq
 * f32  world width
 * f32  world height
 * f32  score
 * u16  entity count
 *
 * Every entity:
 *
 * string id
 * string kind
 * f32 x
 * f32 y
 * u16 quantized angle
 * f32 vx
 * f32 vy
 * f32 radius
 * u8  optional flags
 * f32 hp       if bit 0
 * f32 thrust   if bit 1
 * string type if bit 2
 * f32 ttl      if bit 3
 */

export function encodeSnapshot(message) {
  const entities =
    message.world?.entities || [];

  if (
    entities.length >
    65535
  ) {
    throw new Error(
      "Too many entities in snapshot"
    );
  }

  const writer =
    new Writer(
      256 +
      entities.length * 64
    );

  writer.u8(
    BINARY_CODEC_VERSION
  );

  writer.u8(
    BINARY_MESSAGE.SNAPSHOT
  );

  writer.string(
    message.roomId
  );

  writer.string(
    message.playerShipId ?? ""
  );

  writer.i32(
    message.lastProcessedSeq ?? -1
  );

  writer.f32(
    message.world?.width ?? 0
  );

  writer.f32(
    message.world?.height ?? 0
  );

  writer.f32(
    message.world?.score ?? 0
  );

  writer.u16(
    entities.length
  );

  for (const entity of entities) {
    writer.string(entity.id);
    writer.string(entity.kind);

    writer.f32(entity.x);
    writer.f32(entity.y);

    writer.u16(
      quantizeAngle(
        entity.angle ?? 0
      )
    );

    writer.f32(entity.vx);
    writer.f32(entity.vy);
    writer.f32(entity.radius);

    let flags = 0;

    if (
      entity.hp !== undefined
    ) {
      flags |= 1;
    }

    if (
      entity.thrust !== undefined
    ) {
      flags |= 2;
    }

    if (
      entity.type !== undefined
    ) {
      flags |= 4;
    }

    if (
      entity.ttl !== undefined
    ) {
      flags |= 8;
    }

    writer.u8(flags);

    if (flags & 1) {
      writer.f32(entity.hp);
    }

    if (flags & 2) {
      writer.f32(entity.thrust);
    }

    if (flags & 4) {
      writer.string(entity.type);
    }

    if (flags & 8) {
      writer.f32(entity.ttl);
    }
  }

  return writer.finish();
}

export function decodeSnapshot(buffer) {
  const reader =
    new Reader(buffer);

  const version =
    reader.u8();

  if (
    version !==
    BINARY_CODEC_VERSION
  ) {
    throw new Error(
      `Unsupported binary codec version: ${version}`
    );
  }

  const type =
    reader.u8();

  if (
    type !== BINARY_MESSAGE.SNAPSHOT
  ) {
    throw new Error(
      "Not a binary snapshot message"
    );
  }

  const roomId =
    reader.string();

  const playerShipId =
    reader.string();

  const lastProcessedSeq =
    reader.i32();

  const width =
    reader.f32();

  const height =
    reader.f32();

  const score =
    reader.f32();

  const entityCount =
    reader.u16();

  const entities = [];

  for (
    let i = 0;
    i < entityCount;
    i++
  ) {
    const id =
      reader.string();

    const kind =
      reader.string();

    const x =
      reader.f32();

    const y =
      reader.f32();

    const angle =
      dequantizeAngle(
        reader.u16()
      );

    const vx =
      reader.f32();

    const vy =
      reader.f32();

    const radius =
      reader.f32();

    const flags =
      reader.u8();

    const entity = {
      id,
      kind,
      x,
      y,
      angle,
      vx,
      vy,
      radius,
    };

    if (flags & 1) {
      entity.hp =
        reader.f32();
    }

    if (flags & 2) {
      entity.thrust =
        reader.f32();
    }

    if (flags & 4) {
      entity.type =
        reader.string();
    }

    if (flags & 8) {
      entity.ttl =
        reader.f32();
    }

    entities.push(entity);
  }

  if (!reader.done()) {
    throw new Error(
      "Unexpected bytes after snapshot message"
    );
  }

  return {
    version: 1,
    type: "snapshot",
    roomId,
    playerShipId:
      playerShipId || null,
    lastProcessedSeq,
    world: {
      width,
      height,
      score,
      entities,
    },
  };
}

export function encodeBinaryMessage(message) {
  switch (message?.type) {
    case "input":
      return encodeInput(message);

    case "snapshot":
      return encodeSnapshot(message);

    default:
      throw new Error(
        `Unsupported binary message type: ${message?.type}`
      );
  }
}

export function decodeBinaryMessage(buffer) {
  const reader =
    new Reader(buffer);

  const version =
    reader.u8();

  const type =
    reader.u8();

  if (
    version !==
    BINARY_CODEC_VERSION
  ) {
    throw new Error(
      `Unsupported binary codec version: ${version}`
    );
  }

  if (
    type === BINARY_MESSAGE.INPUT
  ) {
    return decodeInput(buffer);
  }

  if (
    type === BINARY_MESSAGE.SNAPSHOT
  ) {
    return decodeSnapshot(buffer);
  }

  throw new Error(
    `Unknown binary message type: ${type}`
  );
}