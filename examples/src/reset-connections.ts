import { Scanner, SpheroMini } from "../../lib"

const resetConnections = async () => {
  console.log("Scanning for connected Spheros to reset...")
  const spheros = await Scanner.findAll(SpheroMini.advertisement)
  
  for (const sphero of spheros) {
    console.log(`Found: ${sphero.id}`)
    try {
      // Try to disconnect if already connected
      if (sphero.peripheral && sphero.peripheral.state === 'connected') {
        console.log(`Disconnecting ${sphero.id}...`)
        await new Promise((resolve, reject) => {
          sphero.peripheral.disconnect((error) => {
            if (error) reject(error)
            else resolve(undefined)
          })
        })
        console.log(`Disconnected ${sphero.id}`)
      }
    } catch (error) {
      console.log(`Could not disconnect ${sphero.id}: ${error}`)
    }
  }
  
  console.log("Reset complete. Wait a few seconds before running your game.")
  process.exit(0)
}

resetConnections()