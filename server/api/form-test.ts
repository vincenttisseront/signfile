import formidable from 'formidable'
import { defineEventHandler } from 'h3'
import logger from '../utils/logger'

export const config = {
  api: {
    bodyParser: false
  }
}

export default defineEventHandler(async (event) => {
  logger.info('form-test', 'Received diagnostic form submission test')
  
  try {
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true,
      maxFileSize: 50 * 1024 * 1024
    })
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          logger.error('form-test', `Form parse error:`, err)
          reject(err)
        } else {
          logger.debug('form-test', `Form parsed successfully. Fields: ${Object.keys(fields).join(', ')}`)
          logger.debug('form-test', `Files: ${Object.keys(files).map(key => `${key}:${files[key]?.[0]?.originalFilename}`).join(', ')}`)
          resolve([fields, files])
        }
      })
    })
    
    // Create a simplified response with the received data
    const filesInfo: Record<string, any[]> = {}
    
    Object.keys(files).forEach(key => {
      filesInfo[key] = (files[key] || []).map(file => ({
        name: file.originalFilename,
        size: file.size,
        type: file.mimetype
      }))
    })
    
    return {
      success: true,
      message: 'Form submission received successfully',
      fields,
      files: filesInfo
    }
  } catch (err) {
    logger.error('form-test', `Error processing form test:`, err)
    return {
      success: false,
      message: `Error processing form: ${err}`
    }
  }
})