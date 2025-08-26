import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, DriveFlag } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = h / 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number, k = (n + h * 12) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

interface DanceMoves {
  circle: () => Promise<void>
  figure8: () => Promise<void>
  mirror: () => Promise<void>
  chase: () => Promise<void>
  spin: () => Promise<void>
  wave: () => Promise<void>
}

class DualSpheroController {
  private sphero1: SpheroMini | null = null
  private sphero2: SpheroMini | null = null
  private isPaused = false
  private currentPattern = "circle"
  private hue = 0
  private patternPhase = 0
  private speed = 100

  async findAndConnectSpheros() {
    console.log("Searching for Spheros...")
    const spheros = await Scanner.findAll(SpheroMini.advertisement)

    if (spheros.length < 2) {
      console.log(`Only found ${spheros.length} Sphero(s). Need 2 to dance!`)
      console.log("Make sure both Spheros are awake and in range.")
      await timeout(1000)
      return this.findAndConnectSpheros()
    }

    console.log(`Found ${spheros.length} Spheros!`)
    this.sphero1 = spheros[0]
    this.sphero2 = spheros[1]

    console.log(`Connected to Sphero 1: ${this.sphero1.id}`)
    console.log(`Connected to Sphero 2: ${this.sphero2.id}`)

    await this.sphero1.configureCollisionDetection(0, 0)
    await this.sphero2.configureCollisionDetection(0, 0)

    return true
  }

  private async setColors(hue1: number, hue2: number) {
    if (!this.sphero1 || !this.sphero2) return

    const [r1, g1, b1] = hslToRgb(hue1, 1, 0.5)
    const [r2, g2, b2] = hslToRgb(hue2, 1, 0.5)

    await this.sphero1.setMainLedColor(r1, g1, b1)
    await this.sphero2.setMainLedColor(r2, g2, b2)
  }

  private dancePatterns: DanceMoves = {
    circle: async () => {
      const angle1 = this.patternPhase
      const angle2 = (this.patternPhase + 180) % 360

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(this.speed, angle1, [])
        await this.sphero2.roll(this.speed, angle2, [])
      }

      this.patternPhase = (this.patternPhase + 10) % 360
      await this.setColors(this.hue, (this.hue + 180) % 360)
    },

    figure8: async () => {
      const t = (this.patternPhase * Math.PI) / 180
      const angle1 = Math.floor(Math.sin(t) * 90 + 90) % 360
      const angle2 = Math.floor(Math.sin(t + Math.PI) * 90 + 270) % 360

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(this.speed, angle1, [])
        await this.sphero2.roll(this.speed, angle2, [])
      }

