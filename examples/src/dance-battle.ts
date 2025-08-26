import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, Utils, SensorData } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface DanceMove {
  name: string
  pattern: Array<{ speed: number, heading: number, duration: number, color: { r: number, g: number, b: number } }>
  difficulty: number
}

interface Player {
  toy: SpheroMini
  name: string
  score: number
  currentMove?: DanceMove
  moveAccuracy: number
  combo: number
  gyroData: { x: number, y: number, z: number }
  accelerometerData: { x: number, y: number, z: number }
}

const DANCE_MOVES: DanceMove[] = [
  {
    name: "Spin",
    difficulty: 1,
    pattern: [
      { speed: 0, heading: 0, duration: 100, color: { r: 255, g: 0, b: 0 } },
      { speed: 100, heading: 90, duration: 250, color: { r: 255, g: 100, b: 0 } },
      { speed: 100, heading: 180, duration: 250, color: { r: 255, g: 255, b: 0 } },
      { speed: 100, heading: 270, duration: 250, color: { r: 0, g: 255, b: 0 } },
      { speed: 0, heading: 0, duration: 100, color: { r: 0, g: 0, b: 255 } }
    ]
  },
  {
    name: "Figure-8",
    difficulty: 2,
    pattern: [
      { speed: 150, heading: 45, duration: 500, color: { r: 255, g: 0, b: 255 } },
      { speed: 150, heading: 315, duration: 500, color: { r: 0, g: 255, b: 255 } },
      { speed: 150, heading: 135, duration: 500, color: { r: 255, g: 255, b: 0 } },
      { speed: 150, heading: 225, duration: 500, color: { r: 100, g: 255, b: 100 } }
    ]
  },
  {
    name: "Pulse",
    difficulty: 1,
    pattern: [
      { speed: 200, heading: 0, duration: 200, color: { r: 255, g: 255, b: 255 } },
      { speed: 0, heading: 0, duration: 200, color: { r: 0, g: 0, b: 0 } },
      { speed: 200, heading: 180, duration: 200, color: { r: 255, g: 255, b: 255 } },
      { speed: 0, heading: 0, duration: 200, color: { r: 0, g: 0, b: 0 } }
    ]
  },
  {
    name: "Zigzag",
    difficulty: 2,
    pattern: [
      { speed: 180, heading: 30, duration: 300, color: { r: 255, g: 0, b: 0 } },
      { speed: 180, heading: 330, duration: 300, color: { r: 0, g: 255, b: 0 } },
      { speed: 180, heading: 30, duration: 300, color: { r: 0, g: 0, b: 255 } },
      { speed: 180, heading: 330, duration: 300, color: { r: 255, g: 255, b: 0 } }
    ]
  },
  {
    name: "Shake",
    difficulty: 1,
    pattern: [
      { speed: 100, heading: 0, duration: 100, color: { r: 255, g: 0, b: 100 } },
      { speed: 100, heading: 180, duration: 100, color: { r: 100, g: 0, b: 255 } },
      { speed: 100, heading: 0, duration: 100, color: { r: 255, g: 0, b: 100 } },
      { speed: 100, heading: 180, duration: 100, color: { r: 100, g: 0, b: 255 } },
      { speed: 0, heading: 0, duration: 200, color: { r: 255, g: 255, b: 255 } }
    ]
  }
]

const BATTLE_TIME = 90000 // 90 seconds
const MOVE_DISPLAY_TIME = 3000 // 3 seconds to watch the move

