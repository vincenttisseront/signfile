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
    
    // Log directory structure
    try {
      logger.info('startup', '======================================================')
      logger.info('startup', 'Directory Structure:')
      
      // Check important directories based on Dockerfile environment variables
      const dirs = [
        process.cwd(),
        '/app',
        '/app/secure-storage',
        '/app/secure-storage/certs',
        '/app/temp',
        '/app/data',
        '/app/auth-data',
        process.env.CERTS_DIR || '/app/secure-storage/certs',
        process.env.TEMP_DIR || '/app/temp',
        process.env.DATA_DIR || '/app/data',
        process.env.SECURE_STORAGE_DIR || '/app/secure-storage'
      ]
      
      for (const dir of [...new Set(dirs)]) {
        try {
          const exists = fs.existsSync(dir)
          
          if (exists) {
            const stats = fs.statSync(dir)
            const isDir = stats.isDirectory()
            const files = isDir ? fs.readdirSync(dir).length : 0
            logger.info('startup', `  ${dir}: ${exists ? '✅' : '❌'} ${isDir ? `(${files} files)` : '(not a directory)'}`)
            
            // Log first few files to help with debugging
            if (isDir && files > 0) {
              const fileList = fs.readdirSync(dir).slice(0, 5)
              fileList.forEach((file: string) => {
                try {
                  const filePath: string = path.join(dir, file)
                  const fileStats: import('fs').Stats = fs.statSync(filePath)
                  logger.info('startup', `    - ${file}: ${fileStats.isDirectory() ? 'directory' : `file (${fileStats.size} bytes)`}`)
                } catch (fileErr: unknown) {
                  logger.warn('startup', `    - ${file}: error reading stats`)
                }
              })
              
              if (files > 5) {
                logger.info('startup', `    - ... and ${files - 5} more files`)
              }
            }
          } else {
            logger.warn('startup', `  ${dir}: ❌ does not exist`)
          }
        } catch (dirErr) {
          logger.error('startup', `  Error checking directory ${dir}:`, dirErr)
        }
      }
    } catch (fsErr) {
      logger.error('startup', 'Error checking filesystem:', fsErr)
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
    logger.debug('health', '======================================================')
    logger.debug('health', 'Health Check')
    logger.debug('health', '======================================================')
    
    // Log resource usage
    const memoryUsage = process.memoryUsage()
    logger.debug('health', `Memory: ${Math.round(memoryUsage.rss / (1024 * 1024))}MB RSS, ${Math.round(memoryUsage.heapUsed / (1024 * 1024))}MB Heap Used`)
    logger.debug('health', `Uptime: ${Math.round(process.uptime())} seconds`)
    
    // Log resource availability
    const freeMem = os.freemem()
    const totalMem = os.totalmem()
    const usedMem = totalMem - freeMem
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100)
    
    logger.debug('health', `System Memory: ${memoryUsagePercent}% used (${Math.round(freeMem / (1024 * 1024))}MB free)`)
    logger.debug('health', `Load Average: ${os.loadavg().map(load => load.toFixed(2)).join(', ')}`)
    
    logger.debug('health', '======================================================')
  } catch (err) {
    logger.error('health', 'Error logging health information:', err)
  }
}
