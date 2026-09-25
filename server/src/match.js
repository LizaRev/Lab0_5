import { World } from "../../shared/sim/world.js";
import { Ship } from "../../shared/sim/ship.js";
import { Asteroid } from "../../shared/sim/asteroid.js";
import { Pickup } from "../../shared/sim/pickup.js";
import { attachHoming } from "../../shared/sim/homing.js";

import {
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
} from "../../shared/protocol/messages.js";


export class Match {

  constructor(roomId) {

    this.roomId = roomId;

    this.world = new World();

    this.clients = new Map();

    this.inputs = new Map();

    this.ships = new Map();

    this.tickRate = 30;
    this.tickMs = 1000 / this.tickRate;

    this.timer = null;
    this.nextTickTime = null;
    this.running = false;

    this.seedWorld();
  }


  seedWorld() {

    const ship = new Ship(
      400,
      250
    );

    this.world.spawn(ship);


    this.asteroid1 = new Asteroid(
      200,
      200,
      100,
      80,
      30
    );

    this.world.spawn(
      this.asteroid1
    );


    attachHoming(
      this.asteroid1,
      ship
    );


    const asteroid2 = new Asteroid(
      600,
      350,
      -80,
      -60,
      30
    );

    this.world.spawn(
      asteroid2
    );


    const pickup = new Pickup(
      600,
      300,
      "shield"
    );

    this.world.spawn(
      pickup
    );
  }


  addClient(
    playerId,
    player = null
  ) {

    const client =
      player ?? playerId;

    const id =
      player
        ? playerId
        : client.id;


    this.clients.set(
      id,
      client
    );


    let ship =
      this.ships.get(id);


    if (!ship) {

      ship =
        this.findFreeShip();


      if (!ship) {

        ship = new Ship(
          400,
          250
        );

        this.world.spawn(ship);
      }


      this.ships.set(
        id,
        ship
      );
    }


    this.inputs.set(
      id,
      {
        seq: -1,

        input: {
          left: false,
          right: false,
          thrust: false,
          fire: false,
        },

        previousFire: false,
      }
    );
  }


  findFreeShip() {

    for (
      const ship of
      this.world.ofKind("ship")
    ) {

      if (
        !this.ships.has(
          ship.id
        )
      ) {

        return ship;
      }
    }

    return null;
  }


  removeClient(playerId) {

    this.clients.delete(
      playerId
    );

    this.inputs.delete(
      playerId
    );


    const ship =
      this.ships.get(
        playerId
      );


    if (ship) {

      ship.alive = false;

      this.ships.delete(
        playerId
      );
    }
  }


  setInput(
    playerId,
    seq,
    input
  ) {

    if (
      !this.clients.has(
        playerId
      )
    ) {

      return;
    }


    if (
      !Number.isInteger(seq) ||
      seq < 0
    ) {

      return;
    }


    const current =
      this.inputs.get(
        playerId
      );


    if (!current) {
      return;
    }


    if (
      seq <= current.seq
    ) {

      return;
    }


    current.seq = seq;

    current.input =
      this.normalizeInput(
        input
      );
  }


  normalizeInput(input) {

    return {

      left:
        Boolean(
          input?.left
        ),

      right:
        Boolean(
          input?.right
        ),

      thrust:
        Boolean(
          input?.thrust
        ),

      fire:
        Boolean(
          input?.fire
        ),
    };
  }


  start() {

    if (this.running) {
      return;
    }


    this.running = true;


    this.nextTickTime =
      performance.now() +
      this.tickMs;


    this.scheduleNextTick();
  }


  scheduleNextTick() {

    if (!this.running) {
      return;
    }


    const now =
      performance.now();


    const delay =
      Math.max(
        0,
        this.nextTickTime - now
      );


    this.timer =
      setTimeout(
        () => {

          this.tick();

          this.nextTickTime +=
            this.tickMs;

          this.scheduleNextTick();

        },
        delay
      );
  }


  stop() {

    this.running = false;


    if (this.timer) {

      clearTimeout(
        this.timer
      );

      this.timer = null;
    }


    this.nextTickTime = null;
  }


