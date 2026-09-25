export const PROTOCOL_VERSION = 1;

export const MESSAGE_TYPES = Object.freeze({
  JOIN: "join",
  LEAVE: "leave",
  CHAT: "chat",
  PING: "ping",
  PONG: "pong",
  ERROR: "error",
  ROSTER: "roster",

  INPUT: "input",
  SNAPSHOT: "snapshot",
});

const MAX_ROOM_ID_LENGTH = 32;
const MAX_NAME_LENGTH = 24;
const MAX_CHAT_LENGTH = 500;

export function validateMessage(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      ok: false,
      error: "Message must be an object",
    };
  }

  if (value.version !== PROTOCOL_VERSION) {
    return {
      ok: false,
      error: "Unsupported protocol version",
    };
  }

  if (
    typeof value.type !== "string" ||
    !Object.values(MESSAGE_TYPES).includes(value.type)
  ) {
    return {
      ok: false,
      error: "Unknown message type",
    };
  }

  switch (value.type) {
    case MESSAGE_TYPES.JOIN:
      if (
        typeof value.roomId !== "string" ||
        !value.roomId.trim() ||
        value.roomId.length > MAX_ROOM_ID_LENGTH
      ) {
        return {
          ok: false,
          error: "Invalid roomId",
        };
      }

      if (
        typeof value.name !== "string" ||
        !value.name.trim() ||
        value.name.length > MAX_NAME_LENGTH
      ) {
        return {
          ok: false,
          error: "Invalid player name",
        };
      }

      break;

    case MESSAGE_TYPES.CHAT:
      if (
        typeof value.text !== "string" ||
        !value.text.trim() ||
        value.text.length > MAX_CHAT_LENGTH
      ) {
        return {
          ok: false,
          error: "Invalid chat text",
        };
      }

      break;

    case MESSAGE_TYPES.INPUT:
      if (
        !Number.isInteger(value.seq) ||
        value.seq < 0
      ) {
        return {
          ok: false,
          error: "Invalid input sequence",
        };
      }

      if (
        !value.input ||
        typeof value.input !== "object" ||
        Array.isArray(value.input)
      ) {
        return {
          ok: false,
          error: "Invalid input",
        };
      }

      break;

    case MESSAGE_TYPES.SNAPSHOT:
      if (
        !Number.isInteger(value.lastProcessedSeq) ||
        value.lastProcessedSeq < -1
      ) {
        return {
          ok: false,
          error: "Invalid lastProcessedSeq",
        };
      }

      break;

    case MESSAGE_TYPES.LEAVE:
    case MESSAGE_TYPES.PING:
    case MESSAGE_TYPES.PONG:
    case MESSAGE_TYPES.ERROR:
    case MESSAGE_TYPES.ROSTER:
      break;

    default:
      break;
  }

  return {
    ok: true,
    message: value,
  };
}