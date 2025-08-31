#!/usr/bin/env node

import * as fs from "fs"
import * as path from "path"

interface Point {
  x: number
  y: number
  timestamp: number
}

interface Collision {
  position: Point
  heading: number
  strength: number
  detectionMethod?: 'built-in' | 'sensor-based'
}

interface RoomMap {
  collisions: Collision[]
  path: Point[] | Point[][]
  boundary: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  metadata?: any
}

const generateSVG = (mapData: RoomMap): string => {
  // First, find the actual bounds of the data (not just what's stored in boundary)
  let actualMinX = Infinity, actualMaxX = -Infinity
  let actualMinY = Infinity, actualMaxY = -Infinity
  
  // Check all collision points
  mapData.collisions.forEach(collision => {
    actualMinX = Math.min(actualMinX, collision.position.x)
    actualMaxX = Math.max(actualMaxX, collision.position.x)
    actualMinY = Math.min(actualMinY, collision.position.y)
    actualMaxY = Math.max(actualMaxY, collision.position.y)
  })
  
  // Check all path points
  const paths = Array.isArray(mapData.path) && mapData.path.length > 0
    ? (Array.isArray(mapData.path[0]) ? mapData.path : [mapData.path]) as Point[][]
    : []
  
  paths.forEach(pathPoints => {
    pathPoints.forEach(point => {
      actualMinX = Math.min(actualMinX, point.x)
      actualMaxX = Math.max(actualMaxX, point.x)
      actualMinY = Math.min(actualMinY, point.y)
      actualMaxY = Math.max(actualMaxY, point.y)
    })
  })
  
  // If no data found, use boundary values
  if (actualMinX === Infinity) {
    actualMinX = mapData.boundary.minX
    actualMaxX = mapData.boundary.maxX
    actualMinY = mapData.boundary.minY
    actualMaxY = mapData.boundary.maxY
  }
  
  console.log(`Actual data bounds: X(${actualMinX.toFixed(0)} to ${actualMaxX.toFixed(0)}), Y(${actualMinY.toFixed(0)} to ${actualMaxY.toFixed(0)})`)
  
  // Calculate actual data dimensions
  const dataWidth = actualMaxX - actualMinX
  const dataHeight = actualMaxY - actualMinY
  
  // Target SVG canvas size
  const canvasWidth = 1000  // Total width including legend
  const canvasHeight = 800   // Total height
  
  // Reserve space for legend on the right
  const legendWidth = 200
  const mapAreaWidth = canvasWidth - legendWidth
  const mapAreaHeight = canvasHeight
  
  // Add padding around the map
  const padding = 40
  const availableWidth = mapAreaWidth - (padding * 2)
  const availableHeight = mapAreaHeight - (padding * 2)
  
  // Calculate scale to fit data into available area
  const scaleX = availableWidth / dataWidth
  const scaleY = availableHeight / dataHeight
  const scale = Math.min(scaleX, scaleY) // Use the smaller scale to fit both dimensions
  
  const svgWidth = canvasWidth
  const svgHeight = canvasHeight
  
  // Center the map in the available area
  const scaledWidth = dataWidth * scale
  const scaledHeight = dataHeight * scale
  const offsetX = padding + (availableWidth - scaledWidth) / 2
  const offsetY = padding + (availableHeight - scaledHeight) / 2
  
  // Transform coordinates to SVG space (flip Y axis and apply offset)
  const transformX = (x: number): number => {
    return (x - actualMinX) * scale + offsetX
  }
  
  const transformY = (y: number): number => {
    // Flip Y axis for SVG coordinate system
    return svgHeight - offsetY - ((y - actualMinY) * scale)
  }
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
  
  <!-- Grid -->
  <g stroke="lightgray" stroke-width="0.5" opacity="0.5">`
  
  // Add grid lines
  const gridSize = 50 * scale
  for (let x = 0; x < svgWidth; x += gridSize) {
    svg += `\n    <line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}"/>`
  }
  for (let y = 0; y < svgHeight; y += gridSize) {
    svg += `\n    <line x1="0" y1="${y}" x2="${svgWidth}" y2="${y}"/>`
  }
  
  svg += `\n  </g>
  
  <!-- Path -->`
  
  // paths variable already declared above, just use it here
  
  paths.forEach((pathPoints, index) => {
    if (pathPoints.length > 0) {
      const pathColor = index === 0 ? "blue" : "green"
      const pathData = pathPoints
        .map((p, i) => {
          const x = transformX(p.x)
          const y = transformY(p.y)
          return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
        })
        .join(' ')
      
      svg += `
  <path d="${pathData}" stroke="${pathColor}" stroke-width="1" fill="none" opacity="0.5"/>`
    }
  })
  
  svg += `
  
  <!-- Collisions -->`
  
  // Draw collision points
  mapData.collisions.forEach((collision, i) => {
    const x = transformX(collision.position.x)
    const y = transformY(collision.position.y)
    const color = collision.detectionMethod === 'sensor-based' ? "#FF6600" : "#FF0000"
    
    // Draw collision point
    svg += `
  <circle cx="${x}" cy="${y}" r="5" fill="${color}" opacity="0.7">
    <title>Collision ${i + 1} at (${collision.position.x.toFixed(0)}, ${collision.position.y.toFixed(0)}), heading: ${collision.heading.toFixed(0)}°</title>
  </circle>`
    
    // Draw heading indicator
    const headingRad = (collision.heading * Math.PI) / 180
    const lineLength = 15 * scale
    const endX = x + Math.cos(headingRad) * lineLength
    const endY = y - Math.sin(headingRad) * lineLength // Negative because Y is flipped
    
    svg += `
  <line x1="${x}" y1="${y}" x2="${endX}" y2="${endY}" stroke="${color}" stroke-width="2" opacity="0.5"/>`
  })
  
  // Draw inferred walls from collision clusters
  const wallSegments = inferWalls(mapData.collisions)
  
  svg += `
  
  <!-- Inferred Walls -->`
  
  wallSegments.forEach(segment => {
    const x1 = transformX(segment.start.x)
    const y1 = transformY(segment.start.y)
    const x2 = transformX(segment.end.x)
    const y2 = transformY(segment.end.y)
    
    svg += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="3" opacity="0.3"/>`
  })
  
  // Add legend on the right side
  const legendX = mapAreaWidth + 20
  svg += `
  
  <!-- Legend -->
  <g transform="translate(${legendX}, 50)">
    <rect x="0" y="0" width="160" height="100" fill="white" stroke="black" stroke-width="1" opacity="0.9"/>
    <text x="10" y="20" font-size="14" font-weight="bold">Legend</text>
    <circle cx="20" cy="40" r="5" fill="blue" opacity="0.5"/>
    <text x="35" y="44" font-size="12">Path</text>
    <circle cx="20" cy="60" r="5" fill="red" opacity="0.7"/>
    <text x="35" y="64" font-size="12">Collision (built-in)</text>
    <circle cx="20" cy="80" r="5" fill="#FF6600" opacity="0.7"/>
    <text x="35" y="84" font-size="12">Collision (sensor)</text>
  </g>`
  
  // Add stats below legend
  if (mapData.metadata) {
    svg += `
  
  <!-- Statistics -->
  <g transform="translate(${legendX}, 170)">
    <rect x="0" y="0" width="160" height="100" fill="white" stroke="black" stroke-width="1" opacity="0.9"/>
    <text x="10" y="20" font-size="14" font-weight="bold">Statistics</text>
    <text x="10" y="40" font-size="11">Collisions: ${mapData.collisions.length}</text>
    <text x="10" y="55" font-size="11">Path points: ${paths.reduce((sum, p) => sum + p.length, 0)}</text>
    <text x="10" y="70" font-size="11">Duration: ${((mapData.metadata.mappingDuration || 0) / 1000).toFixed(0)}s</text>
    <text x="10" y="85" font-size="11">Area: ${dataWidth.toFixed(0)} × ${dataHeight.toFixed(0)}</text>
  </g>`
  }
  
  svg += `
</svg>`
  
  return svg
}

const inferWalls = (collisions: Collision[]): Array<{start: Point, end: Point}> => {
  const walls: Array<{start: Point, end: Point}> = []
  if (collisions.length < 2) return walls
  
  // Simple clustering: connect nearby collisions
  const threshold = 100 // Distance threshold for connecting collisions
  const processed = new Set<number>()
  
  for (let i = 0; i < collisions.length; i++) {
    if (processed.has(i)) continue
    
    const cluster: Collision[] = [collisions[i]]
    processed.add(i)
    
    // Find nearby collisions
    for (let j = i + 1; j < collisions.length; j++) {
      if (processed.has(j)) continue
      
      const distance = Math.sqrt(
        Math.pow(collisions[i].position.x - collisions[j].position.x, 2) +
        Math.pow(collisions[i].position.y - collisions[j].position.y, 2)
      )
      
      if (distance < threshold) {
        cluster.push(collisions[j])
        processed.add(j)
      }
    }
    
    // Create wall segment from cluster
    if (cluster.length >= 2) {
      // Sort by x coordinate
      cluster.sort((a, b) => a.position.x - b.position.x)
      
      // Create wall from first to last in cluster
      walls.push({
        start: cluster[0].position,
        end: cluster[cluster.length - 1].position
      })
    }
  }
  
  return walls
}

// Main CLI
const main = () => {
  const args = process.argv.slice(2)
  let inputFile: string
  
  if (args.length === 0) {
    // Find the most recent room-map JSON file
    const files = fs.readdirSync('.')
      .filter(f => f.startsWith('room-map-') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(f).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)
    
    if (files.length === 0) {
      console.error('No room-map JSON files found. Run room-mapper first.')
      console.error('Usage: yarn svg [json-file]')
      console.error('  If no file specified, uses the most recent room-map-*.json')
      process.exit(1)
    }
    
    inputFile = files[0].name
    console.log(`Using most recent file: ${inputFile}`)
  } else {
    inputFile = args[0]
  }
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File '${inputFile}' not found`)
    process.exit(1)
  }
  
  try {
    const jsonData = fs.readFileSync(inputFile, 'utf-8')
    const mapData: RoomMap = JSON.parse(jsonData)
    
    console.log(`📖 Reading room map from: ${inputFile}`)
    console.log(`  Collisions: ${mapData.collisions.length}`)
    console.log(`  Boundary: X(${mapData.boundary.minX.toFixed(0)} to ${mapData.boundary.maxX.toFixed(0)}), Y(${mapData.boundary.minY.toFixed(0)} to ${mapData.boundary.maxY.toFixed(0)})`)
    
    const svg = generateSVG(mapData)
    
    const outputFile = inputFile.replace('.json', '.svg')
    fs.writeFileSync(outputFile, svg)
    
    console.log(`✅ SVG generated: ${outputFile}`)
    console.log(`\nOpen in browser: file://${path.resolve(outputFile)}`)
    
  } catch (error) {
    console.error(`Error processing file: ${error}`)
    process.exit(1)
  }
}

main()