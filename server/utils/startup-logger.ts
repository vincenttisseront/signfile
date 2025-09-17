/**
 * Server startup logger to help diagnose container health issues
 */
import os from 'os'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import logger from './logger'

/**
 * Validates critical dependencies needed for signing
 */
export function validateSigningDependencies() {
  logger.info('startup', '======================================================')
  logger.info('startup', '🔐 Validating Signing Dependencies')
  logger.info('startup', '======================================================')
  
  // Check for jsign
  try {
    const jsignCheck = spawn('which', ['jsign'])
    let jsignPath = ''
    jsignCheck.stdout.on('data', (data) => {
      jsignPath += data.toString().trim()
    })
    
    jsignCheck.on('close', (code) => {
      if (code === 0 && jsignPath) {
        logger.info('startup', `✅ jsign found at: ${jsignPath}`)
        
        // Now try to run jsign --version to validate it works
        const jsignVersion = spawn('jsign', ['--version'])
        let versionOutput = ''
        
        jsignVersion.stdout.on('data', (data) => {
          versionOutput += data.toString().trim()
        })
        
        jsignVersion.stderr.on('data', (data) => {
          logger.warn('startup', `⚠️ jsign stderr: ${data.toString().trim()}`)
        })
        
        jsignVersion.on('close', (versionCode) => {
          if (versionCode === 0) {
            logger.info('startup', `✅ jsign version: ${versionOutput}`)
          } else {
            logger.error('startup', `❌ jsign found but failed to run. Exit code: ${versionCode}`)
          }
        })
        
        jsignVersion.on('error', (err) => {
          logger.error('startup', `❌ Failed to execute jsign: ${err.message}`)
        })
      } else {
        logger.error('startup', '❌ jsign not found in PATH!')
      }
    })
    
    jsignCheck.on('error', (err) => {
      logger.error('startup', `❌ Failed to check for jsign: ${err.message}`)
    })
  } catch (err) {
    logger.error('startup', `❌ Error checking for jsign: ${err}`)
  }
  
  // Check for OpenSSL
  try {
    const opensslCheck = spawn('which', ['openssl'])
    let opensslPath = ''
    opensslCheck.stdout.on('data', (data) => {
      opensslPath += data.toString().trim()
    })
    
    opensslCheck.on('close', (code) => {
      if (code === 0 && opensslPath) {
        logger.info('startup', `✅ OpenSSL found at: ${opensslPath}`)
        
        // Now try to run openssl version to validate it works
        const opensslVersion = spawn('openssl', ['version'])
        let versionOutput = ''
        
        opensslVersion.stdout.on('data', (data) => {
          versionOutput += data.toString().trim()
        })
        
        opensslVersion.on('close', (versionCode) => {
          if (versionCode === 0) {
            logger.info('startup', `✅ OpenSSL version: ${versionOutput}`)
          } else {
            logger.error('startup', `❌ OpenSSL found but failed to run. Exit code: ${versionCode}`)
          }
        })
      } else {
        logger.error('startup', '❌ OpenSSL not found in PATH!')
      }
    })
  } catch (err) {
    logger.error('startup', `❌ Error checking for OpenSSL: ${err}`)
  }
  
  // Validate directory permissions
  const dirsToCheck = [
    { name: 'CERTS_DIR', path: process.env.CERTS_DIR || '/app/secure-storage/certs' },
    { name: 'TEMP_DIR', path: process.env.TEMP_DIR || '/app/temp' },
    { name: 'DATA_DIR', path: process.env.DATA_DIR || '/app/data' },
    { name: 'SECURE_STORAGE_DIR', path: process.env.SECURE_STORAGE_DIR || '/app/secure-storage' }
  ]
  
  for (const dir of dirsToCheck) {
    try {
      const stats = fs.statSync(dir.path)
      const isWritable = stats.mode & 0o200 // Check if writable by owner
      const isReadable = stats.mode & 0o400 // Check if readable by owner
      
      if (isWritable && isReadable) {
        logger.info('startup', `✅ Directory ${dir.name} (${dir.path}) is accessible and writable`)
      } else {
        logger.error('startup', `❌ Directory ${dir.name} (${dir.path}) has permission issues!`)
      }
      
      // Try to create a test file to verify write permissions
      const testFilePath = path.join(dir.path, `test-${Date.now()}.tmp`)
      fs.writeFileSync(testFilePath, 'test', { encoding: 'utf8' })
      fs.unlinkSync(testFilePath) // Remove test file
      
      logger.info('startup', `✅ Successfully wrote test file to ${dir.name}`)
    } catch (err) {
      logger.error('startup', `❌ Error validating ${dir.name} (${dir.path}): ${err}`)
    }
  }
  
  // Log PATH environment variable for debugging
  logger.info('startup', `PATH environment: ${process.env.PATH}`)
  
  logger.info('startup', '======================================================')
}

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
    
    // Validate all signing dependencies
    validateSigningDependencies()
    
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
      // Use platform-appropriate directory - default to /tmp which works in both Windows and Linux
      const debugDir = os.platform() === 'win32' ? 'C:/temp/startup-debug' : '/tmp/startup-debug'
      const logFile = `${debugDir}/node-startup.log`
      
      // Create directory if it doesn't exist
      try { fs.mkdirSync(debugDir, { recursive: true }) } catch (e) {}
      
      // Log to file
      const timestamp = new Date().toISOString()
      const logContent = `
${timestamp} - Node.js startup log
Working directory: ${process.cwd()}
Platform: ${os.platform()} ${os.release()}
Hostname: ${os.hostname()}
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
