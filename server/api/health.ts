/**
 * Health check endpoint to verify that the server is running properly
 */

import { defineEventHandler } from 'h3'
import logger from '../utils/logger'
import { logHealthCheck } from '../utils/startup-logger'
import os from 'os'
import fs from 'fs'

export default defineEventHandler((event) => {
  logger.debug('health-check', 'Health check endpoint called')
  
  // Log detailed health information
  logHealthCheck()
  
  // Get basic system stats for the health response
  const memoryUsage = process.memoryUsage()
  const freeMem = os.freemem()
  const totalMem = os.totalmem()
  
  // Check directory access
  let fileSystemHealthy = true
  try {
    const certsDir = process.env.CERTS_DIR || '/app/secure-storage/certs'
    const dataDir = process.env.DATA_DIR || '/app/data'
    const tempDir = process.env.TEMP_DIR || '/app/temp'
    const secureStorageDir = process.env.SECURE_STORAGE_DIR || '/app/secure-storage'
    const authDataDir = '/app/auth-data'
    
    // Verify we can access important directories
    // In ESM modules with Node.js v14+, we need to use the try-catch method
    // since some fs methods are not available synchronously
    try {
      const certsDirExists = fs.existsSync(certsDir)
      const dataDirExists = fs.existsSync(dataDir)
      const tempDirExists = fs.existsSync(tempDir)
      const secureStorageDirExists = fs.existsSync(secureStorageDir)
      const authDataDirExists = fs.existsSync(authDataDir)
      
      // Log directory status
      logger.debug('health-check', `Directory status: 
        certs (${certsDir}): ${certsDirExists ? '✅' : '❌'}
        data (${dataDir}): ${dataDirExists ? '✅' : '❌'}
        temp (${tempDir}): ${tempDirExists ? '✅' : '❌'}
        secure storage (${secureStorageDir}): ${secureStorageDirExists ? '✅' : '❌'}
        auth data (${authDataDir}): ${authDataDirExists ? '✅' : '❌'}`
      )
      
      fileSystemHealthy = certsDirExists && dataDirExists && tempDirExists && secureStorageDirExists
      
      logger.debug('health-check', `Directory access check: certs=${certsDirExists}, data=${dataDirExists}`)
    } catch (fsError) {
      logger.error('health-check', 'Error checking directories:', fsError)
      fileSystemHealthy = false
    }
  } catch (error) {
    fileSystemHealthy = false
    logger.error('health-check', 'File system check failed', error)
  }
  
  // Calculate memory usage percentage
  const memUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
  const sysMemUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100)
  
  // Determine status based on health checks
  const isMemoryOk = memUsagePercent < 90 && sysMemUsagePercent < 90
  const overallStatus = fileSystemHealthy && isMemoryOk ? 'healthy' : 'unhealthy'
  
  // Log overall health status
  if (overallStatus === 'healthy') {
    logger.info('health-check', 'Health check: HEALTHY')
  } else {
    logger.warn('health-check', `Health check: UNHEALTHY - Memory: ${memUsagePercent}%, FileSystem: ${fileSystemHealthy}`)
  }
  
  // Return health status
  return {
    status: overallStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      heapUsagePercent: memUsagePercent,
      external: Math.round(memoryUsage.external / (1024 * 1024)),
      systemFree: Math.round(freeMem / (1024 * 1024)),
      systemTotal: Math.round(totalMem / (1024 * 1024)),
      systemUsagePercent: sysMemUsagePercent
    },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'unknown'
    },
    fileSystem: fileSystemHealthy
  }
})
