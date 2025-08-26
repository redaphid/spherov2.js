import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, Utils, SensorData } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Player {
  toy: SpheroMini
  name: string
  role: "hider" | "seeker"
  speed: number
  heading: number
  position: { x: number, y: number }
  isFound: boolean
  lastPing: number
  gyroActivity: number
  accelerometerMagnitude: number
}

const HIDE_TIME = 20000 // 20 seconds to hide
const SEEK_TIME = 60000 // 60 seconds to find
const PING_COOLDOWN = 3000 // 3 seconds between pings
const DETECTION_RADIUS = 30 // cm to be "found"

const COLORS = {
  hider: { r: 0, g: 100, b: 0 }, // Dark green (stealth)
  seeker: { r: 255, g: 100, b: 0 }, // Orange
  ping: { r: 255, g: 255, b: 255 }, // White flash
  found: { r: 255, g: 0, b: 0 }, // Red
  searching: { r: 100, g: 100, b: 255 }, // Light blue
  hidden: { r: 0, g: 0, b: 0 } // Off (invisible)
}

const main = async () => {
  console.log("🔍 CODE & SEEK - Hide and Seek with Sensors!")
  console.log("Finding Sphero Minis...")

  const bots = await Scanner.findToys([SpheroMini.advertisement])
  
  if (bots.length < 2) {
    console.log("Need at least 2 Sphero Minis to play!")
    process.exit()
  }

  const players: Player[] = []
  
  // Initialize players
  for (let i = 0; i < Math.min(bots.length, 2); i++) {
    const toy = new SpheroMini(bots[i].peripheral, `player${i + 1}`)
    await toy.start()
    await toy.wake()
    await toy.configureCollisionDetection(50, 50)
    await toy.configureSensorStream()
    
    const player: Player = {
      toy,
      name: `Player ${i + 1}`,
      role: i === 0 ? "hider" : "seeker",
      speed: 0,
      heading: 0,
      position: { x: 0, y: 0 },
      isFound: false,
      lastPing: 0,
      gyroActivity: 0,
      accelerometerMagnitude: 0
    }
    
    players.push(player)
    
    // Set initial colors
    const color = player.role === "hider" ? COLORS.hider : COLORS.seeker
    await toy.setMainLedColor(color.r, color.g, color.b)
    
    // Sensor tracking for movement detection
    toy.on(Event.onSensor, (data: SensorData) => {
      if (data.locator?.position) {
        player.position = {
          x: data.locator.position.x,
          y: data.locator.position.y
        }
      }
      
      // Track movement intensity for hider detection
      if (data.gyro?.filtered) {
        player.gyroActivity = Math.sqrt(
          data.gyro.filtered.x ** 2 +
          data.gyro.filtered.y ** 2 +
          data.gyro.filtered.z ** 2
        )
      }
      
      if (data.accelerometer?.filtered) {
        player.accelerometerMagnitude = Math.sqrt(
          data.accelerometer.filtered.x ** 2 +
          data.accelerometer.filtered.y ** 2 +
          data.accelerometer.filtered.z ** 2
        )
      }
    })
    
    // Collision detection
    toy.on(Event.onCollision, async () => {
      if (player.role === "seeker") {
        const hider = players.find(p => p.role === "hider")
        if (hider && !hider.isFound) {
          const distance = Math.sqrt(
            (hider.position.x - player.position.x) ** 2 +
            (hider.position.y - player.position.y) ** 2
          )
          
          if (distance < DETECTION_RADIUS) {
            console.log(`\n🎯 FOUND! ${hider.name} was discovered!`)
            hider.isFound = true
            await hider.toy.setMainLedColor(COLORS.found.r, COLORS.found.g, COLORS.found.b)
          }
        }
      }
    })
  }

  let gamePhase: "hiding" | "seeking" | "ended" = "hiding"
  let isPaused = false
  let phaseStartTime = Date.now()
  const hider = players.find(p => p.role === "hider")!
  const seeker = players.find(p => p.role === "seeker")!

  // Sonar ping function for seeker
  const sonarPing = async () => {
    const now = Date.now()
    if (now - seeker.lastPing < PING_COOLDOWN) {
      console.log(`Ping cooldown: ${Math.ceil((PING_COOLDOWN - (now - seeker.lastPing)) / 1000)}s`)
      return
    }
    
    seeker.lastPing = now
    console.log("\n📡 SONAR PING!")
    
    // Flash seeker white
    await seeker.toy.setMainLedColor(COLORS.ping.r, COLORS.ping.g, COLORS.ping.b)
    await timeout(200)
    await seeker.toy.setMainLedColor(COLORS.seeker.r, COLORS.seeker.g, COLORS.seeker.b)
    
    // Calculate distance and give feedback
    const distance = Math.sqrt(
      (hider.position.x - seeker.position.x) ** 2 +
      (hider.position.y - seeker.position.y) ** 2
    )
    
    // Hider responds with intensity based on distance
    if (!hider.isFound) {
      const intensity = Math.max(0, 255 - distance * 2)
      await hider.toy.setMainLedColor(intensity, 0, 0)
      await timeout(500)
      await hider.toy.setMainLedColor(0, 0, 0) // Go dark again
      
      // Give seeker distance hints
      if (distance < 30) {
        console.log("🔥 VERY HOT! (< 30cm)")
      } else if (distance < 60) {
        console.log("🌡️ HOT! (< 60cm)")
      } else if (distance < 100) {
        console.log("☀️ Warm (< 100cm)")
      } else {
        console.log("❄️ Cold (> 100cm)")
      }
    }
  }

  // Motion detector for hider
  const checkMotion = () => {
    if (hider.gyroActivity > 100 || hider.accelerometerMagnitude > 50) {
      console.log("\n⚠️ MOTION DETECTED! Hider is moving!")
      // Brief flash to indicate detection
      hider.toy.setMainLedColor(50, 0, 0)
      setTimeout(() => {
        if (!hider.isFound) {
          hider.toy.setMainLedColor(0, 0, 0)
        }
      }, 100)
    }
  }

  // Keyboard controls
  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  stdin.on("keypress", async (ch, { name: key, ctrl, shift }) => {
    if (ctrl && key === "c") {
      for (const player of players) {
        await player.toy.sleep()
      }
      process.exit()
    }

    if (key === "space") {
      isPaused = !isPaused
      if (isPaused) {
        for (const player of players) {
          await player.toy.roll(0, 0, [])
        }
      }
    }

    // Hider controls (WASD) - only during hiding phase
    if (gamePhase === "hiding" && hider && !isPaused) {
      switch(key) {
        case "w": 
          hider.speed = Math.min(255, hider.speed + (shift ? 40 : 20))
          break
        case "s": 
          hider.speed = Math.max(0, hider.speed - (shift ? 40 : 20))
          break
        case "a": 
          hider.heading = (hider.heading - (shift ? 30 : 15) + 360) % 360
          break
        case "d": 
          hider.heading = (hider.heading + (shift ? 30 : 15)) % 360
          break
        case "q":
          hider.speed = 0
          break
      }
    }

    // Seeker controls - only during seeking phase
    if (gamePhase === "seeking" && seeker && !isPaused) {
      switch(key) {
        case "up": 
          seeker.speed = Math.min(255, seeker.speed + (shift ? 40 : 20))
          break
        case "down": 
          seeker.speed = Math.max(0, seeker.speed - (shift ? 40 : 20))
          break
        case "left": 
          seeker.heading = (seeker.heading - (shift ? 30 : 15) + 360) % 360
          break
        case "right": 
          seeker.heading = (seeker.heading + (shift ? 30 : 15)) % 360
          break
        case "return":
          seeker.speed = 0
          break
        case "p": // Ping
          await sonarPing()
          break
      }
    }
  })

  console.clear()
  console.log("🔍 CODE & SEEK!")
  console.log("\n📖 Rules:")
  console.log("1. Hider has 20 seconds to hide")
  console.log("2. Hider LED turns off when hiding phase ends")
  console.log("3. Seeker has 60 seconds to find the hider")
  console.log("4. Seeker can use SONAR PING (P key) every 3 seconds")
  console.log("5. Motion detector reveals hider movement!\n")

  await timeout(5000)

  // Hiding phase
  console.log("\n🙈 HIDING PHASE - Hider, find your spot!")
  console.log("Controls: W/S = Speed, A/D = Turn, Q = Stop")
  
  while (gamePhase === "hiding") {
    const elapsed = Date.now() - phaseStartTime
    
    if (elapsed > HIDE_TIME) {
      gamePhase = "seeking"
      phaseStartTime = Date.now()
      
      // Turn off hider's LED for stealth
      await hider.toy.setMainLedColor(0, 0, 0)
      await hider.toy.roll(0, 0, []) // Stop moving
      hider.speed = 0
      
      console.log("\n\n🔍 SEEKING PHASE - Seeker, find the hider!")
      console.log("Seeker Controls: Arrows = Move, P = Sonar Ping, Enter = Stop")
      await timeout(2000)
      continue
    }

    if (!isPaused) {
      // Hider movement
      hider.speed = Math.max(0, hider.speed - 2)
      await hider.toy.roll(Math.round(hider.speed), hider.heading, [])
    }

    // Display hiding status
    console.clear()
    console.log("🙈 HIDING PHASE")
    console.log(`Time remaining: ${Math.round((HIDE_TIME - elapsed) / 1000)}s`)
    console.log(isPaused ? "⏸️  PAUSED" : "▶️  HIDING")
    console.log(`\nHider speed: ${Math.round(hider.speed)}`)
    console.log(`Hider heading: ${hider.heading}°`)
    console.log(`Position: (${Math.round(hider.position.x)}, ${Math.round(hider.position.y)})`)

    await timeout(50)
  }

  // Seeking phase
  while (gamePhase === "seeking") {
    const elapsed = Date.now() - phaseStartTime
    
    if (elapsed > SEEK_TIME || hider.isFound) {
      gamePhase = "ended"
      break
    }

    if (!isPaused) {
      // Seeker movement
      seeker.speed = Math.max(0, seeker.speed - 2)
      await seeker.toy.roll(Math.round(seeker.speed), seeker.heading, [])
      
      // Check for motion from hider
      checkMotion()
      
      // Check if seeker is close
      const distance = Math.sqrt(
        (hider.position.x - seeker.position.x) ** 2 +
        (hider.position.y - seeker.position.y) ** 2
      )
      
      if (distance < DETECTION_RADIUS && !hider.isFound) {
        console.log(`\n🎯 FOUND BY PROXIMITY!`)
        hider.isFound = true
        await hider.toy.setMainLedColor(COLORS.found.r, COLORS.found.g, COLORS.found.b)
      }
    }

    // Display seeking status
    console.clear()
    console.log("🔍 SEEKING PHASE")
    console.log(`Time remaining: ${Math.round((SEEK_TIME - elapsed) / 1000)}s`)
    console.log(isPaused ? "⏸️  PAUSED" : "▶️  SEEKING")
    
    const pingCooldown = Math.max(0, PING_COOLDOWN - (Date.now() - seeker.lastPing))
    console.log(`\n📡 Sonar Ping ready: ${pingCooldown === 0 ? "READY!" : `${Math.ceil(pingCooldown / 1000)}s`}`)
    console.log(`Seeker speed: ${Math.round(seeker.speed)}`)
    console.log(`Seeker heading: ${seeker.heading}°`)
    
    if (hider.gyroActivity > 50) {
      console.log("\n⚠️ Motion detected nearby!")
    }

    await timeout(50)
  }

  // Game over
  console.log("\n🏁 GAME OVER!")
  
  if (hider.isFound) {
    console.log(`\n🏆 SEEKER WINS! Found the hider!`)
    // Victory dance for seeker
    for (let i = 0; i < 10; i++) {
      await seeker.toy.setMainLedColor(
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255
      )
      await seeker.toy.roll(100, Math.random() * 360, [])
      await timeout(200)
    }
  } else {
    console.log(`\n🏆 HIDER WINS! Stayed hidden!`)
    // Victory flash for hider
    for (let i = 0; i < 10; i++) {
      await hider.toy.setMainLedColor(0, 255, 0)
      await timeout(200)
      await hider.toy.setMainLedColor(0, 0, 0)
      await timeout(200)
    }
  }

  await timeout(3000)
  
  for (const player of players) {
    await player.toy.sleep()
  }
  
  process.exit()
}

main()