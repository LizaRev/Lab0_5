export function drawScene(
  ctx,
  width,
  height,
  ship,
  world,
  assets
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, width, height);

  drawStars(ctx, width, height);
  drawGrid(ctx, width, height);

  for (const entity of world) {
    if (
      entity.kind === 'ship' &&
      entity.id !== ship?.id
    ) {
      drawShip(
        ctx,
        entity,
        assets.ship
      );
    }

    if (entity.kind === 'asteroid') {
      drawAsteroid(
        ctx,
        entity,
        assets.asteroid
      );
    }

    if (entity.kind === 'bullet') {
      drawBullet(
        ctx,
        entity,
        assets.bullet
      );
    }

    if (entity.kind === 'explosion') {
      drawExplosionParticle(
        ctx,
        entity
      );
    }

    if (entity.kind === 'pickup') {
      drawPickup(
        ctx,
        entity,
        assets.shield
      );
    }
  }


  drawShip(
    ctx,
    ship,
    assets.ship
  );
}


function drawStars(ctx, width, height) {
  ctx.fillStyle = 'white';

  for (let x = 30; x < width; x += 100) {
    for (let y = 30; y < height; y += 100) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
}


function drawGrid(ctx, width, height) {
  const size = 50;

  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += size) {
    ctx.beginPath();

    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);

    ctx.stroke();
  }

  for (let y = 0; y <= height; y += size) {
    ctx.beginPath();

    ctx.moveTo(0, y);
    ctx.lineTo(width, y);

    ctx.stroke();
  }
}


function drawShip(ctx, ship, image) {
  if (!ship || !image) {
    return;
  }


  const x =
    ship.x ??
    ship.pos?.x;

  const y =
    ship.y ??
    ship.pos?.y;

  if (
    x === undefined ||
    y === undefined
  ) {
    return;
  }

  ctx.save();

  ctx.translate(
    x,
    y
  );

  ctx.rotate(
    ship.angle ?? 0
  );

  const sourceX = 0;
  const sourceY = 0;

  const sourceWidth = image.width;
  const sourceHeight = image.height;

  const drawWidth = 90;
  const drawHeight = 90;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}


function drawBullet(ctx, bullet, image) {
  if (!image) {
    return;
  }

  const size = bullet.radius * 2;

  const sourceX = 0;
  const sourceY = 0;

  const sourceWidth = image.width;
  const sourceHeight = image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    bullet.pos.x - size / 2,
    bullet.pos.y - size / 2,
    size,
    size
  );
}


function drawAsteroid(ctx, asteroid, image) {
  if (!image) {
    return;
  }

  const size =
    asteroid.radius * 2.5;

  const sourceX = 0;
  const sourceY = 0;

  const sourceWidth =
    image.width;

  const sourceHeight =
    image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    asteroid.pos.x - size / 2,
    asteroid.pos.y - size / 2,
    size,
    size
  );
}


function drawExplosionParticle(ctx, particle) {
  const alpha =
    particle.ttl / 0.5;

  ctx.globalAlpha =
    alpha;

  ctx.beginPath();

  ctx.arc(
    particle.pos.x,
    particle.pos.y,
    particle.radius,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    'orange';

  ctx.fill();

  ctx.globalAlpha =
    1;
}


function drawPickup(ctx, pickup, image) {
  if (!image) {
    return;
  }

  const size =
    pickup.radius * 5;

  const sourceX = 0;
  const sourceY = 0;

  const sourceWidth =
    image.width;

  const sourceHeight =
    image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    pickup.pos.x - size / 2,
    pickup.pos.y - size / 2,
    size,
    size
  );
}

