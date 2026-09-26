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


  const network =
    new ClientNetwork(
      lobby.connection
    );


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


  network.netgraph.attach();


<<<<<<< Updated upstream
  /*
   * M2 check:
   * latency = 100 ms
   * jitter = 0
   * packet loss = 0
   */
=======
  const interpolationDelay =
    100;

>>>>>>> Stashed changes

  network.setLatency(100);
  network.setJitter(0);
  network.setPacketLoss(0);


  let latestSnapshot =
    null;


  let shotSequence =
    0;

  let previousFire =
    false;

  const predictedBullets =
    new Map();


  network.onSnapshot(
    (snapshot) => {

      latestSnapshot =
        snapshot;

<<<<<<< Updated upstream
=======

      reconcilePredictedBullets(
        snapshot
      );


      const ships =
        snapshot?.world?.entities?.filter(
          (entity) =>
            entity.kind === "ship"
        ) || [];


>>>>>>> Stashed changes
      console.log(
        "CLIENT SHIPS:",
        ships
      );


      console.log(
        "Player ship ID:",
        snapshot?.playerShipId
      );

    }
  );


  const canvas =
    createCanvas();


  drawLoadingScreen(
    canvas.ctx,
    canvas.width,
    canvas.height,
    0
  );


  const audio =
    createAudio();


  window.addEventListener(
    "click",
    () => {

      audio.unlock();

    },
    { once: true }
  );


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


  const input =
    createInput(
      window
    );


<<<<<<< Updated upstream
  /*
   * Local World exists only
   * because HUD/audio expect it.
   *
   * IMPORTANT:
   * We do NOT use world.step()
   * for client prediction.
   */

=======
>>>>>>> Stashed changes
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


  function getSnapshotShip(
    snapshot
  ) {

    const entities =
      snapshot?.world?.entities ||
      [];


    const playerShipId =
      snapshot?.playerShipId;


    if (
      playerShipId !== null &&
      playerShipId !== undefined
    ) {

      const playerShip =
        entities.find(
          (entity) =>
            entity.kind === "ship" &&
            String(entity.id) ===
              String(playerShipId)
        );


      if (playerShip) {

        return playerShip;

      }

    }


    return (
      entities.find(
        (entity) =>
          entity.kind === "ship"
      ) || null
    );

  }


<<<<<<< Updated upstream
  /*
   * Render ship.
   */

=======
>>>>>>> Stashed changes
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
        snapshotShip.shield ?? false,

      alive:
        snapshotShip.alive ?? true

    };

  }


  function createPredictedBullet(
    snapshotShip,
    shotId
  ) {

    if (!snapshotShip) {
      return;
    }


    const angle =
      snapshotShip.angle ?? 0;


    const directionX =
      Math.cos(
        angle - Math.PI / 2
      );

    const directionY =
      Math.sin(
        angle - Math.PI / 2
      );


    const radius =
      snapshotShip.radius ?? 20;


    const bulletX =
      snapshotShip.x +
      directionX *
        (radius + 4);


    const bulletY =
      snapshotShip.y +
      directionY *
        (radius + 4);


    const bulletSpeed =
      500;


    const bulletVx =
      (snapshotShip.vx ?? 0) +
      directionX *
        bulletSpeed;


    const bulletVy =
      (snapshotShip.vy ?? 0) +
      directionY *
        bulletSpeed;


    predictedBullets.set(
      String(shotId),
      {

        id:
          String(shotId),

        kind:
          "bullet",

        x:
          bulletX,

        y:
          bulletY,

        vx:
          bulletVx,

        vy:
          bulletVy,

        radius:
          4,

        ttl:
          2,

        alive:
          true,

        predicted:
          true,

        lastUpdate:
          performance.now()

      }
    );

  }


  function updatePredictedBullets() {

    const now =
      performance.now();


    for (
      const [shotId, bullet]
      of predictedBullets
    ) {

      const dt =
        Math.min(
          0.05,
          Math.max(
            0,
            (now - bullet.lastUpdate) /
              1000
          )
        );


      bullet.lastUpdate =
        now;


      bullet.x +=
        bullet.vx * dt;

      bullet.y +=
        bullet.vy * dt;


      bullet.ttl -=
        dt;


      if (
        bullet.ttl <= 0
      ) {

        predictedBullets.delete(
          shotId
        );

      }

    }

  }


  function reconcilePredictedBullets(
    snapshot
  ) {

    const entities =
      snapshot?.world?.entities ||
      [];


    const serverBulletIds =
      new Set(
        entities
          .filter(
            (entity) =>
              entity.kind ===
              "bullet"
          )
          .map(
            (entity) =>
              String(entity.id)
          )
      );


    for (
      const shotId
      of predictedBullets.keys()
    ) {

      if (
        serverBulletIds.has(
          String(shotId)
        )
      ) {

        predictedBullets.delete(
          shotId
        );

      }

    }

  }


  function addPredictedBullets(
    worldToRender
  ) {

    for (
      const bullet
      of predictedBullets.values()
    ) {

      worldToRender.entities.push({

        id:
          bullet.id,

        kind:
          "bullet",

        pos: {

          x:
            bullet.x,

          y:
            bullet.y

        },

        vel: {

          x:
            bullet.vx,

          y:
            bullet.vy

        },

        angle:
          0,

        radius:
          bullet.radius,

        ttl:
          bullet.ttl,

        alive:
          true,

        predicted:
          true

      });

    }

  }


  let renderWorld =
    createRenderWorld(
      null
    );


  let renderShip =
    null;