  tick() {

    const dt =
      this.tickMs / 1000;


    /*
     * Build input objects for every player.
     *
     * IMPORTANT:
     * We do NOT call world.step() here.
     */

    const playerInputs = new Map();


    for (
      const [playerId, state]
      of this.inputs
    ) {

      if (
        !this.clients.has(
          playerId
        )
      ) {

        continue;
      }


      let ship =
        this.ships.get(
          playerId
        );


      /*
       * If the player's ship died,
       * look for a free replacement ship.
       */

      if (
        !ship ||
        !ship.alive
      ) {

        ship =
          this.findFreeShip();


        if (ship) {

          this.ships.set(
            playerId,
            ship
          );
        }
      }


      if (
        !ship ||
        !ship.alive
      ) {

        continue;
      }


      const current =
        state.input;


      const input = {

        isDown: (action) => {

          if (
            action ===
            "ArrowLeft"
          ) {

            return current.left;
          }


          if (
            action ===
            "ArrowRight"
          ) {

            return current.right;
          }


          if (
            action ===
            "ArrowUp"
          ) {

            return current.thrust;
          }


          if (
            action ===
            "Space"
          ) {

            return current.fire;
          }


          return false;
        },
      };


      playerInputs.set(
        playerId,
        {
          ship,
          input,
          state,
        }
      );


      /*
       * Fire only on the transition
       * false -> true.
       */

      if (
        current.fire &&
        !state.previousFire
      ) {

        ship.fire();
      }


      state.previousFire =
        current.fire;
    }


    /*
     * IMPORTANT:
     *
     * The whole world is simulated
     * exactly ONCE per server tick.
     *
     * This prevents asteroids,
     * bullets and other entities
     * from becoming faster when
     * multiple players are connected.
     */

    const firstPlayer =
      playerInputs.values().next().value;


    const worldInput =
      firstPlayer?.input || {

        isDown: () => false,
      };


    this.world.step(
      dt,
      {
        width:
          this.world.width,

        height:
          this.world.height,

        input:
          worldInput,
      }
    );


    /*
     * Wrap every player's ship
     * after the world simulation.
     */

    for (
      const [playerId, data]
      of playerInputs
    ) {

      let ship =
        this.ships.get(
          playerId
        );


      /*
       * The ship could have died
       * during world.step().
       */

      if (
        !ship ||
        !ship.alive
      ) {

        const newShip =
          this.findFreeShip();


        if (newShip) {

          this.ships.set(
            playerId,
            newShip
          );
        }


        continue;
      }


      this.wrapShip(
        ship
      );
    }


    /*
     * Send the authoritative
     * server state to every client.
     */

    this.broadcastSnapshots();
  }


  wrapShip(ship) {

    if (
      !ship ||
      !ship.alive
    ) {

      return;
    }


    if (
      ship.pos.x < 0
    ) {

      ship.pos.x =
        this.world.width;
    }


    if (
      ship.pos.x >
      this.world.width
    ) {

      ship.pos.x = 0;
    }


    if (
      ship.pos.y < 0
    ) {

      ship.pos.y =
        this.world.height;
    }


    if (
      ship.pos.y >
      this.world.height
    ) {

      ship.pos.y = 0;
    }
  }


  createSnapshot(
    playerId
  ) {

    const inputState =
      this.inputs.get(
        playerId
      );


    return {

      version:
        PROTOCOL_VERSION,

      type:
        MESSAGE_TYPES.SNAPSHOT,

      roomId:
        this.roomId,

      playerId:
        playerId,

      lastProcessedSeq:
        inputState?.seq ?? -1,

      world:
        this.serializeWorld(),
    };
  }


  serializeWorld() {

    const entities = [];


    for (
      const entity of
      this.world
    ) {

      if (
        !entity.alive
      ) {

        continue;
      }


      entities.push({

        id:
          entity.id,

        kind:
          entity.kind,

        x:
          entity.pos?.x ?? 0,

        y:
          entity.pos?.y ?? 0,

        angle:
          entity.angle ?? 0,

        vx:
          entity.vel?.x ?? 0,

        vy:
          entity.vel?.y ?? 0,

        radius:
          entity.radius ?? 0,

        hp:
          entity.hp,

        thrust:
          entity.thrust,

        type:
          entity.type,

        ttl:
          entity.ttl,
      });
    }


    return {

      width:
        this.world.width,

      height:
        this.world.height,

      score:
        this.world.score,

      entities,
    };
  }


  broadcastSnapshots() {

    for (
      const [playerId, client]
      of this.clients
    ) {

      if (
        !client?.send
      ) {

        continue;
      }


      client.send(
        this.createSnapshot(
          playerId
        ),
        false
      );
    }
  }
}