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


  const interpolationDelay =
    100;


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


      reconcilePredictedBullets(
        snapshot
      );


      const ships =
        snapshot?.world?.entities?.filter(
          (entity) =>
            entity.kind === "ship"
        ) || [];


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
      return null;
    }


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

    };

  }


  function createInterpolatedRenderWorld() {

    if (
      !latestSnapshot
    ) {

      return renderWorld;

    }


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
      );

    }


    for (
      const entity of newerEntities
    ) {

      entityIds.add(
        String(entity.id)
      );

    }


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
    );

  }


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


  let loopStats = {

    stepsPerSecond:
      0,

    framesPerSecond:
      0,

    lastFrameDuration:
      0

  };


  function render() {

    if (latestSnapshot) {

      applySnapshot(
        latestSnapshot
      );

      renderWorld =
        createInterpolatedRenderWorld();

    }


    updatePredictedBullets();

    addPredictedBullets(
      renderWorld
    );


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


  let inputAccumulator =
    0;


  const loop =
    createLoop({

      step:
        1 / 60,


      simulate(dt) {

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

            shotId

          };


          previousFire =
            currentFire;


          network.sendInput(
            inputState
          );

        }


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