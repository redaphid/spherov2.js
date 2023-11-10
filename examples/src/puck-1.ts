import { emitKeypressEvents } from "readline"
import { stdin } from "process"

import { SpheroMini, Event, DriveFlag } from "../../lib"
import { starter } from "./utils/starter"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const cmdPlay = async (toy: SpheroMini) => {
  toy.configureCollisionDetection(55, 55)
  let waitTime = 1
  let flashlight = false
  const collisionTimeout = 50
  let timeSinceLastCollision = 9999

  let heading = 0
  let isHeadingLocked = false
  let lockedHeading = 0

  let speed = 0
  let isSpeedLocked = false
  let lockedSpeed = 0

  let isRandomLocked = false
  let lockedRandom = 0

  let isCooldownLocked = false
  let cooldown = 0
  let lockedCooldown = 0

  let boost = false
  let msg = ""
  const random = async (min: number = 0, max: number = 1) => {
    let randomValue = isRandomLocked ? lockedRandom : Math.random()
    lockedRandom = randomValue
    await timeout(0)
    return randomValue * (max - min) + min
  }

  const allIntervals: Array<NodeJS.Timeout> = []
  const clearAllIntervals = () => {
    allIntervals.forEach((id) => clearInterval(id))
    allIntervals.length = 0
  }

  const intervalTimes = ({ fn, times = 10, interval = 50 }: { fn: () => any; times?: number; interval?: number }) => {
    const results = []
    return new Promise<Array<any>>((resolve) => {
      const id = setInterval(() => {
        if (times--) {
          const result = fn()
          results.push(result)
          return
        }
        clearInterval(id)
        resolve(Promise.all(results))
      }, interval)
      allIntervals.push(id)
    })
  }

  const jiggle = async () => {
    intervalTimes({ fn: async () => (heading += await random(-45, 45)) % 360, times: 100, interval: 250 })
  }

  const backAndForth = async () => {
    // go straight forward
    intervalTimes({ fn: async () => (speed = 255), times: 10000, interval: 100 })
    intervalTimes({ fn: async () => (heading += 180), times: 10000, interval: 5000 })
    // when we hit the wall, turn around
    const startedAt = Date.now()
    const turnAround = async () => {
      heading += 180 + (await random(-45, 45))
    }
    toy.on(Event.onCollision, turnAround)
  }

  const loop = async () => {
    timeSinceLastCollision += waitTime
    if (cooldown > 0) return (cooldown -= waitTime)

    if ((await random()) < 0.001) return (cooldown = 1000) // randomly sleep
    if ((await random()) < 0.005) speed += 128 // randomly speed up
    if ((await random()) < 0.01) heading += 200 // randomly turn around
    speed = Math.max(0, speed - 3)
    if (timeSinceLastCollision > collisionTimeout) {
      heading += await random(-10, 10) // jitter around if we're not running away from a collision
      if (speed > 0) {
        toy.setMainLedColor(0, 255, 0) // green
      } else {
        toy.setMainLedColor(0, 0, 255) // blue
      }
    }
    if (isSpeedLocked) speed = lockedSpeed
    if (isHeadingLocked) heading = lockedHeading
    if (speed < 0) {
      heading += 180
      speed = Math.abs(speed)
    }
    heading = Math.floor(heading % 360)
    speed = Math.min(255, speed)
    if (heading < 0) heading += 360

    await toy.roll(speed, heading, boost ? [DriveFlag.boost] : [])
  }

  const collide = () => {
    if (timeSinceLastCollision < collisionTimeout) return // ignore collisions that are too close together
    timeSinceLastCollision = 0
    speed = 255
    heading += 180 //turn around
    cooldown = 0 // stop idling
    // turn the led red
    toy.setMainLedColor(255, 0, 0)
  }

  toy.on(Event.onCollision, collide)

  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)
  const turningSpeed = 10
  stdin.on("keypress", (ch, { name: key, ctrl, shift }) => {
    const keyToActionMap = {
      c: () => {
        if (ctrl) process.exit()
        clearAllIntervals()
      },
      j: () => {
        jiggle()
      },
      b: () => {
        backAndForth()
      },
      q: () => {
        toy.setMainLedColor(0, 0, 0)
        if (ctrl) return (isCooldownLocked = !isCooldownLocked)
        let increment = 100
        if (shift) increment *= 5
        cooldown += increment
        lockedCooldown = cooldown
      },
      e: () => {
        toy.setMainLedColor(0, 0, 0)
        if (ctrl) return (isCooldownLocked = !isCooldownLocked)
        let increment = 100
        if (shift) increment *= 5
        cooldown -= increment
        lockedCooldown = cooldown
      },

      z: () => {
        if (ctrl) return (isRandomLocked = !isRandomLocked)
        let increment = 0.005
        if (shift) increment *= 5
        lockedRandom += increment
      },
      x: () => {
        if (ctrl) return (isRandomLocked = !isRandomLocked)
        let increment = 0.005
        if (shift) increment *= 5
        lockedRandom -= increment
      },
      w: () => {
        if (ctrl) return (isSpeedLocked = !isSpeedLocked)
        let increment = 10
        if (shift) increment *= 5
        speed += increment
        lockedSpeed = speed
      },
      s: () => {
        if (ctrl) return (isSpeedLocked = !isSpeedLocked)
        let increment = 10
        if (shift) increment *= 5
        speed -= increment
        lockedSpeed = speed
      },
      space: () => {
        if (speed === 0) {
          speed = 255
          lockedSpeed = speed
          boost = true
          setTimeout(() => (boost = false), 1000)
          return
        }
        speed = 0
        lockedSpeed = speed
      },

      a: () => {
        if (ctrl) return (isHeadingLocked = !isHeadingLocked)
        let increment = turningSpeed
        if (shift) increment *= 5
        heading -= increment
        lockedHeading = heading
      },

      d: () => {
        if (ctrl) return (isHeadingLocked = !isHeadingLocked)
        let increment = turningSpeed
        if (shift) increment *= 5
        heading += increment
        lockedHeading = heading
      },

      r: () => {
        // turn around
        heading += 180
        if (shift) heading += 90
        lockedHeading = heading
      },
      f: () => {
        if (flashlight) {
          toy.setBackLedIntensity(0)
        } else {
          toy.setBackLedIntensity(255)
        }
        flashlight = !flashlight
      },
    }
    if (keyToActionMap[key]) {
      keyToActionMap[key]()
    } else {
      msg = `keys you can use: ${Object.keys(keyToActionMap).join(", ")}. You can usually use control and shift with these`
    }
  })

  while (true) {
    await timeout(waitTime)
    // clear the console
    try {
      await loop()
      if (isCooldownLocked) cooldown = lockedCooldown
    } catch (e) {
      console.log(e)
      cooldown = 100
    }
    console.clear()
    console.table({
      heading: { value: heading, locked: isHeadingLocked },
      speed: { value: speed, locked: isSpeedLocked },
      cooldown: { value: cooldown, locked: isCooldownLocked },
      random: { value: parseFloat(lockedRandom.toFixed(4)), locked: isRandomLocked },
      timeSinceLastCollision: { value: timeSinceLastCollision, locked: false },
    })
    console.log(msg)
  }
}

starter(cmdPlay)
