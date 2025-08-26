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
  let waitTime = 20
  let spiralRadius = 0
  let spiralAngle = 0
  let hue = 0
  let isPaused = false
  let speed = 150
  let radiusIncrement = 2
  let angleIncrement = 25
  let hueIncrement = 5
  let maxRadius = 255

  const loop = async () => {
    if (isPaused) return

    spiralAngle += angleIncrement
    spiralRadius += radiusIncrement

    if (spiralRadius > maxRadius) {
      spiralRadius = 0
    }

    const adjustedSpeed = Math.min(255, Math.floor(speed * (0.3 + (spiralRadius / maxRadius) * 0.7)))

    await toy.roll(adjustedSpeed, spiralAngle % 360, [])

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
      },

      r: () => {
        spiralRadius = 0
        spiralAngle = 0
        hue = 0
      },

      w: () => {
        let increment = 10
        if (shift) increment *= 2
        speed = Math.min(255, speed + increment)
      },

      s: () => {
        let increment = 10
        if (shift) increment *= 2
        speed = Math.max(0, speed - increment)
      },

      a: () => {
        let increment = 5
        if (shift) increment *= 2
        angleIncrement = Math.max(1, angleIncrement - increment)
      },

      d: () => {
        let increment = 5
        if (shift) increment *= 2
        angleIncrement += increment
      },

      q: () => {
        let increment = 0.1
        if (shift) increment *= 5
        radiusIncrement = Math.max(0.1, radiusIncrement - increment)
      },

      e: () => {
        let increment = 0.1
        if (shift) increment *= 5
        radiusIncrement += increment
      },

      z: () => {
        let increment = 10
        if (shift) increment *= 2
        maxRadius = Math.max(10, maxRadius - increment)
      },

      x: () => {
        let increment = 10
        if (shift) increment *= 2
        maxRadius += increment
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
  console.log("R: Reset spiral")
  console.log("W/S: Speed up/down")
  console.log("A/D: Angle increment -/+")
  console.log("Q/E: Radius increment -/+")
  console.log("Z/X: Max radius -/+")
  console.log("H/J: Hue speed -/+")
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
      speed: speed,
      spiralRadius: parseFloat(spiralRadius.toFixed(2)),
      spiralAngle: spiralAngle % 360,
      angleIncrement: angleIncrement,
      radiusIncrement: parseFloat(radiusIncrement.toFixed(2)),
      maxRadius: maxRadius,
      hue: Math.round(hue),
      hueIncrement: hueIncrement,
    })
  }
}

starter(cmdPlay)