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


  /*
   * M2:
   * Identify the local player.
   */

  const localPlayer =
    initialPlayers.find(
      (player) =>
        player.name === playerName
    );

  const localPlayerId =
    localPlayer?.id || null;


  console.log(
    "Player:",
    playerName
  );

  console.log(
    "Local player:",
    localPlayerId
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
   * M2 check:
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
   * We do NOT use world.step()
   * for client prediction.
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
   * Render ship.
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
   * =====================================================
   * M2 — Prediction state
   * =====================================================
   */

  const pendingInputs = [];


  /*
   * Local predicted state.
   *
   * This is deliberately kept separate from
   * the authoritative snapshot.
   */

  let predictedShip = null;


  /*
   * M2 — Smooth correction
   *
   * Correction is applied gradually
   * over approximately 100 ms.
   */

  let correctionX = 0;
  let correctionY = 0;

  const correctionDuration = 0.1;
  let correctionTimeRemaining = 0;


  /*
   * Create a local prediction ship from
   * an authoritative snapshot.
   */

  function createPredictedShip(
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

      vx:
        snapshotShip.vx ?? 0,

      vy:
        snapshotShip.vy ?? 0,

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


  /*
   * Apply one shared Ship.update()-style
   * simulation step to the local predicted ship.
   *
   * This mirrors shared/sim/ship.js.
   */

  function integratePredictedShip(
    ship,
    dt,
    inputState
  ) {

    if (!ship) {
      return;
    }


    const rotationSpeed = 3;
    const thrustPower = 200;
    const drag = 0.99;
    const maxSpeed = 400;


    if (inputState.left) {

      ship.angle -=
        rotationSpeed * dt;

    }


    if (inputState.right) {

      ship.angle +=
        rotationSpeed * dt;

    }


    ship.thrust =
      inputState.thrust ? 1 : 0;


    if (ship.thrust) {

      const angle =
        ship.angle - Math.PI / 2;

      const directionX =
        Math.cos(angle);

      const directionY =
        Math.sin(angle);


      ship.vx +=
        directionX *
        thrustPower *
        dt;

      ship.vy +=
        directionY *
        thrustPower *
        dt;

    }


    const dragFactor =
      Math.pow(
        drag,
        dt * 60
      );


    ship.vx *=
      dragFactor;

    ship.vy *=
      dragFactor;


    const speed =
      Math.hypot(
        ship.vx,
        ship.vy
      );


    if (
      speed > maxSpeed
    ) {

      ship.vx =
        (ship.vx / speed) *
        maxSpeed;

      ship.vy =
        (ship.vy / speed) *
        maxSpeed;

    }


    ship.x +=
      ship.vx * dt;

    ship.y +=
      ship.vy * dt;

  }


  /*
   * Re-apply all inputs that the server
   * has not confirmed yet.
   */

  function reconcile(
    snapshot
  ) {

    const snapshotShip =
      getSnapshotShip(
        snapshot
      );


    if (!snapshotShip) {
      return;
    }


    const lastProcessedSeq =
      snapshot.lastProcessedSeq ?? -1;


    /*
     * Remove inputs already processed
     * by the authoritative server.
     */

    while (
      pendingInputs.length > 0 &&
      pendingInputs[0].seq <=
        lastProcessedSeq
    ) {

      pendingInputs.shift();

    }


    /*
     * Start from the authoritative
     * server state.
     */

    const authoritativeShip =
      createPredictedShip(
        snapshotShip
      );


    /*
     * Re-apply inputs that were sent
     * after the server's lastProcessedSeq.
     */

    for (
      const pending of pendingInputs
    ) {

      integratePredictedShip(
        authoritativeShip,
        1 / 30,
        pending.input
      );

    }


    /*
     * Calculate correction between
     * current prediction and the
     * newly reconstructed prediction.
     */

    if (predictedShip) {

      const targetCorrectionX =
        predictedShip.x -
        authoritativeShip.x;

      const targetCorrectionY =
        predictedShip.y -
        authoritativeShip.y;


      correctionX =
        targetCorrectionX;

      correctionY =
        targetCorrectionY;

      correctionTimeRemaining =
        correctionDuration;

    }


    /*
     * Replace prediction with the
     * server-authoritative state plus
     * unconfirmed inputs.
     */

    predictedShip =
      authoritativeShip;


    /*
     * Correction magnitude.
     */

    const correctionMagnitude =
      Math.hypot(
        correctionX,
        correctionY
      );


    console.log(
      "M2 correction:",
      correctionMagnitude
    );

  }


  /*
   * Apply authoritative snapshot.
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


    /*
     * M2:
     * Reconcile the predicted ship
     * against the authoritative snapshot.
     */

    reconcile(
      snapshot
    );


    /*
     * Render predicted local ship
     * instead of waiting for the next
     * server snapshot.
     */

    if (predictedShip) {

      renderShip = {

        x:
          predictedShip.x +
          correctionX,

        y:
          predictedShip.y +
          correctionY,

        angle:
          predictedShip.angle,

        thrust:
          predictedShip.thrust,

        hp:
          predictedShip.hp,

        shield:
          false,

        alive:
          true

      };

    } else {

      renderShip =
        createRenderShip(
          snapshotShip
        );

    }


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
   * Render.
   */

  function render() {

    if (latestSnapshot) {

      applySnapshot(
        latestSnapshot
      );

    }


    /*
     * Between snapshots, smoothly reduce
     * the correction over approximately
     * 100 ms.
     */

    if (
      correctionTimeRemaining > 0
    ) {

      const correctionStep =
        Math.min(
          1 / 60,
          correctionTimeRemaining
        );


      const factor =
        correctionStep /
        correctionTimeRemaining;


      correctionX *=
        1 - factor;

      correctionY *=
        1 - factor;


      correctionTimeRemaining -=
        correctionStep;


      if (
        correctionTimeRemaining <= 0
      ) {

        correctionTimeRemaining = 0;

        correctionX = 0;
        correctionY = 0;

      }

    }


    /*
     * Between snapshots, continue rendering
     * the current predicted state.
     */

    if (predictedShip) {

      renderShip = {

        x:
          predictedShip.x +
          correctionX,

        y:
          predictedShip.y +
          correctionY,

        angle:
          predictedShip.angle,

        thrust:
          predictedShip.thrust,

        hp:
          predictedShip.hp,

        shield:
          false,

        alive:
          true

      };

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
   * Send input to server
   * and perform local prediction.
   */

  let inputAccumulator =
    0;


  const loop =
    createLoop({

      step:
        1 / 60,


      simulate(dt) {

        /*
         * Local prediction runs every
         * client simulation step.
         */

        if (predictedShip) {

          const currentInput = {

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

          };


          integratePredictedShip(
            predictedShip,
            dt,
            currentInput
          );

        }


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


          const inputState = {

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

          };


          const seq =
            network.sendInput(
              inputState
            );


          pendingInputs.push({

            seq,

            input:
              inputState

          });

        }


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