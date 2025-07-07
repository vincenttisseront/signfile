/**
 * Nuxt server middleware to integrate startup logging
 * This will run when the Nitro server starts and log system information
 */

import { logSystemInfo, logHealthCheck } from '../utils/startup-logger'
import logger from '../utils/logger'
import { defineEventHandler } from 'h3'

// Track if initialization has been performed
let initialized = false

export default defineEventHandler((event) => {
    if (!initialized) {
        logger.info('startup', 'Server middleware initialized - logging system information')
        
        // Log system info at startup
        logSystemInfo()
        
        // Set up periodic health checks
        const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
        
        // Log first health check after 30 seconds
        setTimeout(() => {
            logHealthCheck()
            
            // Then set interval for regular health checks
            setInterval(() => {
                logHealthCheck()
            }, HEALTH_CHECK_INTERVAL)
        }, 30 * 1000)
        
        initialized = true
    }
})

