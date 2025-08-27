// Web-based controller that can replace keyboard controls in games

import { SpheroMini, Event, SensorData } from '../../lib'

export interface Controller {
  speed: number
  heading: number
  update(): Promise<void>
  onSensor?: (data: SensorData) => void
}

// Local controller (existing keyboard-based)
export class LocalController implements Controller {
  speed = 0
  heading = 0
  
  constructor(private ball: SpheroMini) {
    ball.on(Event.onSensor, (data) => {
      if (this.onSensor) this.onSensor(data)
    })
  }
  
  async update() {
    await this.ball.roll(this.speed, this.heading, [])
  }
}

// Remote controller (REST API based)
export class RemoteController implements Controller {
  speed = 0
  heading = 0
  private ws?: WebSocket
  
  constructor(
    private ballId: string,
    private apiUrl = 'http://localhost:8080',
    private wsUrl = 'ws://localhost:8081'
  ) {
    // Setup WebSocket for sensor data
    if (typeof WebSocket !== 'undefined') {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ subscribe: this.ballId }))
      }
      this.ws.onmessage = (event) => {
        const { data } = JSON.parse(event.data)
        if (this.onSensor) this.onSensor(data)
      }
    }
  }
  
  async update() {
    await fetch(`${this.apiUrl}/${this.ballId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speed: Math.round(this.speed / 2.55), // Convert 0-255 to 0-100
        heading: this.heading
      })
    })
  }
  
  // Additional methods for LED, sleep, etc
  async setColor(r: number, g: number, b: number) {
    await fetch(`${this.apiUrl}/${this.ballId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: { r, g, b } })
    })
  }
  
  async sleep() {
    await fetch(`${this.apiUrl}/${this.ballId}/sleep`, { method: 'POST' })
  }
  
  async wake() {
    await fetch(`${this.apiUrl}/${this.ballId}/wake`, { method: 'POST' })
  }
}

// Factory to create controller based on environment
export function createController(ballOrId: SpheroMini | string): Controller {
  if (typeof ballOrId === 'string') {
    // Remote controller via REST API
    return new RemoteController(ballOrId)
  } else {
    // Local controller with direct ball access
    return new LocalController(ballOrId)
  }
}