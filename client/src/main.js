import { createLoop } from './loop.js';
import { createInput } from './input.js';

import { World } from './sim/world.js';

import { createCanvas } from './render/canvas.js';
import { drawScene } from './render/draw.js';
import { drawLoadingScreen } from './render/loading.js';

import { loadJson, loadAll } from './assets/loader.js';

import { createAudio } from './audio.js';
import { initHud } from './hud.js';

import { Lobby } from './lobby.js';
import { createLobbyUI } from './lobby-ui.js';

import { ClientNetwork } from './net/client-network.js';


async function startGame() {

  const lobby =
    new Lobby();


  const joined =
    new Promise((resolve) => {

      lobby.addEventListener(
        "joined",
        (event) => {

          resolve(
            event.detail
          );

        },
        { once: true }
      );

    });


  createLobbyUI(
    lobby
  );


  const joinedData =
    await joined;


  const playerName =
    joinedData.playerName || "";

  const room =
    joinedData.room || null;

  const initialPlayers =
    joinedData.players || [];


  console.log(
    "Player:",
    playerName
  );

  console.log(
    "Joined room:",
    room?.id
  );

  console.log(
    "Arena:",
    room?.arena
  );

  console.log(
    "Players:",
    initialPlayers
  );


  /*
   * Network
   */

  const network =
    new ClientNetwork(
      lobby.connection
    );


  /*
   * Lobby and ClientNetwork
   * use the same WebSocket.
   */

  const originalOnMessage =
    lobby.connection.onmessage;


  lobby.connection.onmessage =
    (message) => {

      originalOnMessage?.(
        message
      );

      network.handleMessage(
        message
      );

    };


  /*
   * Network graph
   */

  network.netgraph.attach();


  /*
   * M1:
   * latency = 100 ms
   * jitter = 0
   * packet loss = 0
   */

  network.setLatency(100);
  network.setJitter(0);
  network.setPacketLoss(0);


  /*
   * Latest authoritative
   * server snapshot.
   */

  let latestSnapshot =
    null;


  network.onSnapshot(
    (snapshot) => {

      latestSnapshot =
        snapshot;

      /*
       * Для перевірки можна бачити,
       * що snapshot-и приходять.
       */

      console.log(
        "Snapshot:",
        snapshot
      );

    }
  );


  /*
   * Canvas
   */

  const canvas =
    createCanvas();


  drawLoadingScreen(
    canvas.ctx,
    canvas.width,
    canvas.height,
    0
  );


  /*
   * Audio
   */

  const audio =
    createAudio();


  window.addEventListener(
    "click",
    () => {

      audio.unlock();

    },
    { once: true }
  );


  /*
   * Assets
   */

  const manifestUrl =
    new URL(
      "./assets/manifest.json",
      import.meta.url
    ).href;


  console.log(
    "Manifest URL:",
    manifestUrl
  );


  const manifest =
    await loadJson(
      manifestUrl
    );


  const assets =
    await loadAll(
      manifest,
      {
        audioContext:
          audio.ctx,

        baseUrl:
          manifestUrl,

        onProgress(progress) {

          console.log(
            "Loading:",
            Math.round(
              progress * 100
            ) + "%"
          );


          drawLoadingScreen(
            canvas.ctx,
            canvas.width,
            canvas.height,
            progress
          );

        }

      }
    );


  console.log(
    "Assets loaded:",
    assets
  );


  audio.setBuffers(
    assets
  );


  /*
   * Input
   */

  const input =
    createInput(
      window
    );


  /*
   * Local World exists only
   * because HUD/audio expect it.
   *
   * IMPORTANT:
   * world.step() is NEVER called
   * on the client.
   */

  const world =
    new World();


  audio.attach(
    world
  );


  const hud =
    initHud(
      world,
      lobby,
      initialPlayers
    );


  /*
   * Convert server snapshot
   * into the format expected
   * by drawScene().
   */

  function createRenderWorld(
    snapshot
  ) {

    const renderWorld = {

      width:
        snapshot?.world?.width ??
        canvas.width,

      height:
        snapshot?.world?.height ??
        canvas.height,

      score:
        snapshot?.world?.score ??
        0,

      entities: []

    };


    const entities =
      snapshot?.world?.entities ||
      [];


    for (
      const entity of entities
    ) {

      renderWorld.entities.push({

        id:
          entity.id,

        kind:
          entity.kind,

        pos: {

          x:
            entity.x,

          y:
            entity.y

        },

        vel: {

          x:
            entity.vx ?? 0,

          y:
            entity.vy ?? 0

        },

        angle:
          entity.angle ?? 0,

        radius:
          entity.radius ?? 0,

        hp:
          entity.hp,

        thrust:
          entity.thrust ?? 0,

        type:
          entity.type,

        ttl:
          entity.ttl,

        alive:
          true

      });

    }


    renderWorld[
      Symbol.iterator
    ] = function* () {

      yield* this.entities;

    };


    return renderWorld;
  }


  /*
   * Find the ship from
   * the latest server snapshot.
   */

  function getSnapshotShip(
    snapshot
  ) {

    const entities =
      snapshot?.world?.entities ||
      [];


    return (
      entities.find(
        (entity) =>
          entity.kind === "ship"
      ) || null
    );

  }


  /*
   * Create a render-only ship.
   *
   * It is NOT simulated locally.
   */

  function createRenderShip(
    snapshotShip
  ) {

    if (!snapshotShip) {
      return null;
    }


    return {

      x:
        snapshotShip.x,

      y:
        snapshotShip.y,

      angle:
        snapshotShip.angle ?? 0,

      thrust:
        snapshotShip.thrust ?? 0,

      hp:
        snapshotShip.hp ?? 0,

      shield:
        false,

      alive:
        true

    };

  }


  let renderWorld =
    createRenderWorld(
      null
    );


  let renderShip =
    null;


  /*
   * Apply authoritative
   * server snapshot.
   */

  function applySnapshot(
    snapshot
  ) {

    renderWorld =
      createRenderWorld(
        snapshot
      );


    const snapshotShip =
      getSnapshotShip(
        snapshot
      );


    renderShip =
      createRenderShip(
        snapshotShip
      );


    world.score =
      snapshot?.world?.score ?? 0;

  }


  /*
   * Loop statistics.
   */

  let loopStats = {

    stepsPerSecond: 0,

    framesPerSecond: 0,

    lastFrameDuration: 0

  };


  /*
   * Render only.
   *
   * There is NO local physics.
   */

  function render() {

    if (latestSnapshot) {

      applySnapshot(
        latestSnapshot
      );

    }


    const stats =
      loop.getStats();


    loopStats = {

      stepsPerSecond:
        stats.stepsPerSecond,

      framesPerSecond:
        stats.framesPerSecond,

      lastFrameDuration:
        stats.lastFrameDuration

    };


    hud.update(
      renderShip,
      loopStats
    );


    drawScene(
      canvas.ctx,
      canvas.width,
      canvas.height,
      renderShip,
      renderWorld,
      assets
    );

  }


  /*
   * Send input to server.
   *
   * The client does NOT move
   * the ship itself.
   */

  let inputAccumulator =
    0;


  const loop =
    createLoop({

      step:
        1 / 60,


      simulate(dt) {

        inputAccumulator += dt;


        /*
         * Server simulation is 30 Hz.
         * Send input approximately
         * 30 times per second.
         */

        if (
          inputAccumulator >=
          1 / 30
        ) {

          inputAccumulator -=
            1 / 30;


          network.sendInput({

            left:
              input.isDown(
                "ArrowLeft"
              ),

            right:
              input.isDown(
                "ArrowRight"
              ),

            thrust:
              input.isDown(
                "ArrowUp"
              ),

            fire:
              input.isDown(
                "Space"
              )

          });

        }


        /*
         * IMPORTANT:
         *
         * No world.step().
         * No ship.fire().
         * No local movement.
         *
         * Server is authoritative.
         */

        input.endFrame();

      },


      render

    });


  /*
   * Start client loop.
   */

  loop.start();

}


startGame().catch(
  (error) => {

    console.error(
      "Помилка запуску гри:",
      error
    );

  }
);

