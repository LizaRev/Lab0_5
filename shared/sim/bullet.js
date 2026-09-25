import { Entity } from './entity.js'; //імпорт класу

export class Bullet extends Entity {

  constructor(x, y, vx, vy, owner = null) {
    super(x, y, vx, vy, 0, 4, 'bullet');

    this.ttl = 2;
    this.homing = null; 
    this.owner = owner;
  }

  update(dt, inputs) { 
    if (this.homing) {
      this.homing.update(this, dt); 
    }

    super.update(dt); 

    this.ttl -= dt; 

    if (this.ttl <= 0) { 
      this.alive = false;
    }
  }
}