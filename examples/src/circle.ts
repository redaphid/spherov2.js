import { emitKeypressEvents } from "readline"
import { stdin } from "process"

import { SpheroMini, Event, DriveFlag } from "../../lib"
import { starter } from "./utils/starter"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = h / 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number, k = (n + h * 12) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

const cmdPlay = async (toy: SpheroMini) => {
  let waitTime = 50
  let angle = 0
  let hue = 0
  let isPaused = false
  let speed = 3
  let angleIncrement = 5
  let hueIncrement = 2
  let speedIncrement = 0.5
  let maxSpeed = 255
  let minSpeed = 3

  const loop = async () => {
    if (isPaused) return

    angle = (angle + angleIncrement) % 360

    speed = speed + speedIncrement
    
    if (speed > maxSpeed || speed < minSpeed) {
      speedIncrement = -speedIncrement
      speed = Math.max(minSpeed, Math.min(maxSpeed, speed))
    }

    await toy.roll(Math.round(speed), angle, [])

    hue = (hue + hueIncrement) % 360
    const [r, g, b] = hslToRgb(hue, 1, 0.5)
    toy.setMainLedColor(r, g, b)
  }

  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  stdin.on("keypress", (ch, { name: key, ctrl, shift }) => {
    const keyToActionMap = {
      c: () => {
        if (ctrl) process.exit()
      },

      space: () => {
        isPaused = !isPaused
        if (isPaused) {
          toy.roll(0, 0, [])
        }
      },

      r: () => {
        angle = 0
        hue = 0
        speed = minSpeed
      },

      w: () => {
        let increment = 10
        if (shift) increment *= 2
        maxSpeed = Math.min(255, maxSpeed + increment)
      },

      s: () => {
        let increment = 10
        if (shift) increment *= 2
        maxSpeed = Math.max(minSpeed + 10, maxSpeed - increment)
      },

      q: () => {
        let increment = 0.1
        if (shift) increment *= 5
        speedIncrement = Math.max(0, speedIncrement - increment)
      },

      e: () => {
        let increment = 0.1
        if (shift) increment *= 5
        speedIncrement = speedIncrement + increment
      },

      a: () => {
        let increment = 1
        if (shift) increment *= 5
        angleIncrement = Math.max(-30, angleIncrement - increment)
      },

      d: () => {
        let increment = 1
        if (shift) increment *= 5
        angleIncrement = Math.min(30, angleIncrement + increment)
      },

      h: () => {
        let increment = 1
        if (shift) increment *= 5
        hueIncrement = Math.max(0, hueIncrement - increment)
      },

      j: () => {
        let increment = 1
        if (shift) increment *= 5
        hueIncrement += increment
      },
    }

    if (keyToActionMap[key]) {
      keyToActionMap[key]()
    }
  })

  console.log("Spiral Control:")
  console.log("Space: Pause/Resume")
  console.log("R: Reset to center")
  console.log("W/S: Max speed up/down")
  console.log("Q/E: Speed increment -/+")
  console.log("A/D: Turn rate -/+ (negative = counterclockwise)")
  console.log("H/J: Color change speed -/+")
  console.log("Ctrl+C: Exit")
  console.log("(Hold Shift for larger adjustments)")

  while (true) {
    await timeout(waitTime)
    try {
      await loop()
    } catch (e) {
      console.log(e)
      await timeout(100)
    }

    console.clear()
    console.table({
      paused: isPaused,
      speed: Math.round(speed),
      speedIncrement: parseFloat(speedIncrement.toFixed(2)),
      maxSpeed: maxSpeed,
      angle: angle,
      angleIncrement: angleIncrement,
      hue: Math.round(hue),
      hueIncrement: hueIncrement,
    })
    console.log("\nSpiral Control:")
    console.log("Space: Pause/Resume | R: Reset")
    console.log("W/S: Max speed | Q/E: Speed increment")
    console.log("A/D: Turn rate | H/J: Color speed")
    console.log("Ctrl+C: Exit")
  }
}

starter(cmdPlay)