      this.patternPhase = (this.patternPhase + 5) % 360
      await this.setColors(this.hue, (this.hue + 90) % 360)
    },

    mirror: async () => {
      const angle = Math.floor(Math.sin((this.patternPhase * Math.PI) / 180) * 180)

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(this.speed, angle, [])
        await this.sphero2.roll(this.speed, -angle + 360, [])
      }

      this.patternPhase = (this.patternPhase + 10) % 360
      await this.setColors(this.hue, this.hue)
    },

    chase: async () => {
      const angle = this.patternPhase
      const speed1 = this.speed
      const speed2 = Math.floor(this.speed * 0.8)

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(speed1, angle, [])
        await this.sphero2.roll(speed2, angle, [])
      }

      this.patternPhase = (this.patternPhase + 15) % 360
      await this.setColors(this.hue, (this.hue + 60) % 360)
    },

    spin: async () => {
      const speed1 = Math.floor(Math.sin((this.patternPhase * Math.PI) / 90) * this.speed)
      const speed2 = Math.floor(Math.cos((this.patternPhase * Math.PI) / 90) * this.speed)

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(Math.abs(speed1), this.patternPhase * 2, [])
        await this.sphero2.roll(Math.abs(speed2), -this.patternPhase * 2 + 360, [])
      }

      this.patternPhase = (this.patternPhase + 5) % 360
      const rapidHue = (this.hue + this.patternPhase * 2) % 360
      await this.setColors(rapidHue, (rapidHue + 120) % 360)
    },

    wave: async () => {
      const phase1 = this.patternPhase
      const phase2 = (this.patternPhase + 90) % 360

      const speed1 = Math.floor(Math.abs(Math.sin((phase1 * Math.PI) / 180)) * this.speed)
      const speed2 = Math.floor(Math.abs(Math.sin((phase2 * Math.PI) / 180)) * this.speed)

      if (this.sphero1 && this.sphero2) {
        await this.sphero1.roll(speed1, 0, [])
        await this.sphero2.roll(speed2, 180, [])
      }

      this.patternPhase = (this.patternPhase + 10) % 360
      await this.setColors((this.hue + phase1) % 360, (this.hue + phase2) % 360)
    },
  }

  async start() {
    const connected = await this.findAndConnectSpheros()
    if (!connected) {
      console.log("Failed to connect to 2 Spheros. Exiting...")
      process.exit(1)
    }

    if (stdin.setRawMode) stdin.setRawMode(true)
    emitKeypressEvents(stdin)

    stdin.on("keypress", (ch, { name: key, ctrl, shift }) => {
      const keyActions: { [key: string]: () => void } = {
        c: () => {
          if (ctrl) {
            console.log("Shutting down...")
            if (this.sphero1) this.sphero1.roll(0, 0, [])
            if (this.sphero2) this.sphero2.roll(0, 0, [])
            process.exit()
          }
        },

        space: () => {
          this.isPaused = !this.isPaused
          if (this.isPaused && this.sphero1 && this.sphero2) {
            this.sphero1.roll(0, 0, [])
            this.sphero2.roll(0, 0, [])
          }
        },

        "1": () => {
          this.currentPattern = "circle"
        },
        "2": () => {
          this.currentPattern = "figure8"
        },
        "3": () => {
          this.currentPattern = "mirror"
        },
        "4": () => {
          this.currentPattern = "chase"
        },
        "5": () => {
          this.currentPattern = "spin"
        },
        "6": () => {
          this.currentPattern = "wave"
        },

        w: () => {
          this.speed = Math.min(255, this.speed + (shift ? 20 : 10))
        },
        s: () => {
          this.speed = Math.max(0, this.speed - (shift ? 20 : 10))
        },

        r: () => {
          this.patternPhase = 0
          this.hue = 0
        },

        b: () => {
          if (this.sphero1 && this.sphero2) {
            const intensity = shift ? 255 : 128
            this.sphero1.setBackLedIntensity(intensity)
            this.sphero2.setBackLedIntensity(intensity)
          }
        },

        n: () => {
          if (this.sphero1 && this.sphero2) {
            this.sphero1.setBackLedIntensity(0)
            this.sphero2.setBackLedIntensity(0)
          }
        },
      }

      if (keyActions[key]) {
        keyActions[key]()
      }
    })

    console.log("\n=== Dual Sphero Dance Controller ===")
    console.log("\nDance Patterns:")
    console.log("1: Circle Dance - Spheros orbit in opposite directions")
    console.log("2: Figure 8 - Create figure-8 patterns")
    console.log("3: Mirror - Symmetric movements")
    console.log("4: Chase - One follows the other")
    console.log("5: Spin - Rotating spiral dance")
    console.log("6: Wave - Back and forth wave motion")
    console.log("\nControls:")
    console.log("Space: Pause/Resume")
    console.log("W/S: Speed up/down (hold Shift for bigger changes)")
    console.log("R: Reset pattern")
    console.log("B/N: Back LED on/off (Shift+B for bright)")
    console.log("Ctrl+C: Exit")

    while (true) {
      await timeout(50)

      if (!this.isPaused) {
        try {
          const pattern = this.dancePatterns[this.currentPattern as keyof DanceMoves]
          if (pattern) {
            await pattern()
          }

          this.hue = (this.hue + 2) % 360
        } catch (e) {
          console.error("Error in dance loop:", e)
          await timeout(100)
        }
      }

      console.clear()
      console.log("=== Dual Sphero Dance ===")
      console.table({
        pattern: this.currentPattern,
        paused: this.isPaused,
        speed: this.speed,
        phase: Math.round(this.patternPhase),
        hue: Math.round(this.hue),
        sphero1: this.sphero1 ? "Connected" : "Disconnected",
        sphero2: this.sphero2 ? "Connected" : "Disconnected",
      })
      console.log("\nPress 1-6 to change patterns, Space to pause")
    }
  }
}

const controller = new DualSpheroController()
controller.start()
