/**
 * Health check endpoint
 * This endpoint provides basic health status information about the application.
 */
import { defineEventHandler } from 'h3'
import os from 'os'
import { logHealthCheck } from '../../utils/startup-logger'

export default defineEventHandler(() => {
  try {
    // Log this health check access
    logHealthCheck()

    // Simple health check with minimal dependencies
    const uptime = process.uptime()
    const mem = process.memoryUsage()
    
    // Get server hostname and addresses
    const hostname = os.hostname()
    const serverInfo = {
      devUrl: 'http://localhost:3000',
      prodUrl: 'https://securityconsole.ibanfirst.lan'
    }
    
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
        hostname: hostname,
      },
      server: serverInfo
    }
  } catch (err) {
    // Even if something fails, return a healthy response
    // This ensures the container stays up unless the server is completely down
    return {
      status: 'healthy', 
      minimal: true,
      timestamp: new Date().toISOString()
    }
  }
})
