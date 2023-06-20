import { SpheroMini, Event } from '../../lib'
import { starter } from './utils/starter'
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const cmdPlay = async (toy: SpheroMini) => {
  let waitTime = 1
  const collisionTimeout = 100
  let timeSinceLastCollision = 9999
  let heading = 0;
  let speed = 0;
  let cooldown = 0
  await toy.configureCollisionDetection()

  const loop = async () => {
    try {
      timeSinceLastCollision += waitTime
      if(cooldown > 0) {
        cooldown -= waitTime
        await timeout(waitTime)
        loop()
        return
      }
      if (speed > 0) { // move mode
        console.log({speed})
        speed -= 1
        if (timeSinceLastCollision > collisionTimeout) toy.setMainLedColor(0, 255, 0) // show green (move mode)
      } else {
        if (timeSinceLastCollision > collisionTimeout) {
          await toy.setMainLedColor(0, 0, 255) // show blue (idle mode)
          if (Math.random() < 0.001) {
            cooldown = 5000 // 1% of the time, stop for 5 seconds
            await toy.setMainLedColor(0, 0, 0) // light goes out (dead mode)
          }
        }
      }

      if (timeSinceLastCollision > collisionTimeout) heading += Math.random() * 10 // jiggle if we haven't collided recently
      if(Math.random() < 0.01) heading += 180 // randomly turn around some of the time
      heading = heading % 360 // keep heading between 0 and 360

      if (Math.random() < 0.01) speed = 25 // randomly start moving some of the time
      let speedToGo = speed > 0 ? speed * 10+ 100: 0 // if we weren't moving, don't move
      if(timeSinceLastCollision < collisionTimeout) speedToGo = 1000 // if we've collided recently, stop
      await toy.roll(speedToGo, heading, [])
    } catch (e) {
      console.log(e);
      cooldown = 100
    }
    await timeout(waitTime)
    loop()
  }

  toy.on(Event.onCollision, (e) => {
    if (timeSinceLastCollision < 100) return // ignore collisions that are too close together
    speed = 500 // if we collide, speed up by 500. this will switch us to "move mode"
    heading += 180 // and turn around
    timeSinceLastCollision = 0
    cooldown = 0 // stop idling
    // turn the led red
    console.log('COLLISION');
    toy.setMainLedColor(255, 0, 0)
  })
  loop();
};

starter(cmdPlay)
