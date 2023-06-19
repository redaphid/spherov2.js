import { SpheroMini, Utils, Event } from '../../lib';
import { starter } from './utils/starter';
// SORRY FOR THIS CODE, It is my playground for now
let heading = 0
let speed = 0
const cmdPlay = async (toy: SpheroMini) => {
  await toy.configureCollisionDetection();
  let waitTime = 10
  let timeSinceLastCollision = 9999
  toy.on(Event.onCollision, (e) => {
    speed+=500 // if we collide, speed up by 500. this will switch us to "move mode"
    heading += 180 // and turn around
    console.log('collide')
    timeSinceLastCollision = 0
    // turn the led red
    toy.setMainLedColor(255, 0, 0)
  })
  const loop = async () => {
    timeSinceLastCollision += waitTime
    while (true) {
      heading += 50 // rotate 50 degrees per interval
      waitTime = 10
      if(Math.random() > 0.995) speed=200 // randomly start moving 1% of the time
      if(speed > 0) {
        speed -= 1 // slow down by 1
        waitTime = 30
        heading = ( heading + Math.random() * 100 ) % 360 // randomly change direction
        if(timeSinceLastCollision < 100) continue
        // turn the led green
      } else {
        if(timeSinceLastCollision < 100) continue
        // turn the led blue
        toy.setMainLedColor(0, 0, 255)
      }
      heading = heading % 360 // keep heading between 0 and 360
      toy.roll(speed, heading, [])
      await Utils.wait(waitTime)
    }
  }

  loop();
};

starter(cmdPlay);
