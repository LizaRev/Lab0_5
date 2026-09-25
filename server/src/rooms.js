import { EventEmitter } from "node:events";
import { setupRoomLogging } from "./logger.js";
import { Match } from "./match.js";

export const MAX_PLAYERS_PER_ROOM = 16;
export const MAX_ROOMS = 50;

export class Room extends EventEmitter {
  constructor(id, name = id) {
    super();

    this.id = id;
    this.name = name;

    this.players = new Map();

    // M1: окремий server-side simulation match для кімнати
    this.match = new Match(id);

    setupRoomLogging(this);
  }

  addPlayer(player) {
    if (this.players.size >= MAX_PLAYERS_PER_ROOM) {
      throw new Error("Room is full");
    }

    this.players.set(player.id, player);

    // M1: реєструємо клієнта в Match
    this.match.addClient(player.id, player);

    // Запускаємо simulation, коли з'явився перший гравець
    if (this.players.size === 1) {
      this.match.start();
    }

    this.emit("log-event", {
      type: "join",
      playerId: player.id,
      name: player.name,
    });

    this.emit("join", {
      roomId: this.id,
      player,
    });
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);

    if (!player) {
      return null;
    }

    this.players.delete(playerId);

    // M1: видаляємо клієнта з Match
    this.match.removeClient(playerId);

    this.emit("log-event", {
      type: "leave",
      playerId: player.id,
      name: player.name,
    });

    this.emit("leave", {
      roomId: this.id,
      player,
    });

    if (this.players.size === 0) {
      // Зупиняємо server tick, коли кімната порожня
      this.match.stop();

      this.emit("empty", {
        roomId: this.id,
      });
    }

    return player;
  }

  broadcast(message, exceptId = null, isCritical = true) {
    for (const player of this.players.values()) {
      if (player.id === exceptId) {
        continue;
      }

      player.send(message, isCritical);
    }
  }

  roster() {
    return [...this.players.values()].map(
      ({ id, name }) => ({
        id,
        name,
      })
    );
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  create(id, name = id) {
    if (this.rooms.size >= MAX_ROOMS) {
      throw new Error("Server room limit reached");
    }

    if (this.rooms.has(id)) {
      throw new Error(
        `Room already exists: ${id}`
      );
    }

    const room = new Room(id, name);

    room.on(
      "empty",
      ({ roomId }) => {
        // Не видаляємо дефолтні кімнати
        if (
          roomId !== "alpha" &&
          roomId !== "beta"
        ) {
          this.rooms.delete(roomId);
        }
      }
    );

    this.rooms.set(id, room);

    return room;
  }

  get(id) {
    return this.rooms.get(id);
  }

  list() {
    return [...this.rooms.values()].map(
      (room) => ({
        id: room.id,
        name: room.name,
        players: room.players.size,
      })
    );
  }

  getOrCreate(id, name = id) {
    return (
      this.get(id) ||
      this.create(id, name)
    );
  }
}