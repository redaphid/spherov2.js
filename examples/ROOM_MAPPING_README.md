# Sphero Room Mapping Tools

A suite of tools for mapping rooms using Sphero robots with collision detection and sensor fusion.

## Files

- `room-mapper.ts` - Main room mapping program with intelligent collision handling
- `sensor-stats.ts` - Gather sensor statistics to calibrate thresholds  
- `map-to-svg.ts` - Convert JSON room maps to SVG visualizations

## Usage

### 1. Calibrate Sensors (Optional but recommended)

First, gather sensor statistics to understand your Sphero's sensor ranges:

```bash
npx ts-node src/sensor-stats.ts
```

This will run for 30 seconds and test different movement patterns. The output `sensor_stats_*.json` contains recommended thresholds.

### 2. Map the Room

Run the room mapper:

```bash
npx ts-node src/room-mapper.ts
```

The Sphero will:
- Map for 90 seconds
- Use sensor fusion for collision detection
- Accelerate away from collisions
- Detect when stuck and change direction
- Save data to `room_map_*.json`

LED Colors:
- 🔵 Blue - Calibrating sensors (2 seconds)
- 🔴 Red - Active mapping
- 🟡 Yellow - Collision detected
- 🟠 Orange - Stuck, changing direction
- 🟢 Green - Mapping complete

### 3. Generate SVG Visualization

Convert the JSON map to an SVG:

```bash
npx ts-node src/map-to-svg.ts room_map_1234567890.json
```

This creates an SVG file with:
- Path traces (blue/green lines)
- Collision points (red/orange dots)
- Inferred walls (black lines)
- Grid for scale reference
- Legend and statistics

## How It Works

### Collision Detection
- **Built-in**: Uses Sphero's hardware collision detection
- **Sensor-based**: Monitors accelerometer and gyroscope for impacts
- Dynamic threshold calibration during first 2 seconds

### Stuck Detection
- Monitors position changes every second
- If movement < 20 units for 2 seconds, changes to random heading
- Accelerates to break free from corners

### Optimal Heading Calculation
After collision, the new heading is calculated based on:
- Pitch and roll angles (detect slopes)
- Accelerometer impact vector
- Reflection angle with randomness to avoid loops

## JSON Output Format

```json
{
  "collisions": [
    {
      "position": { "x": 100, "y": 200, "timestamp": 1234567890 },
      "heading": 45,
      "strength": 1,
      "sensorData": { ... },
      "detectionMethod": "sensor-based"
    }
  ],
  "path": [
    { "x": 0, "y": 0, "timestamp": 1234567890 }
  ],
  "boundary": {
    "minX": -500,
    "maxX": 500,
    "minY": -300,
    "maxY": 300
  },
  "metadata": {
    "mappingDuration": 90000,
    "totalCollisions": 15,
    "sensorBasedCollisions": 8,
    "builtInCollisions": 7
  }
}
```

## Tips

1. **Clear the area**: Remove small obstacles that might confuse mapping
2. **Flat surface**: Works best on hard, flat floors
3. **Multiple runs**: Run multiple times and combine data for better accuracy
4. **Adjust thresholds**: Use sensor-stats to find optimal values for your environment
5. **Battery level**: Ensure Sphero is well-charged for consistent movement

## Troubleshooting

- **"No handler for collision"**: The collision event is being detected but the handler is working correctly
- **Stuck in corners**: The stuck detection should kick in after 2 seconds
- **Not detecting collisions**: Try adjusting the collision thresholds in the code
- **SVG too large/small**: Adjust the `targetSize` in map-to-svg.ts