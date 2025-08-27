import { RollableToy, Utils, Event, SensorData } from "../../lib"
import { starter } from "./utils/starter"
import * as fs from "fs"

interface SensorStats {
  accelerometer: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    avg: { x: number; y: number; z: number }
    samples: Array<{ x: number; y: number; z: number; timestamp: number }>
  }
  gyro: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    avg: { x: number; y: number; z: number }
    samples: Array<{ x: number; y: number; z: number; timestamp: number }>
  }
  angles: {
    min: { pitch: number; roll: number; yaw: number }
    max: { pitch: number; roll: number; yaw: number }
    avg: { pitch: number; roll: number; yaw: number }
    samples: Array<{ pitch: number; roll: number; yaw: number; timestamp: number }>
  }
  locator: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    samples: Array<{ x: number; y: number; timestamp: number }>
  }
  collisionMagnitudes: number[]
  movementThresholds: {
    stopped: number
    slow: number
    normal: number
    fast: number
  }
}

const stats: SensorStats = {
  accelerometer: {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
    avg: { x: 0, y: 0, z: 0 },
    samples: []
  },
  gyro: {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
    avg: { x: 0, y: 0, z: 0 },
    samples: []
  },
  angles: {
    min: { pitch: Infinity, roll: Infinity, yaw: Infinity },
    max: { pitch: -Infinity, roll: -Infinity, yaw: -Infinity },
    avg: { pitch: 0, roll: 0, yaw: 0 },
    samples: []
  },
  locator: {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    samples: []
  },
  collisionMagnitudes: [],
  movementThresholds: {
    stopped: 0,
    slow: 0,
    normal: 0,
    fast: 0
  }
}

let collisionDetected = false
let lastMovementCheck = Date.now()
let lastPosition = { x: 0, y: 0 }
let currentSpeed = 0
let currentHeading = 0

const calculateMagnitude = (x: number, y: number, z: number): number => {
  return Math.sqrt(x * x + y * y + z * z)
}

const updateStats = (data: SensorData) => {
  const timestamp = Date.now()
  
  // Update accelerometer stats
  const accel = data.accelerometer.filtered
  stats.accelerometer.min.x = Math.min(stats.accelerometer.min.x, accel.x)
  stats.accelerometer.min.y = Math.min(stats.accelerometer.min.y, accel.y)
  stats.accelerometer.min.z = Math.min(stats.accelerometer.min.z, accel.z)
  stats.accelerometer.max.x = Math.max(stats.accelerometer.max.x, accel.x)
  stats.accelerometer.max.y = Math.max(stats.accelerometer.max.y, accel.y)
  stats.accelerometer.max.z = Math.max(stats.accelerometer.max.z, accel.z)
  stats.accelerometer.samples.push({ ...accel, timestamp })
  
  // Update gyro stats
  const gyro = data.gyro.filtered
  stats.gyro.min.x = Math.min(stats.gyro.min.x, gyro.x)
  stats.gyro.min.y = Math.min(stats.gyro.min.y, gyro.y)
  stats.gyro.min.z = Math.min(stats.gyro.min.z, gyro.z)
  stats.gyro.max.x = Math.max(stats.gyro.max.x, gyro.x)
  stats.gyro.max.y = Math.max(stats.gyro.max.y, gyro.y)
  stats.gyro.max.z = Math.max(stats.gyro.max.z, gyro.z)
  stats.gyro.samples.push({ ...gyro, timestamp })
  
  // Update angles stats
  const angles = data.angles
  stats.angles.min.pitch = Math.min(stats.angles.min.pitch, angles.pitch)
  stats.angles.min.roll = Math.min(stats.angles.min.roll, angles.roll)
  stats.angles.min.yaw = Math.min(stats.angles.min.yaw, angles.yaw)
  stats.angles.max.pitch = Math.max(stats.angles.max.pitch, angles.pitch)
  stats.angles.max.roll = Math.max(stats.angles.max.roll, angles.roll)
  stats.angles.max.yaw = Math.max(stats.angles.max.yaw, angles.yaw)
  stats.angles.samples.push({ ...angles, timestamp })
  
  // Update locator stats
  const loc = data.locator.position
  stats.locator.minX = Math.min(stats.locator.minX, loc.x)
  stats.locator.maxX = Math.max(stats.locator.maxX, loc.x)
  stats.locator.minY = Math.min(stats.locator.minY, loc.y)
  stats.locator.maxY = Math.max(stats.locator.maxY, loc.y)
  stats.locator.samples.push({ ...loc, timestamp })
  
  // If collision detected, record magnitude
  if (collisionDetected) {
    const magnitude = calculateMagnitude(accel.x, accel.y, accel.z)
    stats.collisionMagnitudes.push(magnitude)
    collisionDetected = false
  }
}

