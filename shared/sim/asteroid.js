import { Entity } from './entity.js';
import { Vector2 } from './vector.js';
import { Bullet } from './bullet.js';

export class Asteroid extends Entity {

  constructor(
    x,
    y,
    vx,
    vy,
    radius = 30
  ) {
    super(
      x,
      y,
      vx,
      vy,
      0,
      radius,
      'asteroid'
    );

    this.hp = 3;
    this.homing = null;

    this.shootTimer = 3;
  }

  update(dt, inputs) {

    if (this.homing) {
      this.homing.update(
        this,
        dt
      );
    }

    super.update(dt);

    const width = inputs.width;
    const height = inputs.height;

    if (
      this.pos.x - this.radius < 0
    ) {
      this.pos.x = this.radius;
      this.vel.x =
        Math.abs(this.vel.x);
    }

    if (
      this.pos.x + this.radius > width
    ) {
      this.pos.x =
        width - this.radius;

      this.vel.x =
        -Math.abs(this.vel.x);
    }

    if (
      this.pos.y - this.radius < 0
    ) {
      this.pos.y = this.radius;

      this.vel.y =
        Math.abs(this.vel.y);
    }

    if (
      this.pos.y + this.radius > height
    ) {
      this.pos.y =
        height - this.radius;

      this.vel.y =
        -Math.abs(this.vel.y);
    }

    this.shootTimer -= dt;

    if (this.shootTimer <= 0) {

      this.shootAtShip();

      this.shootTimer = 3;
    }
  }

  shootAtShip() {

    if (!this.world) {
      return;
    }

    let target = null;

    for (
      const ship of
      this.world.ofKind('ship')
    ) {
      target = ship;
      break;
    }

    if (!target) {
      return;
    }

    const direction =
      new Vector2(
        target.pos.x - this.pos.x,
        target.pos.y - this.pos.y
      ).normalize();

    const bulletSpeed = 500;

    const bulletX =
      this.pos.x +
      direction.x *
      (this.radius + 5);

    const bulletY =
      this.pos.y +
      direction.y *
      (this.radius + 5);

    const bulletVx =
      direction.x * bulletSpeed;

    const bulletVy =
      direction.y * bulletSpeed;

    const bullet = new Bullet(
      bulletX,
      bulletY,
      bulletVx,
      bulletVy,
      this
    );

    this.world.spawn(bullet);
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}