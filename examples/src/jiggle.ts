import { SpheroMini, Utils, Event } from 'spherov2.js';
import { starter } from './utils/starter';
// SORRY FOR THIS CODE, It is my playground for now
let heading = 0
let speed = 0
const cmdPlay = (toy: SpheroMini) => {
  toy.configureCollisionDetection();
  let waitTime = 10
  toy.on(Event.onCollision, (e) => {
    speed+=500 // if we collide, speed up by 500. this will switch us to "move mode"

    console.log('collide')
  })
  const loop = async () => {
    while (true) {
      heading += 50 // rotate 50 degrees per interval
      waitTime = 10
      speed -= 1 // slow down by 1
      if(Math.random() > 0.99) speed=100 // randomly start moving 1% of the time
      if(speed > 0){
        // if we're in "move mode", then wait longer, letting the ball move further
        waitTime = 30
        heading = heading + 100
      }
      speed < 0 ? speed = 0 : speed //make sure speed is never negative
      heading = heading % 360 // keep heading between 0 and 360
      toy.roll(speed, heading, [])
      try{
      await Utils.wait(waitTime)
      }catch(e){
        console.error(e)
      }
    }
  }

  loop();
};

starter(cmdPlay);
