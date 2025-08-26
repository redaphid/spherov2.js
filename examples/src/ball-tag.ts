import { emitKeypressEvents } from "readline"
import { stdin } from "process"
import { Scanner, SpheroMini, Event, Utils } from "../../lib"

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

enum PlayerRole {
  CHASER = "chaser",
  RUNNER = "runner"
}

interface Player {
  toy: SpheroMini
  name: string
  role: PlayerRole
  score: number
  speed: number
  heading: number
  collisionCooldown: number
  lastTagTime: number
}

const COLORS = {
  chaser: { r: 255, g: 0, b: 0 }, // Red
  runner: { r: 0, g: 255, b: 0 }, // Green
  tagged: { r: 255, g: 255, b: 0 }, // Yellow flash
  neutral: { r: 255, g: 255, b: 255 } // White
}

const TAG_COOLDOWN = 3000 // 3 seconds between tags
const ROUND_TIME = 60000 // 1 minute rounds

const main = async () => {
  console.log("🎮 BALL TAG - Multiplayer Chase Game")
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
    
    const player: Player = {
      toy,
      name: `Player ${i + 1}`,
      role: i === 0 ? PlayerRole.CHASER : PlayerRole.RUNNER,
      score: 0,
      speed: 0,
      heading: 0,
      collisionCooldown: 0,
      lastTagTime: 0
    }
    
    players.push(player)
    
    // Set initial colors
    const color = player.role === PlayerRole.CHASER ? COLORS.chaser : COLORS.runner
    await toy.setMainLedColor(color.r, color.g, color.b)
    
    // Collision handler for each player
    toy.on(Event.onCollision, async () => {
      const now = Date.now()
      
      // Check if we can process a tag
      if (now - player.lastTagTime < TAG_COOLDOWN) return
      
      // Find the other player
      const otherPlayer = players.find(p => p !== player)
      if (!otherPlayer) return
      
      // If this player is the chaser, tag happened!
      if (player.role === PlayerRole.CHASER) {
        console.log(`\n🏷️ ${otherPlayer.name} was tagged by ${player.name}!`)
        player.score++
        
        // Flash tagged animation
        for (let i = 0; i < 3; i++) {
          await otherPlayer.toy.setMainLedColor(COLORS.tagged.r, COLORS.tagged.g, COLORS.tagged.b)
          await timeout(100)
          await otherPlayer.toy.setMainLedColor(0, 0, 0)
          await timeout(100)
        }
        
        // Swap roles
        player.role = PlayerRole.RUNNER
        otherPlayer.role = PlayerRole.CHASER
        player.lastTagTime = now
        otherPlayer.lastTagTime = now
        
        // Update colors
        await player.toy.setMainLedColor(COLORS.runner.r, COLORS.runner.g, COLORS.runner.b)
        await otherPlayer.toy.setMainLedColor(COLORS.chaser.r, COLORS.chaser.g, COLORS.chaser.b)
      }
    })
  }

  let gameRunning = true
  let isPaused = false
  const startTime = Date.now()

  // Keyboard controls
  if (stdin.setRawMode) stdin.setRawMode(true)
  emitKeypressEvents(stdin)

  stdin.on("keypress", async (ch, { name: key, ctrl }) => {
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
    if (players[0]) {
      const p1 = players[0]
      switch(key) {
        case "w": p1.speed = Math.min(255, p1.speed + 20); break
        case "s": p1.speed = Math.max(0, p1.speed - 20); break
        case "a": p1.heading = (p1.heading - 15 + 360) % 360; break
        case "d": p1.heading = (p1.heading + 15) % 360; break
        case "q": p1.speed = 0; break
      }
    }

    // Player 2 controls (Arrow keys)
    if (players[1]) {
      const p2 = players[1]
      switch(key) {
        case "up": p2.speed = Math.min(255, p2.speed + 20); break
        case "down": p2.speed = Math.max(0, p2.speed - 20); break
        case "left": p2.heading = (p2.heading - 15 + 360) % 360; break
        case "right": p2.heading = (p2.heading + 15) % 360; break
        case "return": p2.speed = 0; break
      }
    }
  })

  console.clear()
  console.log("🎮 BALL TAG STARTED!")
  console.log("\nControls:")
  console.log("Player 1 (WASD): W/S = Speed, A/D = Turn, Q = Stop")
  console.log("Player 2 (Arrows): ↑/↓ = Speed, ←/→ = Turn, Enter = Stop")
  console.log("Space = Pause, Ctrl+C = Exit\n")

  // Game loop
  while (gameRunning) {
    const elapsed = Date.now() - startTime
    
    if (elapsed > ROUND_TIME) {
      console.log("\n⏰ TIME'S UP!")
      break
    }

    if (!isPaused) {
      // Update each player's movement
      for (const player of players) {
        // Add some speed decay
        player.speed = Math.max(0, player.speed - 1)
        
        // Chaser gets a slight speed boost
        const speedBoost = player.role === PlayerRole.CHASER ? 1.1 : 1.0
        const finalSpeed = Math.min(255, player.speed * speedBoost)
        
        await player.toy.roll(Math.round(finalSpeed), player.heading, [])
      }
    }

    // Display game state
    console.clear()
    console.log("🎮 BALL TAG")
    console.log(`Time: ${Math.round((ROUND_TIME - elapsed) / 1000)}s`)
    console.log(isPaused ? "⏸️  PAUSED" : "▶️  RUNNING")
    console.log("\n📊 Score:")
    
    for (const player of players) {
      const roleIcon = player.role === PlayerRole.CHASER ? "🔴" : "🟢"
      console.log(`${roleIcon} ${player.name}: ${player.score} tags | Speed: ${Math.round(player.speed)} | Heading: ${player.heading}°`)
    }
    
    console.log("\nControls:")
    console.log("P1: WASD+Q | P2: Arrows+Enter | Space: Pause")

    await timeout(50)
  }

  // Game over
  console.log("\n🏁 GAME OVER!")
  console.log("\n🏆 Final Scores:")
  
  const winner = players.reduce((prev, curr) => prev.score > curr.score ? prev : curr)
  
  for (const player of players) {
    console.log(`${player.name}: ${player.score} tags ${player === winner ? "👑 WINNER!" : ""}`)
    await player.toy.setMainLedColor(0, 255, 255) // Cyan for end
  }

  await timeout(5000)
  
  for (const player of players) {
    await player.toy.sleep()
  }
  
  process.exit()
}

main()