/**
 * Server startup logger to help diagnose container health issues
 */
import os from 'os'
import fs from 'fs'
import path from 'path'
import logger from './logger'

/**
 * Logs system information to help with container diagnostics
 */
export function logSystemInfo() {
  try {
    // Log basic system information
    logger.info('startup', '======================================================')
    logger.info('startup', '🚀 SecurityConsole Server Starting')
    logger.info('startup', '======================================================')
    logger.info('startup', `Hostname: ${os.hostname()}`)
    logger.info('startup', `Platform: ${os.platform()} ${os.release()}`)
    logger.info('startup', `Node Version: ${process.version}`)
    logger.info('startup', `Memory: ${Math.round(os.totalmem() / (1024 * 1024))}MB total, ${Math.round(os.freemem() / (1024 * 1024))}MB free`)
    logger.info('startup', `CPUs: ${os.cpus().length}`)
    
    // Log environment variables (filtering out sensitive information)
    logger.info('startup', '======================================================')
    logger.info('startup', 'Environment Configuration:')
    
    const envVars = Object.keys(process.env)
      .filter(key => !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN') && !key.includes('KEY'))
      .sort()
    
    for (const key of envVars) {
      let value = process.env[key]
      
      // Truncate long values and mask potentially sensitive values
      if (key.includes('ISSUER') || key.includes('URI') || key.includes('URL') || key.includes('ENDPOINT')) {
        value = value ? `${value.substring(0, 20)}...` : undefined
      }
      
      if (key.includes('CLIENT_ID')) {
        value = value ? `${value.substring(0, 5)}...` : undefined
      }
      
      logger.info('startup', `  ${key}: ${value || 'undefined'}`)
    }
    
    // Log directory structure - use try/catch for each directory separately for maximum robustness
    logger.info('startup', '======================================================')
    logger.info('startup', 'Directory Structure:')
    
    // Certificate-related configuration logging removed
    
    logger.info('startup', '======================================================')
    
  } catch (err) {
    logger.error('startup', 'Error logging system information:', err)
  }
}

/**
 * Log health check information
 */
export function logHealthCheck() {
  try {
    // Simple health check with minimal resource usage information
    const memUsage = process.memoryUsage();
    const healthMsg = `Health check: OK, uptime=${process.uptime().toFixed(0)}s, memory=${Math.round(memUsage.rss / 1024 / 1024)}MB`;
    logger.debug('health', healthMsg);
    
    // Also write to the debug log file
    try {
      const fs = require('fs');
      // Use platform-appropriate directory
      const debugDir = os.platform() === 'win32' ? 'C:/temp/startup-debug' : '/tmp/startup-debug';
      const healthLogFile = `${debugDir}/health-checks.log`;
      
      // Create directory if it doesn't exist
      try { fs.mkdirSync(debugDir, { recursive: true }); } catch (e) {}
      
      // Log to file with timestamp
      const timestamp = new Date().toISOString();
      fs.appendFileSync(healthLogFile, `${timestamp} - ${healthMsg} (${os.platform()})\n`);
    } catch (fsErr) {
      // Silently ignore filesystem errors - we don't want logging to crash the app
    }
  } catch (err) {
    // Even if this fails, don't let it crash the app
    try {
      logger.error('health', 'Error logging health information');
    } catch (innerErr) {
      // Completely silent fallback
    }
  }
}
