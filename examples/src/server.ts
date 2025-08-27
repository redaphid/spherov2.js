#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { WebSocketServer } from 'ws'
import { Scanner, SpheroMini, Event, SensorData } from '../../lib'

// Ball registry
const balls = new Map<string, SpheroMini>()
const sensorClients = new Map<string, Set<any>>()

// Find and connect all balls on startup
async function connectBalls() {
  const found = await Scanner.findToys([SpheroMini.advertisement])
  
  for (const bot of found) {
    const ball = new SpheroMini(bot.peripheral, bot.peripheral.id)
    await ball.start()
    await ball.configureSensorStream()
    
    // Store by both id and name if available
    balls.set(bot.peripheral.id, ball)
    console.log(`Connected: ${bot.peripheral.id}`)
    
    // Setup sensor streaming
    ball.on(Event.onSensor, (data: SensorData) => {
      const clients = sensorClients.get(bot.peripheral.id)
      if (clients) {
        const msg = JSON.stringify({ id: bot.peripheral.id, data })
        clients.forEach(ws => ws.send(msg))
      }
    })
  }
}

// Get ball by id or name
function getBall(id: string): SpheroMini {
  const ball = balls.get(id)
  if (!ball) throw new Error(`Ball ${id} not found`)
  return ball
}

// REST API
const app = new Hono()

// GET /balls - List connected balls
app.get('/balls', (c) => {
  return c.json(Array.from(balls.keys()))
})

// GET /:id - Get ball state
app.get('/:id', (c) => {
  const ball = getBall(c.req.param('id'))
  return c.json({ id: c.req.param('id'), connected: true })
})

// PATCH /:id - Control ball
app.patch('/:id', async (c) => {
  const ball = getBall(c.req.param('id'))
  const body = await c.req.json()
  
  // Speed control (0-255)
  if ('speed' in body) {
    const speed = Math.round(body.speed * 2.55) // Convert 0-100 to 0-255
    const heading = body.heading || 0
    await ball.roll(speed, heading, [])
  }
  
  // Heading control
  if ('heading' in body && !('speed' in body)) {
    await ball.roll(0, body.heading, [])
  }
  
  // LED color (RGB 0-255)
  if ('color' in body) {
    const { r = 0, g = 0, b = 0 } = body.color
    await ball.setMainLedColor(r, g, b)
  }
  
  // Back LED brightness (0-255)
  if ('backled' in body) {
    await ball.setBackLedIntensity(body.backled)
  }
  
  // Raw roll command
  if ('roll' in body) {
    const { speed = 0, heading = 0 } = body.roll
    await ball.roll(speed, heading, [])
  }
  
  return c.json({ ok: true })
})

// POST /:id/sleep - Sleep ball
app.post('/:id/sleep', async (c) => {
  const ball = getBall(c.req.param('id'))
  await ball.sleep()
  return c.json({ ok: true })
})

// POST /:id/wake - Wake ball
app.post('/:id/wake', async (c) => {
  const ball = getBall(c.req.param('id'))
  await ball.wake()
  return c.json({ ok: true })
})

// WebSocket server for sensor data
const wss = new WebSocketServer({ port: 8081 })

wss.on('connection', (ws) => {
  let subscriptions = new Set<string>()
  
  ws.on('message', (msg) => {
    const { subscribe, unsubscribe } = JSON.parse(msg.toString())
    
    if (subscribe) {
      const ballId = subscribe
      if (!sensorClients.has(ballId)) {
        sensorClients.set(ballId, new Set())
      }
      sensorClients.get(ballId)!.add(ws)
      subscriptions.add(ballId)
    }
    
    if (unsubscribe) {
      const ballId = unsubscribe
      sensorClients.get(ballId)?.delete(ws)
      subscriptions.delete(ballId)
    }
  })
  
  ws.on('close', () => {
    // Clean up subscriptions
    subscriptions.forEach(ballId => {
      sensorClients.get(ballId)?.delete(ws)
    })
  })
})

// Start servers
connectBalls().then(() => {
  console.log(`REST API on http://localhost:8080`)
  console.log(`WebSocket on ws://localhost:8081`)
  serve({ fetch: app.fetch, port: 8080 })
})