
import { emitKeypressEvents } from 'readline';
import { stdin } from 'process';

import { SpheroMini, Event } from '../../lib'
import { starter } from './utils/starter'
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const cmdPlay = async (toy: SpheroMini) => {
  let waitTime = 1
  let flashlight = false
  const collisionTimeout = 100
  let timeSinceLastCollision = 9999
  let heading = 0;
  let speed = 0;
  let cooldown = 0
  await toy.configureCollisionDetection()

  const loop = async () => {
    try {
      timeSinceLastCollision += waitTime
      if (cooldown > 0) {
        cooldown -= waitTime
        await timeout(waitTime)
        loop()
        return
      }
      if (speed > 0) { // move mode
        console.log({ speed })
        speed -= waitTime
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
      if (Math.random() < 0.01) heading += 200 // randomly turn around some of the time
      heading = heading % 360 // keep heading between 0 and 360

      if (Math.random() < 0.01) speed = 25 // randomly start moving some of the time
      let speedToGo = speed > 0 ? speed * 10 + 100 : 0 // if we weren't moving, don't move
      if (timeSinceLastCollision < collisionTimeout) speedToGo = 1000 // if we've collided recently, go fast
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

  // try to "sort of" control the sphere with the keyboard
  const intervalTimes = (time: number, fn: () => void) => {
    if(time <= 0) return
    fn()
    setTimeout(() => intervalTimes(time-1, fn), time-1)
  }
  stdin.setRawMode(true)
  emitKeypressEvents(stdin)
  // suppress keypresses from being printed to the terminal
  stdin.on('keypress', (ch, {name:key, ctrl}) => {
    const keyToActionMap = {
      c: () => {
        if (ctrl) process.exit()
        // try to stop other behaviors
        cooldown += 5000
      },
      w: () => speed += 100,
      s: () => speed -= 100,
      a: () => heading -= 90,
      d: () => heading += 90,
      e: () => intervalTimes(100, ()=> heading += 90),
      q: () => timeSinceLastCollision = 0,
      f: () =>  {
        if(flashlight) {
          toy.setBackLedIntensity(0)
        } else {
          toy.setBackLedIntensity(255)
        }
        flashlight = !flashlight
      }

    }
    if (keyToActionMap[key]) keyToActionMap[key]()
  })

  loop();
};

starter(cmdPlay)
