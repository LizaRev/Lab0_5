import { Entity } from './entity.js';
import { Vector2 } from './vector.js';

export class ExplosionParticle extends Entity {  
  constructor(x, y, vx, vy) {
    super(x, y, vx, vy, 0, 3, 'explosion');

    this.ttl = 0.5;
  }

  update(dt) {
    super.update(dt);

    this.ttl -= dt;

    if (this.ttl <= 0) {
      this.alive = false;
    }
  }
}

export function createExplosion(world, x, y) {
  const particleCount = 20; 

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;

    const direction = Vector2.fromAngle(angle);

    const particle = new ExplosionParticle(
      x,
      y,
      direction.x * speed,
      direction.y * speed
    );

    world.spawn(particle);
  }
}

