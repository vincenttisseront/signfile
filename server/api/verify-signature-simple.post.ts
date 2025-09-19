import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { createError, defineEventHandler, sendError } from 'h3'
import logger from '../utils/logger'

export default defineEventHandler(async (event) => {
  logger.info('verify-signature-simple', 'Received signature verification request');
  
  let tempDir = '';
  
  try {
    // Create a temporary directory for this process
    const requestId = randomUUID().slice(0, 8);
    tempDir = path.join(tmpdir(), `verify-signature-${requestId}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Configure formidable to process the form
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      uploadDir: tempDir
    });
    
    // Parse the form
    const { fields, files } = await new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) {
          logger.error('verify-signature-simple', `Form parse error: ${err}`);
          reject(err);
        } else {
          logger.info('verify-signature-simple', `Form parsed successfully: ${Object.keys(fields).length} fields, ${Object.keys(files).length} files`);
          resolve({ fields, files });
        }
      });
    });
    
    // Check if a file was submitted
    const scriptFile = files.script?.[0];
    if (!scriptFile || !scriptFile.filepath) {
      return { valid: false, message: 'No file submitted for verification' };
    }
    
    // Read the file content
    const fileContent = await fs.readFile(scriptFile.filepath, 'utf8');
    
    // Basic verification - check if file contains any signature block markers
    const hasStandardSignature = fileContent.includes('# SIG # Begin signature block') && 
                                fileContent.includes('# SIG # End signature block');
    
    const hasCmdSignature = fileContent.includes(':: SIG # Begin signature block') && 
                            fileContent.includes(':: SIG # End signature block');
    
    // Return basic result
    return {
      valid: hasStandardSignature || hasCmdSignature,
      message: (hasStandardSignature || hasCmdSignature) 
        ? 'Signature block found in file' 
        : 'No signature block found in file',
      details: {
        hasStandardSignature,
        hasCmdSignature,
        fileSize: fileContent.length,
        fileName: scriptFile.originalFilename
      }
    };
    
  } catch (err) {
    logger.error('verify-signature-simple', `Error during verification: ${err}`);
    logger.error('verify-signature-simple', `Error stack: ${(err as Error).stack}`);
    console.error('[verify-signature-simple] Error:', err);
    
    return sendError(event, createError({ 
      statusCode: 500, 
      message: `Error during verification: ${err}` 
    }));
  } finally {
    // Clean up the temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn('verify-signature-simple', `Error cleaning up temporary directory: ${cleanupErr}`);
      }
    }
  }
});