<<<<<<< Updated upstream
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
=======
  function lerp(
    a,
    b,
    t
  ) {

    return (
      a +
      (b - a) * t
    );

  }


  function lerpAngle(
    a,
    b,
    t
  ) {

    const twoPi =
      Math.PI * 2;


    let difference =
      b - a;


    while (
      difference >
      Math.PI
    ) {

      difference -=
        twoPi;

    }


    while (
      difference <
      -Math.PI
    ) {

      difference +=
        twoPi;

    }


    return (
      a +
      difference * t
    );

  }


  function findEntity(
    snapshot,
    entityId
  ) {

    const entities =
      snapshot?.world?.entities ||
      [];


    return (
      entities.find(
        (entity) =>
          String(entity.id) ===
          String(entityId)
      ) || null
    );

  }


  function interpolateEntity(
    from,
    to,
    alpha
  ) {

    if (!from && !to) {
>>>>>>> Stashed changes
      return null;
    }


<<<<<<< Updated upstream
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
=======
    if (!from) {

      return to;

    }


    if (!to) {

      return from;

    }


    return {

      ...to,

      x:
        lerp(
          from.x ?? 0,
          to.x ?? 0,
          alpha
        ),

      y:
        lerp(
          from.y ?? 0,
          to.y ?? 0,
          alpha
        ),

      angle:
        lerpAngle(
          from.angle ?? 0,
          to.angle ?? 0,
          alpha
        ),

      vx:
        lerp(
          from.vx ?? 0,
          to.vx ?? 0,
          alpha
        ),

      vy:
        lerp(
          from.vy ?? 0,
          to.vy ?? 0,
          alpha
        ),

      radius:
        to.radius ?? from.radius ?? 0,

      hp:
        to.hp ?? from.hp,

      thrust:
        to.thrust ?? from.thrust,

      type:
        to.type ?? from.type,

      ttl:
        to.ttl ?? from.ttl
>>>>>>> Stashed changes

    };

  }


