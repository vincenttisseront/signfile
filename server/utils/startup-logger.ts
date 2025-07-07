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
    logger.info('startup', '🚀 SignFile Server Starting')
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
    
    // First, log the configuration without file system access
    logger.info('startup', `  CERTS_DIR: ${process.env.CERTS_DIR || '/app/secure-storage/certs'}`)
    logger.info('startup', `  TEMP_DIR: ${process.env.TEMP_DIR || '/app/temp'}`)
    logger.info('startup', `  DATA_DIR: ${process.env.DATA_DIR || '/app/data'}`)
    logger.info('startup', `  SECURE_STORAGE_DIR: ${process.env.SECURE_STORAGE_DIR || '/app/secure-storage'}`)
    logger.info('startup', `  Working directory: ${process.cwd()}`)
    
    // Also write to a file that will be available even if the container crashes
    try {
      const fs = require('fs')
      const debugDir = '/tmp/startup-debug'
      const logFile = `${debugDir}/node-startup.log`
      
      // Create directory if it doesn't exist
      try { fs.mkdirSync(debugDir, { recursive: true }) } catch (e) {}
      
      // Log to file
      const timestamp = new Date().toISOString()
      const logContent = `
${timestamp} - Node.js startup log
Working directory: ${process.cwd()}
CERTS_DIR: ${process.env.CERTS_DIR || '/app/secure-storage/certs'}
TEMP_DIR: ${process.env.TEMP_DIR || '/app/temp'}
DATA_DIR: ${process.env.DATA_DIR || '/app/data'}
SECURE_STORAGE_DIR: ${process.env.SECURE_STORAGE_DIR || '/app/secure-storage'}
NODE_ENV: ${process.env.NODE_ENV}
LOG_LEVEL: ${process.env.LOG_LEVEL}
`
      fs.writeFileSync(logFile, logContent, { flag: 'a' })
    } catch (fsErr) {
      // Silently ignore filesystem errors - we don't want logging to crash the app
    }
    
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
      const debugDir = '/tmp/startup-debug';
      const healthLogFile = `${debugDir}/health-checks.log`;
      
      // Create directory if it doesn't exist
      try { fs.mkdirSync(debugDir, { recursive: true }); } catch (e) {}
      
      // Log to file with timestamp
      const timestamp = new Date().toISOString();
      fs.appendFileSync(healthLogFile, `${timestamp} - ${healthMsg}\n`);
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
