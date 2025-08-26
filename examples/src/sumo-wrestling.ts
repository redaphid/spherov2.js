import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, Utils, SensorData } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Player {
  toy: SpheroMini
  name: string
  score: number
  speed: number
  heading: number
  position: { x: number, y: number }
  pushPower: number
  isOutOfRing: boolean
  color: { r: number, g: number, b: number }
  lastSensorData?: SensorData
}

const RING_RADIUS = 100 // Virtual ring radius in cm
const PUSH_FORCE_MULTIPLIER = 1.5
const MATCH_TIME = 45000 // 45 second matches
const ROUNDS = 3

const COLORS = {
  player1: { r: 255, g: 0, b: 100 }, // Pink
  player2: { r: 0, g: 100, b: 255 }, // Cyan
  charging: { r: 255, g: 255, b: 0 }, // Yellow
  outOfRing: { r: 255, g: 0, b: 0 }, // Red flash
  winner: { r: 0, g: 255, b: 0 } // Green
}

const main = async () => {
  console.log("🤼 SUMO WRESTLING - Push Your Opponent Out!")
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
    await toy.configureCollisionDetection(40, 40)
    await toy.configureSensorStream()
    
    const playerColor = i === 0 ? COLORS.player1 : COLORS.player2
    
    const player: Player = {
      toy,
      name: `Player ${i + 1}`,
      score: 0,
      speed: 0,
      heading: i === 0 ? 90 : 270, // Face each other
      position: { x: i === 0 ? -50 : 50, y: 0 }, // Start on opposite sides
      pushPower: 0,
      isOutOfRing: false,
      color: playerColor
    }
    
    players.push(player)
    await toy.setMainLedColor(playerColor.r, playerColor.g, playerColor.b)
    
    // Track position with sensors
    toy.on(Event.onSensor, (data: SensorData) => {
      player.lastSensorData = data
      if (data.locator?.position) {
        player.position = {
          x: data.locator.position.x,
          y: data.locator.position.y
        }
        
        // Check if out of ring
        const distance = Math.sqrt(player.position.x ** 2 + player.position.y ** 2)
        if (distance > RING_RADIUS && !player.isOutOfRing) {
          player.isOutOfRing = true
          ringOut(player, players.find(p => p !== player)!)
        }
      }
    })
    
    // Collision handler - apply push physics
    toy.on(Event.onCollision, async () => {
      const otherPlayer = players.find(p => p !== player)
      if (!otherPlayer) return
      
      // Calculate push force based on speeds
      const pushForce = (player.speed + 50) * PUSH_FORCE_MULTIPLIER
      
      // Flash charging color
      await player.toy.setMainLedColor(COLORS.charging.r, COLORS.charging.g, COLORS.charging.b)
      await timeout(100)
      await player.toy.setMainLedColor(player.color.r, player.color.g, player.color.b)
      
      // Apply pushback to other player
      const angle = Math.atan2(
        otherPlayer.position.y - player.position.y,
        otherPlayer.position.x - player.position.x
      ) * 180 / Math.PI
      
      otherPlayer.heading = angle
      otherPlayer.speed = Math.min(255, pushForce)
      player.pushPower++
    })
  }

  let currentRound = 1
  let gameRunning = true
  let isPaused = false
  let roundStartTime = Date.now()

  const ringOut = async (loser: Player, winner: Player) => {
    console.log(`\n💥 ${loser.name} was pushed out! Point to ${winner.name}!`)
    winner.score++
    
    // Flash animation
    for (let i = 0; i < 5; i++) {
      await loser.toy.setMainLedColor(COLORS.outOfRing.r, COLORS.outOfRing.g, COLORS.outOfRing.b)
      await timeout(100)
      await loser.toy.setMainLedColor(0, 0, 0)
      await timeout(100)
    }
    
    // Reset positions
    await resetRound()
  }

  const resetRound = async () => {
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      player.position = { x: i === 0 ? -50 : 50, y: 0 }
      player.heading = i === 0 ? 90 : 270
      player.speed = 0
      player.isOutOfRing = false
      player.pushPower = 0
      await player.toy.roll(0, 0, [])
      await player.toy.setMainLedColor(player.color.r, player.color.g, player.color.b)
    }
    
    currentRound++
    roundStartTime = Date.now()
    
    if (currentRound > ROUNDS) {
      await endGame()
    }
  }

  const endGame = async () => {
    gameRunning = false
    const winner = players.reduce((prev, curr) => prev.score > curr.score ? prev : curr)
    
    console.log("\n🏆 GAME OVER!")
    console.log(`\n👑 ${winner.name} WINS with ${winner.score} points!`)
    
    // Victory dance
    for (let i = 0; i < 10; i++) {
      await winner.toy.setMainLedColor(
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255
      )
      await winner.toy.roll(100, Math.random() * 360, [])
      await timeout(200)
    }
    
    for (const player of players) {
      await player.toy.sleep()
    }
    
    process.exit()
  }

  // Keyboard controls
  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  stdin.on("keypress", async (ch, { name: key, ctrl, shift }) => {
    if (ctrl && key === "c") {
      await endGame()
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
        case "q": // Charge push
          p1.speed = 0
          p1.toy.setMainLedColor(COLORS.charging.r, COLORS.charging.g, COLORS.charging.b)
          setTimeout(() => {
            p1.speed = 255
            p1.toy.setMainLedColor(p1.color.r, p1.color.g, p1.color.b)
          }, 500)
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
        case "return": // Charge push
          p2.speed = 0
          p2.toy.setMainLedColor(COLORS.charging.r, COLORS.charging.g, COLORS.charging.b)
          setTimeout(() => {
            p2.speed = 255
            p2.toy.setMainLedColor(p2.color.r, p2.color.g, p2.color.b)
          }, 500)
          break
      }
    }
  })

  console.clear()
  console.log("🤼 SUMO WRESTLING STARTED!")
  console.log("\nObjective: Push your opponent out of the ring!")
  console.log("\nControls:")
  console.log("Player 1 (Pink): W/S = Speed, A/D = Turn, Q = Charge Push")
  console.log("Player 2 (Cyan): ↑/↓ = Speed, ←/→ = Turn, Enter = Charge Push")
  console.log("Hold Shift for stronger moves | Space = Pause | Ctrl+C = Exit\n")

  await timeout(3000) // Give time to read instructions

  // Game loop
  while (gameRunning && currentRound <= ROUNDS) {
    const elapsed = Date.now() - roundStartTime
    
    if (elapsed > MATCH_TIME) {
      await resetRound()
      continue
    }

    if (!isPaused) {
      for (const player of players) {
        // Apply friction
        player.speed = Math.max(0, player.speed - 2)
        
        // Move the sphero
        await player.toy.roll(Math.round(player.speed), player.heading, [])
        
        // Simple boundary detection without sensor (backup)
        if (!player.lastSensorData) {
          // Estimate position based on movement
          const rad = player.heading * Math.PI / 180
          player.position.x += Math.cos(rad) * player.speed * 0.01
          player.position.y += Math.sin(rad) * player.speed * 0.01
          
          const distance = Math.sqrt(player.position.x ** 2 + player.position.y ** 2)
          if (distance > RING_RADIUS && !player.isOutOfRing) {
            player.isOutOfRing = true
            await ringOut(player, players.find(p => p !== player)!)
          }
        }
      }
    }

    // Display game state
    console.clear()
    console.log(`🤼 SUMO WRESTLING - Round ${currentRound}/${ROUNDS}`)
    console.log(`Time: ${Math.round((MATCH_TIME - elapsed) / 1000)}s`)
    console.log(isPaused ? "⏸️  PAUSED" : "▶️  FIGHTING")
    console.log(`\nRing Boundary: ${RING_RADIUS}cm`)
    console.log("\n📊 Score:")
    
    for (const player of players) {
      const distance = Math.sqrt(player.position.x ** 2 + player.position.y ** 2)
      const dangerLevel = distance > RING_RADIUS * 0.8 ? "⚠️ DANGER!" : ""
      console.log(`${player.name}: ${player.score} pts | Distance: ${Math.round(distance)}cm ${dangerLevel}`)
      console.log(`  Speed: ${Math.round(player.speed)} | Push Power: ${player.pushPower}`)
    }
    
    console.log("\n💪 Controls: P1(WASD+Q) | P2(Arrows+Enter)")

    await timeout(50)
  }

  await endGame()
}

main()