<<<<<<< Updated upstream
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
=======
  function createInterpolatedRenderWorld() {

    if (
      !latestSnapshot
    ) {

      return renderWorld;
>>>>>>> Stashed changes

    }


<<<<<<< Updated upstream
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
=======
    const renderTime =
      performance.now() -
      interpolationDelay;


    const pair =
      network.snapshotClient.getInterpolationPair(
        renderTime
      );


    if (!pair) {

      return createRenderWorld(
        latestSnapshot
      );

    }


    const older =
      pair.previous;

    const newer =
      pair.next;

    const alpha =
      pair.alpha;


    const olderEntities =
      older?.world?.entities ||
      [];


    const newerEntities =
      newer?.world?.entities ||
      [];


    const entityIds =
      new Set();


    for (
      const entity of olderEntities
    ) {

      entityIds.add(
        String(entity.id)
>>>>>>> Stashed changes
      );

    }


<<<<<<< Updated upstream
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
=======
    for (
      const entity of newerEntities
    ) {

      entityIds.add(
        String(entity.id)
      );
>>>>>>> Stashed changes

    }


<<<<<<< Updated upstream
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
=======
    const interpolatedEntities =
      [];


    for (
      const entityId of entityIds
    ) {

      const from =
        findEntity(
          older,
          entityId
        );


      const to =
        findEntity(
          newer,
          entityId
        );


      const entity =
        interpolateEntity(
          from,
          to,
          alpha
        );


      if (!entity) {
        continue;
      }


      interpolatedEntities.push(
        entity
      );

    }


    const localShip =
      getSnapshotShip(
        latestSnapshot
      );


    if (localShip) {

      const localShipId =
        String(
          localShip.id
        );


      const localIndex =
        interpolatedEntities.findIndex(
          (entity) =>
            String(entity.id) ===
            localShipId
        );


      if (
        localIndex >= 0
      ) {

        interpolatedEntities[
          localIndex
        ] = localShip;

      } else {

        interpolatedEntities.push(
          localShip
        );

      }

    }


    const interpolatedWorld = {

      width:
        newer?.world?.width ??
        canvas.width,

      height:
        newer?.world?.height ??
        canvas.height,

      score:
        newer?.world?.score ??
        0,

      entities:
        interpolatedEntities

    };


    interpolatedWorld[
      Symbol.iterator
    ] = function* () {

      yield* this.entities;

    };


    return createRenderWorld(
      {
        world:
          interpolatedWorld
      }
>>>>>>> Stashed changes
    );

  }

<<<<<<< Updated upstream

  /*
   * Apply authoritative snapshot.
   */
=======
>>>>>>> Stashed changes

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


  let loopStats = {

    stepsPerSecond:
      0,

    framesPerSecond:
      0,

    lastFrameDuration:
      0

  };


<<<<<<< Updated upstream
  /*
   * Render.
   */

=======
>>>>>>> Stashed changes
  function render() {

    if (latestSnapshot) {

      applySnapshot(
        latestSnapshot
      );

      renderWorld =
        createInterpolatedRenderWorld();

    }


<<<<<<< Updated upstream
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
=======
    updatePredictedBullets();

    addPredictedBullets(
      renderWorld
    );
>>>>>>> Stashed changes


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


<<<<<<< Updated upstream
  /*
   * Send input to server
   * and perform local prediction.
   */

=======
>>>>>>> Stashed changes
  let inputAccumulator =
    0;


  const loop =
    createLoop({

      step:
        1 / 60,


      simulate(dt) {

<<<<<<< Updated upstream
        /*
         * Local prediction runs every
         * client simulation step.
         */

        if (predictedShip) {

          const currentInput = {
=======
        inputAccumulator +=
          dt;


        if (
          inputAccumulator >=
          1 / 30
        ) {

          inputAccumulator -=
            1 / 30;


          const currentFire =
            input.isDown(
              "Space"
            );


          let shotId =
            null;


          if (
            currentFire &&
            !previousFire
          ) {

            shotId =
              `${localPlayerId ?? "player"}-${shotSequence++}`;


            const localShip =
              getSnapshotShip(
                latestSnapshot
              );


            createPredictedBullet(
              localShip,
              shotId
            );

          }


          const inputState = {
>>>>>>> Stashed changes

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
              currentFire,

<<<<<<< Updated upstream
          };


          integratePredictedShip(
            predictedShip,
            dt,
            currentInput
=======
            shotId

          };


          previousFire =
            currentFire;


          network.sendInput(
            inputState
>>>>>>> Stashed changes
          );

        }


<<<<<<< Updated upstream
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


=======
>>>>>>> Stashed changes
        input.endFrame();

      },


      render

    });


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