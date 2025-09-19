import { defineEventHandler } from 'h3';
import formidable from 'formidable';
import logger from '../utils/logger';

export default defineEventHandler(async (event) => {
  logger.info('test-formidable', 'Testing formidable functionality');
  
  try {
    // Basic form parsing
    const form = formidable();
    
    // Create a simple Promise-based wrapper
    const result = await new Promise((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) {
          logger.error('test-formidable', `Error parsing form: ${err}`);
          reject(err);
        } else {
          logger.info('test-formidable', `Form parsed successfully: ${Object.keys(fields).length} fields, ${Object.keys(files).length} files`);
          resolve({ fields, files });
        }
      });
    });
    
    return {
      success: true,
      message: 'Formidable is working correctly',
      result
    };
    
  } catch (err) {
    logger.error('test-formidable', `Test failed: ${err}`);
    console.error('[test-formidable] Error:', err);
    
    return {
      success: false,
      error: String(err),
      stack: (err as Error).stack
    };
  }
});