/**
 * Health check endpoint
 * This endpoint provides basic health status information about the application.
 */
import { defineEventHandler } from 'h3'
import os from 'os'

export default defineEventHandler(() => {
  const uptime = process.uptime()
  const mem = process.memoryUsage()

  return {
    status: 'healthy',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    },
    platform: {
      os: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
    }
  }
})
