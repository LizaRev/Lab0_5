import { Entity } from './entity.js';

export class Pickup extends Entity {

  constructor(x, y, type = 'shield') { 
    super(x, y, 0, 0, 0, 15, 'pickup'); 

    this.type = type; 
  }

  update(dt) {
  }
}