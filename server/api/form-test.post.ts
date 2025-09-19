import formidable from 'formidable'
import { defineEventHandler } from 'h3'
import logger from '../utils/logger'

export default defineEventHandler(async (event) => {
  logger.info('form-test', '================================================================')
  logger.info('form-test', 'Received form submission test request')
  logger.info('form-test', `Request URL: ${event.node.req.url}`)
  logger.info('form-test', `Request Method: ${event.node.req.method}`)
  logger.info('form-test', `Request IP: ${event.node.req.socket.remoteAddress}`)
  logger.info('form-test', '================================================================')
  
  // Parse the form data
  const form = formidable({
    keepExtensions: true,
    multiples: true
  })
  
  try {
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          logger.error('form-test', 'Error parsing form:', err)
          reject(err)
        } else {
          resolve([fields, files])
        }
      })
    })
    
    logger.info('form-test', 'Form parsed successfully')
    logger.info('form-test', `Fields: ${JSON.stringify(fields)}`)
    logger.info('form-test', `Files: ${Object.keys(files).map(key => `${key}:${files[key]?.[0]?.originalFilename}`).join(', ')}`)
    
    return {
      success: true,
      message: 'Form submission received successfully',
      fields: fields,
      files: Object.fromEntries(
        Object.entries(files).map(([key, fileArr]) => [
          key, 
          (fileArr as any[]).map((file: any) => ({
            name: file.originalFilename,
            size: file.size,
            type: file.mimetype
          }))
        ])
      )
    }
  } catch (error: any) {
    logger.error('form-test', 'Error processing form:', error)
    
    return {
      success: false,
      error: error.message || 'Unknown error processing form'
    }
  }
})