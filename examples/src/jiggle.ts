import { SpheroMini, Event } from '../../lib'
import { starter } from './utils/starter'

const cmdPlay = async (toy: SpheroMini) => {
  const waitTime = 10
  let timeSinceLastCollision = 9999
  let heading, speed, cooldown = 0

  await toy.configureCollisionDetection()

  const loop = async () => {
    timeSinceLastCollision += waitTime

    if (cooldown > 0) { // dead mode
      cooldown -= waitTime
      toy.setMainLedColor(0, 0, 0)
      return
    }

    if (speed > 0) { // move mode
      speed -= 1
      if (timeSinceLastCollision > 100) toy.setMainLedColor(0, 255, 0) // show green (move mode)
    } else {
      if (timeSinceLastCollision > 100) {
        toy.setMainLedColor(0, 0, 255) // show blue (idle mode)
        if (Math.random() < 0.01) cooldown = 5000 // 1% of the time, stop for 5 seconds
      }
    }

    if (timeSinceLastCollision > 100) heading += Math.random() * 100 // jiggle if we haven't collided recently

    heading = heading % 360 // keep heading between 0 and 360

    if (Math.random() < 0.005) speed = 200 // randomly start moving 0.5% of the time

    toy.roll(speed, heading, [])
  }

  toy.on(Event.onCollision, (e) => {
    if (timeSinceLastCollision < 100) return // ignore collisions that are too close together
    speed += 500 // if we collide, speed up by 500. this will switch us to "move mode"
    heading += 180 // and turn around
    timeSinceLastCollision = 0
    cooldown = 0 // stop idling
    // turn the led red
    toy.setMainLedColor(255, 0, 0)
  })

  setInterval(loop, waitTime)
};

starter(cmdPlay)
