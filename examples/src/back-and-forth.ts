import { RollableToy, Utils } from "../../lib"
import { starter } from "./utils/starter"

const MOVE_TIME = 20000
const SPEED = 200
const WAIT_TIME = 50
export enum Event {
  onCollision = "onCollision",
  onSensor = "onSensor",
}

const backAndForth = async (toy: RollableToy) => {
  console.log("Starting back-and-forth movement...")
  const sensorStream = await toy.configureSensorStream()
  toy.on(Event.onSensor, (data) => {
    console.log("Sensor data:", data)
  })
  while (true) {
    try {
      // Move forward (0 degrees)
      console.log("Moving forward...")
      await toy.rollTime(SPEED, 0, MOVE_TIME, [])
      await Utils.wait(WAIT_TIME)
      logSensors(toy)
      // Move backward (180 degrees)
      console.log("Moving backward...")
      await toy.rollTime(SPEED, 180, MOVE_TIME, [])
      await Utils.wait(WAIT_TIME)

      // Move right (90 degrees)
      console.log("Moving right...")
      await toy.rollTime(SPEED, 90, MOVE_TIME, [])
      await Utils.wait(WAIT_TIME)

      // Move left (270 degrees)
      console.log("Moving left...")
      await toy.rollTime(SPEED, 270, MOVE_TIME, [])
      await Utils.wait(WAIT_TIME)
    } catch (error: any) {
      console.error(`Movement error: ${error?.message || error}`)
      console.log("Waiting 2 seconds before retry...")
      await Utils.wait(2000)
    }
  }
}
const logSensors = (toy: RollableToy) => {
  console.log()
}
starter(backAndForth)
