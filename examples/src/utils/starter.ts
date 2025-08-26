import { Scanner, Core, SpheroMini } from "../../../lib"
import { getUniqueColor, flashIdentification } from "./colors"

const robotName = process.env.ROBOT_NAME || undefined
const robotRegistry = {
  c75d2e4ee665d78e80853548bacfac01: "bubble",
  bc6ce81a687119e1c81a56ef58d59dbd: "gum",
  "51793e7efff60a87d3ec5f269b70bd6c": "halfling",
}

export const starter = async <T extends Core>(fn: (sphero: T) => void) => {
  const findAndStart = async () => {
    const spheros = await Scanner.findAll(SpheroMini.advertisement)
    for (const sphero of spheros) {
      const name = robotRegistry[sphero.id] || sphero.id
      console.log(`found: ${name}`)

      if (!robotName || sphero.id === robotName || robotRegistry[sphero.id] === robotName || 
          (robotName.endsWith("*") && sphero.id.startsWith(robotName.slice(0, -1)))) {
        
        // Start the sphero connection first
        await sphero.start()
        console.log(`Connected to ${name}`)
        
        // Generate unique color based on the sphero's ID
        const uniqueColor = getUniqueColor(sphero.id)
        console.log(`Assigning color RGB(${uniqueColor.r}, ${uniqueColor.g}, ${uniqueColor.b}) to ${name}`)
        
        // Flash the unique color twice to identify the ball
        await flashIdentification(sphero, uniqueColor, 2)
        console.log(`${name} identified with its unique color`)
        
        return fn(sphero)
      }

      console.log("but not the one we're looking for")
    }
    console.log("rescanning")
    setTimeout(findAndStart, 100)
  }
  findAndStart()
}
