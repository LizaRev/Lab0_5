import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

import {
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  validateMessage,
} from "./protocol.js";

import {
  encodeBinaryMessage,
  decodeBinaryMessage,
} from "../../shared/protocol/binary.js";

const JOIN_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 15_000;
const MAX_MISSED_PONGS = 2;

const MAX_BUFFERED_AMOUNT = 64 * 1024;

const USE_BINARY_PROTOCOL =
  process.env.BINARY_PROTOCOL === "true";

const TOKEN_BUCKET_CAPACITY = 120;
const TOKEN_REFILL_RATE = 60;

export function attachWebSocketServer(
  server,
  roomManager
) {
  const wss =
    new WebSocketServer({
      noServer: true,
      maxPayload: 64 * 1024,
    });

  server.on(
    "upgrade",
    (request, socket, head) => {
      const url =
        new URL(
          request.url || "/",
          `http://${request.headers.host || "localhost"}`
        );

      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wss.emit(
            "connection",
            ws,
            request
          );
        }
      );
    }
  );

  wss.on(
    "connection",
    (socket) => {

      const player = {
        id: randomUUID(),
        name: "Guest",
        room: null,
      };

      socket.player = player;
      socket.room = null;

      let joined = false;
      let missedPongs = 0;

      let tokens =
        TOKEN_BUCKET_CAPACITY;

      let lastRefill =
        Date.now();

      function checkRateLimit() {
        const now =
          Date.now();

        const elapsed =
          (now - lastRefill) / 1000;

        lastRefill = now;

        tokens =
          Math.min(
            TOKEN_BUCKET_CAPACITY,
            tokens +
              elapsed *
              TOKEN_REFILL_RATE
          );

        if (tokens < 1) {
          return false;
        }

        tokens -= 1;

        return true;
      }

      const send = (
        message,
        isCritical = true
      ) => {

        if (
          socket.readyState !==
          WebSocket.OPEN
        ) {
          return false;
        }

        if (
          socket.bufferedAmount >
          MAX_BUFFERED_AMOUNT
        ) {

          if (!isCritical) {
            return false;
          }

          console.warn(
            `Terminating slow client ${player.id}: ` +
            `buffer overflow (${socket.bufferedAmount} bytes)`
          );

          socket.close(
            1008,
            "Slow client: buffer overflow"
          );

          return false;
        }

        const useBinary =
          USE_BINARY_PROTOCOL &&
          (message?.type === MESSAGE_TYPES.INPUT ||
            message?.type === MESSAGE_TYPES.SNAPSHOT);

        socket.send(
          useBinary
            ? encodeBinaryMessage(message)
            : JSON.stringify(message)
        );

        return true;
      };

      player.send = send;

      const sendError = (
        error
      ) => {

        send(
          {
            version:
              PROTOCOL_VERSION,

            type:
              MESSAGE_TYPES.ERROR,

            error,
          },
          true
        );
      };

      const joinTimeout =
        setTimeout(
          () => {

            if (!joined) {

              sendError(
                "Join required within 5 seconds"
              );

              socket.close(
                1008,
                "Join timeout"
              );
            }

          },
          JOIN_TIMEOUT_MS
        );

      const heartbeat =
        setInterval(
          () => {

            if (
              socket.readyState !==
              WebSocket.OPEN
            ) {
              return;
            }

            if (
              missedPongs >=
              MAX_MISSED_PONGS
            ) {

              console.log(
                `Terminating inactive socket ${player.id}`
              );

              socket.terminate();

              return;
            }

            missedPongs += 1;

            socket.ping();

          },
          HEARTBEAT_MS
        );

      socket.on(
        "pong",
        () => {
          missedPongs = 0;
        }
      );

      socket.on(
        "message",
        (raw, isBinary) => {

          if (
            !checkRateLimit()
          ) {

            console.warn(
              `Rate limit exceeded for player ${player.id}`
            );

            sendError(
              "Rate limit exceeded"
            );

            socket.close(
              1008,
              "Rate limit exceeded"
            );

            return;
          }

          let message;

          try {

            message = isBinary
              ? decodeBinaryMessage(raw)
              : JSON.parse(raw.toString());

          } catch {

            sendError(
              isBinary
                ? "Invalid binary message"
                : "Invalid JSON"
            );

            socket.close(
              1007,
              "Invalid JSON"
            );

            return;
          }

          const result =
            validateMessage(
              message
            );

          if (!result.ok) {

            console.warn(
              `Invalid WebSocket message ` +
              `from ${player.id}: ${result.error}`
            );

            sendError(
              result.error
            );

            socket.close(
              1008,
              "Invalid message"
            );

            return;
          }

          handleMessage(
            result.message
          );
        }
      );

      socket.on(
        "close",
        () => {

          clearTimeout(
            joinTimeout
          );

          clearInterval(
            heartbeat
          );

          if (socket.room) {

            const room =
              socket.room;

            room.removePlayer(
              player.id
            );

            room.broadcast(
              {
                version:
                  PROTOCOL_VERSION,

                type:
                  MESSAGE_TYPES.ROSTER,

                roomId:
                  room.id,

                players:
                  room.roster(),
              },
              null,
              true
            );

            socket.room = null;
            player.room = null;
          }
        }
      );

      socket.on(
        "error",
        (error) => {

          console.error(
            `WebSocket error for ${player.id}:`,
            error.message
          );

        }
      );

      function handleMessage(
        message
      ) {

        switch (message.type) {

          case MESSAGE_TYPES.PING:
            handlePing();
            break;

          case MESSAGE_TYPES.JOIN:
            joinRoom(message);
            break;

          case MESSAGE_TYPES.LEAVE:
            leaveRoom();
            break;

          case MESSAGE_TYPES.CHAT:
            chat(message);
            break;

          case MESSAGE_TYPES.INPUT:
            handleInput(message);
            break;

          default:
            sendError(
              "Unsupported message type"
            );
        }
      }

      function handlePing() {

        send(
          {
            version:
              PROTOCOL_VERSION,

            type:
              MESSAGE_TYPES.PONG,
          },
          true
        );
      }

      function joinRoom(
        message
      ) {

        const roomId =
          typeof message.roomId === "string"
            ? message.roomId.trim()
            : "";

        const name =
          typeof message.name === "string" &&
          message.name.trim()
            ? message.name
                .trim()
                .slice(0, 24)
            : "Guest";

        if (!roomId) {

          sendError(
            "roomId is required"
          );

          return;
        }

        const room =
          roomManager.get(
            roomId
          );

        if (!room) {

          sendError(
            "Room not found"
          );

          return;
        }

        if (socket.room) {
          leaveRoom();
        }

        player.name = name;
        player.room = room;
        socket.room = room;

        joined = true;

        clearTimeout(
          joinTimeout
        );

        try {

          room.addPlayer(
            player
          );

        } catch (error) {

          sendError(
            error.message
          );

          socket.close(
            1008,
            error.message
          );

          return;
        }

        room.emit(
          "chat",
          {
            roomId:
              room.id,

            player,

            text:
              `${player.name} joined the room`,
          }
        );

        broadcastRoster(
          room
        );
      }

      function handleInput(
        message
      ) {

        if (!socket.room) {

          sendError(
            "Join a room first"
          );

          return;
        }

        const room =
          socket.room;

        if (!room.match) {

          sendError(
            "Match is not available"
          );

          return;
        }

        room.match.setInput(
          player.id,
          message.seq,
          message.input
        );
      }

      function leaveRoom() {

        const room =
          socket.room;

        if (!room) {
          return;
        }

        room.removePlayer(
          player.id
        );

        socket.room = null;
        player.room = null;

        broadcastRoster(
          room
        );
      }

      function chat(
        message
      ) {

        const room =
          socket.room;

        if (!room) {

          sendError(
            "Join a room first"
          );

          return;
        }

        const text =
          typeof message.text === "string"
            ? message.text
                .trim()
                .slice(0, 500)
            : "";

        if (!text) {

          sendError(
            "Chat text is required"
          );

          return;
        }

        room.emit(
          "log-event",
          {
            type:
              "chat",

            playerId:
              player.id,

            name:
              player.name,

            text,
          }
        );

        room.emit(
          "chat",
          {
            roomId:
              room.id,

            player,

            text,
          }
        );

        room.broadcast(
          {
            version:
              PROTOCOL_VERSION,

            type:
              MESSAGE_TYPES.CHAT,

            roomId:
              room.id,

            playerId:
              player.id,

            name:
              player.name,

            text,
          },
          null,
          false
        );
      }

      function broadcastRoster(
        room
      ) {

        room.broadcast(
          {
            version:
              PROTOCOL_VERSION,

            type:
              MESSAGE_TYPES.ROSTER,

            roomId:
              room.id,

            players:
              room.roster(),
          },
          null,
          true
        );
      }
    }
  );

  return wss;
}