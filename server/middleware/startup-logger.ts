/**
 * Minimal server middleware to log startup
 */

import { defineEventHandler } from 'h3'
import logger from '../utils/logger'

// Track if initialization has been performed
let initialized = false

export default defineEventHandler(() => {
  if (!initialized) {
    // Just log startup without complex operations
    logger.info('startup', '======================================================')
    logger.info('startup', 'SignFile Server Started')
    logger.info('startup', `Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info('startup', `Log Level: ${process.env.LOG_LEVEL || 'info'}`)
    logger.info('startup', `Node Version: ${process.version}`)
    logger.info('startup', '======================================================')
    
    initialized = true
  }
})
