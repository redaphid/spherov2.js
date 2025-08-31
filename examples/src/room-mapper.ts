import { RollableToy, Utils, Event, SensorData } from "../../lib"
import { starter } from "./utils/starter"
import * as fs from "fs"

interface Point {
  x: number
  y: number
  timestamp: number
}

interface Collision {
  position: Point
  heading: number
  strength: number
  sensorData?: {
    angles: {
      pitch: number
      roll: number
      yaw: number
    }
    accelerometer: {
      x: number
      y: number
      z: number
    }
    gyro: {
      x: number
      y: number
      z: number
    }
  }
  detectionMethod: 'built-in' | 'sensor-based'
}

interface RoomMap {
  collisions: Collision[]
  path: Point[]
  paths?: {
    locator?: Point[]
    accelerometer?: Point[]
    gyro?: Point[]
    combined?: Point[]
  }
  boundary: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

let currentX = 0
let currentY = 0
let currentHeading = 0
let lastCollisionTime = 0
let lastSensorUpdate = Date.now()
let lastSensorData: SensorData | null = null
let isHandlingCollision = false
let lastMovementCheck = Date.now()
let lastKnownPosition = { x: 0, y: 0 }
let stuckCounter = 0
const collisions: Collision[] = []
const path: Point[] = []

// Position tracking improvements
let initialPosition: { x: number, y: number } | null = null
let positionSamples: Array<{ x: number, y: number, timestamp: number }> = []
const PATH_SAMPLE_INTERVAL = 2000 // Record path point every 2 seconds
const MIN_DISTANCE_FOR_PATH = 50 // Minimum distance to record new path point
const POSITION_SAMPLE_SIZE = 10 // Number of samples to average
let lastRecordedPosition: { x: number, y: number } | null = null

// Track position using different methods
let accelerometerPosition = { x: 0, y: 0 }
let gyroPosition = { x: 0, y: 0 }
let lastVelocity = { x: 0, y: 0 }
let lastGyroTime = Date.now()

// Dynamic collision detection thresholds
let accelerometerBaseline = { x: 0, y: 0, z: 0 }
let accelerometerSamples: Array<{x: number, y: number, z: number}> = []
let collisionThreshold = 50 // Will be dynamically adjusted
let movementThreshold = 20 // Distance threshold for stuck detection

const roomMap: RoomMap = {
  collisions: [],
  path: [],
  paths: {
    locator: [],
    accelerometer: [],
    gyro: [],
    combined: []
  },
  boundary: {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0
  }
}

let isMapping = true
const mapDuration = 90000 // 1.5 minutes of mapping
const explorationSpeed = 200
const backupSpeed = 50

const updateBoundary = () => {
  roomMap.boundary.minX = Math.min(roomMap.boundary.minX, currentX)
  roomMap.boundary.maxX = Math.max(roomMap.boundary.maxX, currentX)
  roomMap.boundary.minY = Math.min(roomMap.boundary.minY, currentY)
  roomMap.boundary.maxY = Math.max(roomMap.boundary.maxY, currentY)
}

const calculateMagnitude = (x: number, y: number, z: number): number => {
  return Math.sqrt(x * x + y * y + z * z)
}

const calculateOptimalHeading = (sensorData: SensorData): number => {
  // Use the pitch and roll to determine the best escape angle
  // If we hit a wall at an angle, bounce off at the reflection angle
  const pitch = sensorData.angles.pitch
  const roll = sensorData.angles.roll
  const yaw = sensorData.angles.yaw
  
  // Calculate impact angle based on accelerometer data
  const accelX = sensorData.accelerometer.filtered.x
  const accelY = sensorData.accelerometer.filtered.y
  
  // Calculate the angle of impact
  let impactAngle = Math.atan2(accelY, accelX) * (180 / Math.PI)
  
  // Reflection angle: turn away from the impact
  // Add 180 degrees to go opposite direction, then add some randomness
  let newHeading = (currentHeading + 180 + (Math.random() * 90 - 45)) % 360
  
  // If we detect a slope (pitch or roll > 10 degrees), adjust heading more
  if (Math.abs(pitch) > 10 || Math.abs(roll) > 10) {
    // Turn more sharply away from slopes
    const slopeAdjustment = Math.max(Math.abs(pitch), Math.abs(roll)) * 2
    newHeading = (newHeading + slopeAdjustment) % 360
  }
  
  console.log(`  Impact analysis: pitch=${pitch.toFixed(1)}°, roll=${roll.toFixed(1)}°, yaw=${yaw.toFixed(1)}°`)
  console.log(`  Calculated optimal heading: ${newHeading.toFixed(0)}° (was ${currentHeading.toFixed(0)}°)`)
  
  return newHeading
}

const detectCollisionFromSensor = (data: SensorData): boolean => {
  // Calculate current accelerometer magnitude
  const magnitude = calculateMagnitude(
    data.accelerometer.filtered.x,
    data.accelerometer.filtered.y,
    data.accelerometer.filtered.z
  )
  
  // During initial calibration (first 2 seconds), collect baseline
  if (accelerometerSamples.length < 20) {
    accelerometerSamples.push({
      x: data.accelerometer.filtered.x,
      y: data.accelerometer.filtered.y,
      z: data.accelerometer.filtered.z
    })
    
    if (accelerometerSamples.length === 20) {
      // Calculate baseline as average
      const avgX = accelerometerSamples.reduce((sum, s) => sum + s.x, 0) / 20
      const avgY = accelerometerSamples.reduce((sum, s) => sum + s.y, 0) / 20
      const avgZ = accelerometerSamples.reduce((sum, s) => sum + s.z, 0) / 20
      accelerometerBaseline = { x: avgX, y: avgY, z: avgZ }
      
      // Set threshold as 3x the baseline magnitude
      const baselineMagnitude = calculateMagnitude(avgX, avgY, avgZ)
      collisionThreshold = baselineMagnitude * 3
      console.log(`Calibrated collision threshold: ${collisionThreshold.toFixed(1)}`)
    }
    return false
  }
  
  // Check if current magnitude exceeds threshold
  const baselineMagnitude = calculateMagnitude(
    accelerometerBaseline.x,
    accelerometerBaseline.y,
    accelerometerBaseline.z
  )
  
  const deviation = Math.abs(magnitude - baselineMagnitude)
  
  // Also check gyroscope for sudden rotations
  const gyroMagnitude = calculateMagnitude(
    data.gyro.filtered.x,
    data.gyro.filtered.y,
    data.gyro.filtered.z
  )
  
  // Collision if acceleration deviation is high OR gyro shows sudden rotation
  return deviation > collisionThreshold || gyroMagnitude > 100
}

const handleCollisionDetected = async (toy: RollableToy, detectionMethod: 'built-in' | 'sensor-based', strength?: number) => {
  const now = Date.now()
  
  // Debounce collisions
  if (now - lastCollisionTime < 1500 || isHandlingCollision) return
  
  isHandlingCollision = true
  lastCollisionTime = now
  
  // Calculate collision strength if not provided
  let collisionStrength = strength || 1
  if (!strength && lastSensorData) {
    // Calculate strength based on accelerometer magnitude
    const magnitude = calculateMagnitude(
      lastSensorData.accelerometer.filtered.x,
      lastSensorData.accelerometer.filtered.y,
      lastSensorData.accelerometer.filtered.z
    )
    const baselineMagnitude = calculateMagnitude(
      accelerometerBaseline.x,
      accelerometerBaseline.y,
      accelerometerBaseline.z
    )
    // Normalize strength (0-10 scale)
    collisionStrength = Math.min(10, Math.max(1, (magnitude / baselineMagnitude) - 1))
  }
  
  const collision: Collision = {
    position: {
      x: currentX,
      y: currentY,
      timestamp: now
    },
    heading: currentHeading,
    strength: collisionStrength,
    detectionMethod
  }
  
  // Add sensor data if available
  if (lastSensorData) {
    collision.sensorData = {
      angles: {
        pitch: lastSensorData.angles.pitch,
        roll: lastSensorData.angles.roll,
        yaw: lastSensorData.angles.yaw
      },
      accelerometer: {
        x: lastSensorData.accelerometer.filtered.x,
        y: lastSensorData.accelerometer.filtered.y,
        z: lastSensorData.accelerometer.filtered.z
      },
      gyro: {
        x: lastSensorData.gyro.filtered.x,
        y: lastSensorData.gyro.filtered.y,
        z: lastSensorData.gyro.filtered.z
      }
    }
  }
  
  roomMap.collisions.push(collision)
  console.log(`\n🔴 Collision detected (${detectionMethod}) at (${collision.position.x.toFixed(0)}, ${collision.position.y.toFixed(0)}) - Strength: ${collisionStrength.toFixed(1)}`)
  
  // Calculate optimal escape heading using sensor data
  if (lastSensorData) {
    const optimalHeading = calculateOptimalHeading(lastSensorData)
    currentHeading = optimalHeading
  } else {
    // Fallback: random turn
    currentHeading = (currentHeading + 90 + Math.random() * 180) % 360
    console.log(`  No sensor data, turning to ${currentHeading.toFixed(0)}°`)
  }
  
  // Visual feedback
  await toy.setMainLedColor(255, 255, 0) // Yellow for collision
  
  // Stop immediately
  await toy.roll(0, 0, [])
  await Utils.wait(200)
  
  // Back up briefly
  const reverseHeading = (currentHeading + 180) % 360
  await toy.rollTime(backupSpeed, reverseHeading, 300, [])
  await Utils.wait(200)
  
  // Accelerate away in new direction
  console.log(`  Accelerating in new direction: ${currentHeading.toFixed(0)}°`)
  await toy.roll(255, currentHeading, []) // Full speed initially
  await Utils.wait(500)
  await toy.roll(explorationSpeed, currentHeading, []) // Then normal speed
  
  // Restore color
  await toy.setMainLedColor(255, 0, 0)
  
  isHandlingCollision = false
}

const saveMapData = () => {
  const outputFile = `room_map_${Date.now()}.json`
  
  const mapData = {
    ...roomMap,
    metadata: {
      mappingDuration: mapDuration,
      timestamp: Date.now(),
      collisionThreshold,
      totalCollisions: roomMap.collisions.length,
      sensorBasedCollisions: roomMap.collisions.filter(c => c.detectionMethod === 'sensor-based').length,
      builtInCollisions: roomMap.collisions.filter(c => c.detectionMethod === 'built-in').length
    }
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(mapData, null, 2))
  console.log(`\n📁 Map data saved to ${outputFile}`)
  
  console.log("\n=== Mapping Summary ===")
  console.log(`Total collisions: ${roomMap.collisions.length}`)
  console.log(`  - Built-in detection: ${mapData.metadata.builtInCollisions}`)
  console.log(`  - Sensor-based detection: ${mapData.metadata.sensorBasedCollisions}`)
  console.log(`Room boundary: X(${roomMap.boundary.minX.toFixed(0)} to ${roomMap.boundary.maxX.toFixed(0)}), Y(${roomMap.boundary.minY.toFixed(0)} to ${roomMap.boundary.maxY.toFixed(0)})`)
  console.log(`Total path points: ${roomMap.path.length}`)
}

const roomMapper = async (toy: RollableToy) => {
  console.log("🗺️  Starting intelligent room mapping with sensor fusion...")
  console.log("Calibrating sensors for 2 seconds...")
  
  // Set LED color to blue during calibration
  await toy.setMainLedColor(0, 0, 255)
  
  // Configure sensor stream first
  await toy.configureSensorStream()
  
  // Wait a moment for sensors to stabilize
  await Utils.wait(1000)
  
  // Configure collision detection
  await toy.configureCollisionDetection(50, 50, 50, 50, 10, 0x01)
  
  // Set up sensor data handler
  toy.on(Event.onSensor, (data: SensorData) => {
    lastSensorData = data
    
    // Initialize starting position on first sensor reading
    if (!initialPosition) {
      initialPosition = { x: data.locator.position.x, y: data.locator.position.y }
      currentX = 0  // Start at origin
      currentY = 0
      console.log(`📍 Initial sensor position: (${initialPosition.x.toFixed(0)}, ${initialPosition.y.toFixed(0)})`)
    } else {
      // Calculate relative position from start
      currentX = data.locator.position.x - initialPosition.x
      currentY = data.locator.position.y - initialPosition.y
    }
    
    // Add position sample for averaging
    const now = Date.now()
    positionSamples.push({ x: currentX, y: currentY, timestamp: now })
    
    // Keep only recent samples
    if (positionSamples.length > POSITION_SAMPLE_SIZE) {
      positionSamples = positionSamples.slice(-POSITION_SAMPLE_SIZE)
    }
    
    // Calculate averaged position if we have enough samples
    if (positionSamples.length >= 5) {
      const avgX = positionSamples.reduce((sum, s) => sum + s.x, 0) / positionSamples.length
      const avgY = positionSamples.reduce((sum, s) => sum + s.y, 0) / positionSamples.length
      currentX = avgX
      currentY = avgY
    }
    
    // Update accelerometer-based position (integrate acceleration)
    const dt = (now - lastGyroTime) / 1000 // Convert to seconds
    if (dt > 0 && dt < 1) { // Sanity check
      const accelX = data.accelerometer.filtered.x
      const accelY = data.accelerometer.filtered.y
      
      // Update velocity (v = v0 + a*t)
      lastVelocity.x += accelX * dt * 100 // Scale factor for visibility
      lastVelocity.y += accelY * dt * 100
      
      // Update position (x = x0 + v*t)
      accelerometerPosition.x += lastVelocity.x * dt
      accelerometerPosition.y += lastVelocity.y * dt
      
      // Update gyro-based position (use heading and assumed velocity)
      const headingRad = currentHeading * Math.PI / 180
      const assumedSpeed = 50 // Assume constant speed when moving
      gyroPosition.x += Math.cos(headingRad) * assumedSpeed * dt
      gyroPosition.y += Math.sin(headingRad) * assumedSpeed * dt
    }
    lastGyroTime = now
    
    // Check for collision using sensor data
    if (!isHandlingCollision && detectCollisionFromSensor(data)) {
      handleCollisionDetected(toy, 'sensor-based')
    }
    
    // Check if stuck (not moving enough)
    if (now - lastMovementCheck > 1000 && !isHandlingCollision) {
      const distance = Math.sqrt(
        Math.pow(currentX - lastKnownPosition.x, 2) +
        Math.pow(currentY - lastKnownPosition.y, 2)
      )
      
      if (distance < movementThreshold) {
        stuckCounter++
        console.log(`⚠️  Low movement detected (${distance.toFixed(1)} units), stuck count: ${stuckCounter}`)
        
        if (stuckCounter >= 2) {
          // We're stuck - first flip 180 degrees, then add random offset
          currentHeading = (currentHeading + 180 + (Math.random() * 90 - 45)) % 360
          if (currentHeading < 0) currentHeading += 360
          console.log(`🔄 Stuck! Flipping heading to: ${currentHeading.toFixed(0)}°`)
          toy.setMainLedColor(255, 128, 0) // Orange for stuck
          
          // Accelerate at max speed to break free
          toy.roll(255, currentHeading, [])
          setTimeout(() => {
            // Keep high speed a bit longer when stuck
            toy.roll(255, currentHeading, [])
            setTimeout(() => {
              toy.roll(explorationSpeed, currentHeading, [])
              toy.setMainLedColor(255, 0, 0) // Back to red
            }, 1000)
          }, 1000)
          
          stuckCounter = 0
        }
      } else {
        stuckCounter = 0 // Reset if moving well
      }
      
      lastKnownPosition = { x: currentX, y: currentY }
      lastMovementCheck = now
    }
    
    // Record path point with intelligent sampling
    if (now - lastSensorUpdate > PATH_SAMPLE_INTERVAL) {
      // Only record if we've moved significantly from last recorded position
      if (!lastRecordedPosition || 
          Math.sqrt(
            Math.pow(currentX - lastRecordedPosition.x, 2) + 
            Math.pow(currentY - lastRecordedPosition.y, 2)
          ) > MIN_DISTANCE_FOR_PATH) {
        
        lastSensorUpdate = now
        lastRecordedPosition = { x: currentX, y: currentY }
        
        // Use averaged position for main path
        path.push({
          x: currentX,
          y: currentY,
          timestamp: now
        })
        
        // Record different sensor paths
        if (roomMap.paths) {
          roomMap.paths.locator?.push({
            x: currentX,
            y: currentY,
            timestamp: now
          })
          
          roomMap.paths.accelerometer?.push({
            x: accelerometerPosition.x,
            y: accelerometerPosition.y,
            timestamp: now
          })
          
          roomMap.paths.gyro?.push({
            x: gyroPosition.x,
            y: gyroPosition.y,
            timestamp: now
          })
          
          // Combined approach: weighted average
          const combinedX = currentX * 0.5 + accelerometerPosition.x * 0.25 + gyroPosition.x * 0.25
          const combinedY = currentY * 0.5 + accelerometerPosition.y * 0.25 + gyroPosition.y * 0.25
          roomMap.paths.combined?.push({
            x: combinedX,
            y: combinedY,
            timestamp: now
          })
        }
        
        updateBoundary()
        
        // Log less frequently
        if (path.length % 5 === 0) {
          console.log(`📍 Position recorded: (${currentX.toFixed(0)}, ${currentY.toFixed(0)}) - ${path.length} points`)
        }
      }
    }
  })
  
  // Set up built-in collision handler
  toy.on(Event.onCollision, () => {
    handleCollisionDetected(toy, 'built-in')
  })
  
  // Wait for calibration to complete
  await Utils.wait(2000)
  
  console.log("✅ Calibration complete, starting exploration...")
  
  // Set LED to red for active mapping
  await toy.setMainLedColor(255, 0, 0)
  
  // Map for specified duration
  setTimeout(async () => {
    console.log("\n⏱️  Stopping mapping...")
    isMapping = false
    
    await toy.roll(0, 0, [])
    await toy.setMainLedColor(0, 255, 0) // Green = done
    
    roomMap.path = path
    saveMapData()
    
    console.log("✅ Mapping complete!")
    process.exit(0)
  }, mapDuration)
  
  // Main exploration loop
  while (isMapping) {
    if (!isHandlingCollision) {
      // Move forward with current heading
      const moveTime = 3000 + Math.random() * 2000
      await toy.rollTime(explorationSpeed, currentHeading, moveTime, [])
      
      // Occasionally change direction for better coverage
      if (Math.random() < 0.15) {
        currentHeading = (currentHeading + (Math.random() * 60 - 30)) % 360
        if (currentHeading < 0) currentHeading += 360
        console.log(`↻ Adjusting heading to ${currentHeading.toFixed(0)}° at position (${currentX.toFixed(0)}, ${currentY.toFixed(0)})`)
      }
    }
    
    await Utils.wait(200)
  }
}

// Start using the starter utility
starter(roomMapper)