const main = async () => {
  console.log("🕺 DANCE BATTLE - Copy the Moves!")
  console.log("Finding Sphero Minis...")

  const bots = await Scanner.findToys([SpheroMini.advertisement])
  
  if (bots.length < 2) {
    console.log("Need at least 2 Sphero Minis for Dance Battle!")
    process.exit()
  }

  const players: Player[] = []
  
  // Initialize players
  for (let i = 0; i < Math.min(bots.length, 2); i++) {
    const toy = new SpheroMini(bots[i].peripheral, `player${i + 1}`)
    await toy.start()
    await toy.wake()
    await toy.configureSensorStream()
    
    const player: Player = {
      toy,
      name: `Player ${i + 1}`,
      score: 0,
      moveAccuracy: 0,
      combo: 0,
      gyroData: { x: 0, y: 0, z: 0 },
      accelerometerData: { x: 0, y: 0, z: 0 }
    }
    
    players.push(player)
    
    // Track sensor data for move matching
    toy.on(Event.onSensor, (data: SensorData) => {
      if (data.gyro?.filtered) {
        player.gyroData = {
          x: data.gyro.filtered.x,
          y: data.gyro.filtered.y,
          z: data.gyro.filtered.z
        }
      }
      
      if (data.accelerometer?.filtered) {
        player.accelerometerData = {
          x: data.accelerometer.filtered.x,
          y: data.accelerometer.filtered.y,
          z: data.accelerometer.filtered.z
        }
      }
    })
  }

  let gameRunning = true
  let isPaused = false
  let currentRound = 0
  let gamePhase: "watching" | "performing" | "scoring" = "watching"
  let currentMove: DanceMove | null = null
  let phaseStartTime = Date.now()
  const gameStartTime = Date.now()

  // Execute a dance move
  const performMove = async (player: Player, move: DanceMove) => {
    for (const step of move.pattern) {
      await player.toy.setMainLedColor(step.color.r, step.color.g, step.color.b)
      await player.toy.roll(step.speed, step.heading, [])
      await timeout(step.duration)
    }
    await player.toy.roll(0, 0, [])
  }

  // Score player's attempt
  const scoreAttempt = (player: Player) => {
    if (!player.currentMove) return 0
    
    // Calculate accuracy based on gyro/accelerometer matching
    const gyroActivity = Math.sqrt(
      player.gyroData.x ** 2 +
      player.gyroData.y ** 2 +
      player.gyroData.z ** 2
    )
    
    const expectedActivity = player.currentMove.difficulty * 100
    const accuracy = Math.max(0, 100 - Math.abs(gyroActivity - expectedActivity) / 10)
    
    player.moveAccuracy = accuracy
    
    if (accuracy > 70) {
      player.combo++
      const points = Math.round(accuracy * player.currentMove.difficulty * (1 + player.combo * 0.1))
      player.score += points
      return points
    } else {
      player.combo = 0
      return 0
    }
  }

  // Keyboard controls
  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  let p1Speed = 0, p1Heading = 0
  let p2Speed = 0, p2Heading = 0

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

    // Only allow controls during performing phase
    if (gamePhase === "performing" && !isPaused) {
      // Player 1 controls (WASD)
      if (players[0]) {
        switch(key) {
          case "w": 
            p1Speed = Math.min(255, p1Speed + (shift ? 40 : 20))
            break
          case "s": 
            p1Speed = Math.max(0, p1Speed - (shift ? 40 : 20))
            break
          case "a": 
            p1Heading = (p1Heading - (shift ? 30 : 15) + 360) % 360
            break
          case "d": 
            p1Heading = (p1Heading + (shift ? 30 : 15)) % 360
            break
          case "q":
            p1Speed = 0
            break
        }
        players[0].toy.roll(p1Speed, p1Heading, [])
      }

      // Player 2 controls (Arrow keys)
      if (players[1]) {
        switch(key) {
          case "up": 
            p2Speed = Math.min(255, p2Speed + (shift ? 40 : 20))
            break
          case "down": 
            p2Speed = Math.max(0, p2Speed - (shift ? 40 : 20))
            break
          case "left": 
            p2Heading = (p2Heading - (shift ? 30 : 15) + 360) % 360
            break
          case "right": 
            p2Heading = (p2Heading + (shift ? 30 : 15)) % 360
            break
          case "return":
            p2Speed = 0
            break
        }
        players[1].toy.roll(p2Speed, p2Heading, [])
      }
    }
  })

  console.clear()
  console.log("🕺 DANCE BATTLE!")
  console.log("\n📖 Rules:")
  console.log("1. Watch the dance move demonstration")
  console.log("2. Copy the move when it's your turn")
  console.log("3. Get points for accuracy and combos")
  console.log("\nControls during performance:")
  console.log("Player 1: W/S = Speed, A/D = Turn, Q = Stop")
  console.log("Player 2: ↑/↓ = Speed, ←/→ = Turn, Enter = Stop")
  console.log("\nSpace = Pause | Ctrl+C = Exit")

  await timeout(5000)

  // Game loop
  while (gameRunning) {
    const gameElapsed = Date.now() - gameStartTime
    
    if (gameElapsed > BATTLE_TIME) {
      console.log("\n⏰ TIME'S UP!")
      break
    }

    const phaseElapsed = Date.now() - phaseStartTime

    // Phase management
    if (gamePhase === "watching") {
      if (!currentMove || phaseElapsed === 0) {
        // Pick a new move
        currentRound++
        currentMove = DANCE_MOVES[Math.floor(Math.random() * DANCE_MOVES.length)]
        console.log(`\n🎵 Round ${currentRound}: Learn the "${currentMove.name}" move!`)
        
        // Demonstrate the move
        for (const player of players) {
          player.currentMove = currentMove
          performMove(player, currentMove) // Non-blocking
        }
      }
      
      if (phaseElapsed > MOVE_DISPLAY_TIME) {
        gamePhase = "performing"
        phaseStartTime = Date.now()
        p1Speed = 0
        p1Heading = 0
        p2Speed = 0
        p2Heading = 0
        
        // Reset to neutral color
        for (const player of players) {
          await player.toy.setMainLedColor(100, 100, 100)
        }
        
        console.log("\n🎮 YOUR TURN! Copy the move!")
      }
    } else if (gamePhase === "performing") {
      if (phaseElapsed > MOVE_DISPLAY_TIME) {
        gamePhase = "scoring"
        phaseStartTime = Date.now()
        
        // Stop all movement
        for (const player of players) {
          await player.toy.roll(0, 0, [])
        }
      }
    } else if (gamePhase === "scoring") {
      if (phaseElapsed === 0) {
        // Calculate scores
        console.log("\n📊 Scoring...")
        for (const player of players) {
          const points = scoreAttempt(player)
          if (points > 0) {
            console.log(`${player.name}: +${points} pts! (${Math.round(player.moveAccuracy)}% accuracy, ${player.combo}x combo)`)
            // Success flash
            for (let i = 0; i < 3; i++) {
              await player.toy.setMainLedColor(0, 255, 0)
              await timeout(100)
              await player.toy.setMainLedColor(0, 0, 0)
              await timeout(100)
            }
          } else {
            console.log(`${player.name}: Miss! Combo broken`)
            // Fail flash
            await player.toy.setMainLedColor(255, 0, 0)
            await timeout(500)
          }
        }
      }
      
      if (phaseElapsed > 2000) {
        gamePhase = "watching"
        phaseStartTime = Date.now()
      }
    }

    // Display status
    if (!isPaused) {
      console.clear()
      console.log(`🕺 DANCE BATTLE - Round ${currentRound}`)
      console.log(`Time: ${Math.round((BATTLE_TIME - gameElapsed) / 1000)}s`)
      console.log(isPaused ? "⏸️  PAUSED" : "▶️  DANCING")
      
      if (gamePhase === "watching" && currentMove) {
        console.log(`\n👀 WATCH: "${currentMove.name}" (Difficulty: ${"⭐".repeat(currentMove.difficulty)})`)
      } else if (gamePhase === "performing") {
        console.log(`\n🎮 PERFORM! Time: ${Math.round((MOVE_DISPLAY_TIME - phaseElapsed) / 1000)}s`)
      } else if (gamePhase === "scoring") {
        console.log("\n📊 SCORING...")
      }
      
      console.log("\n🏆 Scores:")
      for (const player of players) {
        const comboStr = player.combo > 0 ? `🔥x${player.combo}` : ""
        console.log(`${player.name}: ${player.score} pts ${comboStr}`)
      }
    }

    await timeout(50)
  }

  // Game over
  console.log("\n🏁 GAME OVER!")
  console.log("\n🏆 Final Scores:")
  
  const winner = players.reduce((prev, curr) => prev.score > curr.score ? prev : curr)
  
  for (const player of players) {
    console.log(`${player.name}: ${player.score} points ${player === winner ? "👑 WINNER!" : ""}`)
  }

  // Victory dance
  console.log("\n🎉 Victory Dance!")
  for (let i = 0; i < 15; i++) {
    await winner.toy.setMainLedColor(
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255
    )
    await winner.toy.roll(150, Math.random() * 360, [])
    await timeout(200)
  }

  await timeout(3000)
  
  for (const player of players) {
    await player.toy.sleep()
  }
  
  process.exit()
}

main()