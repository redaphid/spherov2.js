// Generate a unique color based on UUID/ID
export const getUniqueColor = (id: string): { r: number, g: number, b: number } => {
  // Hash the ID to get a number
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Generate color from hash
  // Use HSL to ensure vibrant, distinguishable colors
  const hue = Math.abs(hash % 360)
  const saturation = 0.7 + (Math.abs(hash >> 8) % 30) / 100 // 70-100%
  const lightness = 0.5 + (Math.abs(hash >> 16) % 20) / 100 // 50-70%
  
  // Convert HSL to RGB
  const a = saturation * Math.min(lightness, 1 - lightness)
  const f = (n: number, k = (n + hue / 30) % 12) => lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  }
}

// Flash the ball with its unique color
export const flashIdentification = async (toy: any, color: { r: number, g: number, b: number }, flashes: number = 2) => {
  for (let i = 0; i < flashes; i++) {
    await toy.setMainLedColor(color.r, color.g, color.b)
    await new Promise(resolve => setTimeout(resolve, 500))
    await toy.setMainLedColor(0, 0, 0)
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  // Set back to the unique color
  await toy.setMainLedColor(color.r, color.g, color.b)
}