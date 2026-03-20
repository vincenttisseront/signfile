import { logSystemInfo } from '../utils/startup-logger'
import logger from '../utils/logger'

export default defineNitroPlugin(() => {
  logger.info('startup', 'Nitro plugin initialized — logging system information')
  logSystemInfo()
})