const calculateThresholds = () => {
  if (stats.accelerometer.samples.length < 100) return
  
  // Calculate movement thresholds based on collected data
  const magnitudes = stats.accelerometer.samples.map(s => 
    calculateMagnitude(s.x, s.y, s.z)
  )
  
  magnitudes.sort((a, b) => a - b)
  
  // Use percentiles for thresholds
  stats.movementThresholds.stopped = magnitudes[Math.floor(magnitudes.length * 0.1)]
  stats.movementThresholds.slow = magnitudes[Math.floor(magnitudes.length * 0.3)]
  stats.movementThresholds.normal = magnitudes[Math.floor(magnitudes.length * 0.5)]
  stats.movementThresholds.fast = magnitudes[Math.floor(magnitudes.length * 0.8)]
}

const saveStats = () => {
  // Calculate averages
  if (stats.accelerometer.samples.length > 0) {
    const count = stats.accelerometer.samples.length
    stats.accelerometer.avg.x = stats.accelerometer.samples.reduce((sum, s) => sum + s.x, 0) / count
    stats.accelerometer.avg.y = stats.accelerometer.samples.reduce((sum, s) => sum + s.y, 0) / count
    stats.accelerometer.avg.z = stats.accelerometer.samples.reduce((sum, s) => sum + s.z, 0) / count
  }
  
  if (stats.gyro.samples.length > 0) {
    const count = stats.gyro.samples.length
    stats.gyro.avg.x = stats.gyro.samples.reduce((sum, s) => sum + s.x, 0) / count
    stats.gyro.avg.y = stats.gyro.samples.reduce((sum, s) => sum + s.y, 0) / count
    stats.gyro.avg.z = stats.gyro.samples.reduce((sum, s) => sum + s.z, 0) / count
  }
  
  if (stats.angles.samples.length > 0) {
    const count = stats.angles.samples.length
    stats.angles.avg.pitch = stats.angles.samples.reduce((sum, s) => sum + s.pitch, 0) / count
    stats.angles.avg.roll = stats.angles.samples.reduce((sum, s) => sum + s.roll, 0) / count
    stats.angles.avg.yaw = stats.angles.samples.reduce((sum, s) => sum + s.yaw, 0) / count
  }
  
  calculateThresholds()
  
  // Save to file
  const outputFile = `sensor_stats_${Date.now()}.json`
  
  // Create summary without all samples for readability
  const summary = {
    accelerometer: {
      min: stats.accelerometer.min,
      max: stats.accelerometer.max,
      avg: stats.accelerometer.avg,
      sampleCount: stats.accelerometer.samples.length
    },
    gyro: {
      min: stats.gyro.min,
      max: stats.gyro.max,
      avg: stats.gyro.avg,
      sampleCount: stats.gyro.samples.length
    },
    angles: {
      min: stats.angles.min,
      max: stats.angles.max,
      avg: stats.angles.avg,
      sampleCount: stats.angles.samples.length
    },
    locator: {
      minX: stats.locator.minX,
      maxX: stats.locator.maxX,
      minY: stats.locator.minY,
      maxY: stats.locator.maxY,
      sampleCount: stats.locator.samples.length
    },
    collisionMagnitudes: stats.collisionMagnitudes,
    movementThresholds: stats.movementThresholds,
    recommendations: {
      collisionThreshold: stats.collisionMagnitudes.length > 0 
        ? Math.min(...stats.collisionMagnitudes) * 0.8
        : stats.movementThresholds.fast * 1.5,
      stuckThreshold: stats.movementThresholds.slow,
      normalMovement: stats.movementThresholds.normal
    }
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2))
  console.log(`\n📊 Sensor statistics saved to ${outputFile}`)
  
  console.log("\n=== Sensor Statistics Summary ===")
  console.log(`Samples collected: ${stats.accelerometer.samples.length}`)
  console.log(`Collisions detected: ${stats.collisionMagnitudes.length}`)
  console.log("\nMovement Thresholds:")
  console.log(`  Stopped: ${stats.movementThresholds.stopped.toFixed(2)}`)
  console.log(`  Slow: ${stats.movementThresholds.slow.toFixed(2)}`)
  console.log(`  Normal: ${stats.movementThresholds.normal.toFixed(2)}`)
  console.log(`  Fast: ${stats.movementThresholds.fast.toFixed(2)}`)
  console.log("\nRecommended Settings:")
  console.log(`  Collision Threshold: ${summary.recommendations.collisionThreshold.toFixed(2)}`)
  console.log(`  Stuck Detection: ${summary.recommendations.stuckThreshold.toFixed(2)}`)
}

