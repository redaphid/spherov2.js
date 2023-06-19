import { SpheroMini, Utils, Event } from 'spherov2.js';
import { starter } from './utils/starter';
// SORRY FOR THIS CODE, It is my playground for now
let heading = 0
const cmdPlay = (toy: SpheroMini) => {
  toy.configureCollisionDetection();
  toy.on(Event.onCollision, (e) => {
    console.log('COLLISION', e);
  })
  const loop = async () => {
    while (true) {
      heading += 50
      heading = heading % 360
      toy.roll(0.1, heading, [])
      await Utils.wait(100);
    }
  }

  loop();
};

starter(cmdPlay);
