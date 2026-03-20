import os from 'os'
import logger from './logger'

export function logSystemInfo() {
  logger.info('startup', '======================================================')
  logger.info('startup', 'SignFile Server Starting')
  logger.info('startup', '======================================================')
  logger.info('startup', `Hostname: ${os.hostname()}`)
  logger.info('startup', `Platform: ${os.platform()} ${os.release()}`)
  logger.info('startup', `Node Version: ${process.version}`)
  logger.info('startup', `Memory: ${Math.round(os.totalmem() / (1024 * 1024))}MB total, ${Math.round(os.freemem() / (1024 * 1024))}MB free`)
  logger.info('startup', `CPUs: ${os.cpus().length}`)

  const envVars = Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN') && !key.includes('KEY'))
    .sort()

  logger.info('startup', 'Environment Configuration:')
  for (const key of envVars) {
    let value = process.env[key]
    if (key.includes('ISSUER') || key.includes('URI') || key.includes('URL') || key.includes('ENDPOINT')) {
      value = value ? `${value.substring(0, 20)}...` : undefined
    }
    if (key.includes('CLIENT_ID')) {
      value = value ? `${value.substring(0, 5)}...` : undefined
    }
    logger.info('startup', `  ${key}: ${value || 'undefined'}`)
  }
  logger.info('startup', '======================================================')
}