const gatherStats = async (toy: RollableToy) => {
  console.log("📊 Gathering sensor statistics for 30 seconds...")
  console.log("Move the Sphero around, make it collide, stop, and go fast!")
  
  // Configure sensors
  await toy.configureSensorStream()
  await toy.configureCollisionDetection()
  
  // Set up sensor handler
  toy.on(Event.onSensor, (data: SensorData) => {
    updateStats(data)
    
    // Check movement every second
    const now = Date.now()
    if (now - lastMovementCheck > 1000) {
      const distance = Math.sqrt(
        Math.pow(data.locator.position.x - lastPosition.x, 2) +
        Math.pow(data.locator.position.y - lastPosition.y, 2)
      )
      
      if (distance < 10) {
        console.log("⚠️  Low movement detected")
      }
      
      lastPosition = { x: data.locator.position.x, y: data.locator.position.y }
      lastMovementCheck = now
    }
  })
  
  // Set up collision handler
  toy.on(Event.onCollision, () => {
    collisionDetected = true
    console.log("💥 Collision detected!")
  })
  
  // Test various movements
  console.log("\n🚀 Phase 1: Normal movement (10s)")
  await toy.setMainLedColor(0, 255, 0)
  
  for (let i = 0; i < 5; i++) {
    currentHeading = Math.random() * 360
    currentSpeed = 50 + Math.random() * 100
    await toy.rollTime(currentSpeed, currentHeading, 2000, [])
    await Utils.wait(100)
  }
  
  console.log("\n⚡ Phase 2: Fast movement (10s)")
  await toy.setMainLedColor(255, 255, 0)
  
  for (let i = 0; i < 5; i++) {
    currentHeading = Math.random() * 360
    currentSpeed = 150 + Math.random() * 105
    await toy.rollTime(currentSpeed, currentHeading, 2000, [])
    await Utils.wait(100)
  }
  
  console.log("\n🛑 Phase 3: Stop and go (10s)")
  await toy.setMainLedColor(255, 0, 0)
  
  for (let i = 0; i < 5; i++) {
    await toy.roll(0, 0, [])
    await Utils.wait(1000)
    currentHeading = Math.random() * 360
    await toy.rollTime(200, currentHeading, 1000, [])
  }
  
  console.log("\n✅ Data collection complete!")
  
  // Stop and save
  await toy.roll(0, 0, [])
  await toy.setMainLedColor(0, 255, 255)
  
  saveStats()
  
  process.exit(0)
}

// Start stats gathering
starter(gatherStats)