import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, Utils, SensorData } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Zone {
  x: number
  y: number
  radius: number
  owner?: Player
}

interface Player {
  toy: SpheroMini
  name: string
  team: "red" | "blue"
  score: number
  speed: number
  heading: number
  position: { x: number, y: number }
  hasFlag: boolean
  captureProgress: number
  homeBase: Zone
}

const FIELD_WIDTH = 200 // cm
const ZONE_RADIUS = 30 // cm
const CAPTURE_TIME = 3000 // 3 seconds to capture
const GAME_TIME = 120000 // 2 minutes

const COLORS = {
  red: { r: 255, g: 0, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  neutral: { r: 100, g: 100, b: 100 },
  capturing: { r: 255, g: 255, b: 0 },
  captured: { r: 0, g: 255, b: 0 },
  hasFlag: { r: 255, g: 0, b: 255 }
}

// Create capture zones
const zones: Zone[] = [
  { x: -75, y: 0, radius: ZONE_RADIUS }, // Left zone
  { x: 0, y: 0, radius: ZONE_RADIUS },   // Center zone
  { x: 75, y: 0, radius: ZONE_RADIUS }   // Right zone
]

const main = async () => {
  console.log("🚩 CAPTURE THE FLAG - Control the Zones!")
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
    await toy.configureCollisionDetection(45, 45)
    await toy.configureSensorStream()
    
    const team = i === 0 ? "red" : "blue"
    const homeX = i === 0 ? -100 : 100
    
    const player: Player = {
      toy,
      name: `Player ${i + 1}`,
      team,
      score: 0,
      speed: 0,
      heading: i === 0 ? 90 : 270,
      position: { x: homeX, y: 0 },
      hasFlag: false,
      captureProgress: 0,
      homeBase: { x: homeX, y: 0, radius: 20 }
    }
    
    players.push(player)
    const color = team === "red" ? COLORS.red : COLORS.blue
    await toy.setMainLedColor(color.r, color.g, color.b)
    
    // Track position
    toy.on(Event.onSensor, (data: SensorData) => {
      if (data.locator?.position) {
        player.position = {
          x: data.locator.position.x,
          y: data.locator.position.y
        }
      }
    })
    
    // Collision detection for flag stealing
    toy.on(Event.onCollision, async () => {
      const otherPlayer = players.find(p => p !== player)
      if (!otherPlayer) return
      
      // If other player has flag and we collide, steal it!
      if (otherPlayer.hasFlag && !player.hasFlag) {
        console.log(`\n🏴‍☠️ ${player.name} stole the flag from ${otherPlayer.name}!`)
        otherPlayer.hasFlag = false
        player.hasFlag = true
        
        // Update colors
        const otherColor = otherPlayer.team === "red" ? COLORS.red : COLORS.blue
        await otherPlayer.toy.setMainLedColor(otherColor.r, otherColor.g, otherColor.b)
        await player.toy.setMainLedColor(COLORS.hasFlag.r, COLORS.hasFlag.g, COLORS.hasFlag.b)
      }
    })
  }

  let gameRunning = true
  let isPaused = false
  const startTime = Date.now()
  let lastCaptureCheck = Date.now()

  // Zone capture logic
  const checkZoneCapture = async () => {
    const now = Date.now()
    const deltaTime = now - lastCaptureCheck
    lastCaptureCheck = now

    for (const zone of zones) {
      const playersInZone = players.filter(p => {
        const distance = Math.sqrt(
          (p.position.x - zone.x) ** 2 + 
          (p.position.y - zone.y) ** 2
        )
        return distance <= zone.radius
      })

      if (playersInZone.length === 1) {
        const player = playersInZone[0]
        
        // If zone is owned by other team or neutral
        if (zone.owner?.team !== player.team) {
          player.captureProgress += deltaTime
          
          if (player.captureProgress >= CAPTURE_TIME) {
            console.log(`\n🏁 ${player.name} captured a zone!`)
            zone.owner = player
            player.score += 10
            player.captureProgress = 0
            
            // Flash capture animation
            for (let i = 0; i < 3; i++) {
              await player.toy.setMainLedColor(COLORS.captured.r, COLORS.captured.g, COLORS.captured.b)
              await timeout(100)
              const teamColor = player.team === "red" ? COLORS.red : COLORS.blue
              await player.toy.setMainLedColor(teamColor.r, teamColor.g, teamColor.b)
              await timeout(100)
            }
          } else {
            // Show capturing progress
            const pulse = Math.sin(now * 0.01) * 0.5 + 0.5
            await player.toy.setMainLedColor(
              COLORS.capturing.r * pulse,
              COLORS.capturing.g * pulse,
              COLORS.capturing.b * pulse
            )
          }
        }
      } else if (playersInZone.length === 0) {
        // Reset capture progress if no one is in zone
        players.forEach(p => {
          if (p.captureProgress > 0) p.captureProgress = 0
        })
      }
    }

    // Check flag delivery
    for (const player of players) {
      if (player.hasFlag) {
        const distToBase = Math.sqrt(
          (player.position.x - player.homeBase.x) ** 2 +
          (player.position.y - player.homeBase.y) ** 2
        )
        
        if (distToBase <= player.homeBase.radius) {
          console.log(`\n🎯 ${player.name} delivered the flag! +25 points!`)
          player.score += 25
          player.hasFlag = false
          
          const teamColor = player.team === "red" ? COLORS.red : COLORS.blue
          await player.toy.setMainLedColor(teamColor.r, teamColor.g, teamColor.b)
        }
      }
    }

    // Passive zone scoring
    zones.forEach(zone => {
      if (zone.owner) {
        zone.owner.score += 0.1 // Continuous points for holding zones
      }
    })
  }

  // Keyboard controls
  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  stdin.on("keypress", async (ch, { name: key, ctrl, shift }) => {
    if (ctrl && key === "c") {
      gameRunning = false
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

    // Player 1 controls (WASD)
    if (players[0] && !isPaused) {
      const p1 = players[0]
      switch(key) {
        case "w": 
          p1.speed = Math.min(255, p1.speed + (shift ? 40 : 20))
          break
        case "s": 
          p1.speed = Math.max(0, p1.speed - (shift ? 40 : 20))
          break
        case "a": 
          p1.heading = (p1.heading - (shift ? 30 : 15) + 360) % 360
          break
        case "d": 
          p1.heading = (p1.heading + (shift ? 30 : 15)) % 360
          break
        case "q":
          p1.speed = 0
          break
      }
    }

    // Player 2 controls (Arrow keys)
    if (players[1] && !isPaused) {
      const p2 = players[1]
      switch(key) {
        case "up": 
          p2.speed = Math.min(255, p2.speed + (shift ? 40 : 20))
          break
        case "down": 
          p2.speed = Math.max(0, p2.speed - (shift ? 40 : 20))
          break
        case "left": 
          p2.heading = (p2.heading - (shift ? 30 : 15) + 360) % 360
          break
        case "right": 
          p2.heading = (p2.heading + (shift ? 30 : 15)) % 360
          break
        case "return":
          p2.speed = 0
          break
      }
    }
  })

  console.clear()
  console.log("🚩 CAPTURE THE FLAG!")
  console.log("\nObjectives:")
  console.log("1. Capture zones by staying in them for 3 seconds")
  console.log("2. Steal the flag by colliding with flag carrier")
  console.log("3. Return flag to your base for bonus points")
  console.log("\nControls:")
  console.log("Player 1 (Red): W/S = Speed, A/D = Turn, Q = Stop")
  console.log("Player 2 (Blue): ↑/↓ = Speed, ←/→ = Turn, Enter = Stop")
  console.log("Space = Pause | Ctrl+C = Exit\n")

  await timeout(5000) // Give time to read

  // Game loop
  while (gameRunning) {
    const elapsed = Date.now() - startTime
    
    if (elapsed > GAME_TIME) {
      console.log("\n⏰ TIME'S UP!")
      break
    }

    if (!isPaused) {
      // Update movement
      for (const player of players) {
        // Apply friction
        player.speed = Math.max(0, player.speed - 1)
        
        // Flag carriers move slower
        const speedPenalty = player.hasFlag ? 0.7 : 1.0
        const finalSpeed = Math.round(player.speed * speedPenalty)
        
        await player.toy.roll(finalSpeed, player.heading, [])
      }
      
      // Check zone captures
      await checkZoneCapture()
    }

    // Display game state
    console.clear()
    console.log("🚩 CAPTURE THE FLAG")
    console.log(`Time: ${Math.round((GAME_TIME - elapsed) / 1000)}s`)
    console.log(isPaused ? "⏸️  PAUSED" : "▶️  RUNNING")
    
    console.log("\n🗺️ Zone Control:")
    zones.forEach((zone, i) => {
      const owner = zone.owner ? `${zone.owner.team.toUpperCase()}` : "NEUTRAL"
      const icon = zone.owner?.team === "red" ? "🔴" : zone.owner?.team === "blue" ? "🔵" : "⚪"
      console.log(`Zone ${i + 1}: ${icon} ${owner}`)
    })
    
    console.log("\n📊 Score:")
    for (const player of players) {
      const teamIcon = player.team === "red" ? "🔴" : "🔵"
      const flagIcon = player.hasFlag ? "🚩" : ""
      const captureBar = player.captureProgress > 0 ? 
        `[${"|".repeat(Math.floor(player.captureProgress / 300))}${".".repeat(10 - Math.floor(player.captureProgress / 300))}]` : ""
      
      console.log(`${teamIcon} ${player.name}: ${Math.round(player.score)} pts ${flagIcon} ${captureBar}`)
    }

    await timeout(50)
  }

  // Game over
  console.log("\n🏁 GAME OVER!")
  console.log("\n🏆 Final Scores:")
  
  const winner = players.reduce((prev, curr) => prev.score > curr.score ? prev : curr)
  
  for (const player of players) {
    console.log(`${player.name} (${player.team}): ${Math.round(player.score)} points ${player === winner ? "👑 WINNER!" : ""}`)
  }

  // Victory animation
  for (let i = 0; i < 10; i++) {
    await winner.toy.setMainLedColor(
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255
    )
    await timeout(200)
  }

  await timeout(3000)
  
  for (const player of players) {
    await player.toy.sleep()
  }
  
  process.exit()
}

main()