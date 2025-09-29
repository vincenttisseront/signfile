import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { createError, sendError, defineEventHandler } from 'h3';
import { signScriptWithCert } from '../../utils/signer';

/**
 * Creates a signed script by appending a signature block to the original script
 * 
 * @param script Original script content
 * @param signature Base64 encoded signature
 * @param timestamp Timestamp when the script was signed
 * @returns Complete signed script with signature block
 */
function createSignedScript(script: string, signature: string, timestamp: string): string {
  // Ensure script ends with a newline
  let cleanScript = script;
  if (!cleanScript.endsWith('\n')) {
    cleanScript += '\n';
  }
  
  // Add a second newline for spacing
  cleanScript += '\n';
  
  // Format signature in blocks for readability
  const chunkSize = 64;
  let formattedSignature = '';
  for (let i = 0; i < signature.length; i += chunkSize) {
    formattedSignature += signature.substring(i, i + chunkSize) + '\n';
  }
  
  // Create the signature block in PowerShell format
  const signatureBlock = [
    '# SIG # Begin signature block',
    `# Timestamp: ${timestamp}`,
    `# SignatureAlgorithm: SHA256RSA`,
    '# SignatureContent:',
    formattedSignature.trim(),
    '# SIG # End signature block'
  ].join('\n');
  
  return cleanScript + signatureBlock;
}

export default defineEventHandler(async (event: any) => {
  // Parse form and extract variables
  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    allowEmptyFiles: false,
    multiples: true
  });
  
  const tempDir = path.join(tmpdir(), `signfile-${Date.now()}-${randomUUID()}`);
  
  try {
    logger.info('sign.post', 'Processing sign request...');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Parse form data
    logger.info('sign.post', 'Parsing form data...');
    const { fields, files } = await new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) {
          logger.error('sign.post', `Form parse error:`, err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    // Extract file paths and credentials
    const password = fields.password?.[0] || (typeof fields.password === 'string' ? fields.password : undefined);
    const storedCert = fields.storedCert?.[0] || (typeof fields.storedCert === 'string' ? fields.storedCert : undefined);
    
    // Log received fields and files for debugging
    logger.info('sign.post', `Received fields: ${JSON.stringify(Object.keys(fields))}`);
    logger.info('sign.post', `Received files: ${JSON.stringify(Object.keys(files))}`);
    
    let certPath = '';
    if (storedCert) {
      const certsDir = process.env.CERTS_DIR || '/certs';
      certPath = path.join(certsDir, path.basename(storedCert));
      try {
        await fs.access(certPath, fs.constants.R_OK);
        logger.info('sign.post', `Using stored certificate: ${path.basename(certPath)}`);
      } catch (err) {
        logger.error('sign.post', `Certificate file not accessible: ${err}`);
        return sendError(event, createError({ 
          statusCode: 404, 
          message: `Certificate file not found or not accessible` 
        }));
      }
    } else if (files.certificate?.[0]) {
      certPath = files.certificate[0].filepath;
      logger.info('sign.post', `Using uploaded certificate at ${certPath}`);
    } else if (files.certificate) {
      // Handle different formidable versions
      certPath = (files.certificate as any).filepath;
      logger.info('sign.post', `Using uploaded certificate (alt format) at ${certPath}`);
    }
    
    let scriptPath = '';
    if (files.file?.[0]) {
      scriptPath = files.file[0].filepath;
      logger.info('sign.post', `Using uploaded file at ${scriptPath}`);
    } else if (files.file) {
      // Handle different formidable versions
      scriptPath = (files.file as any).filepath;
      logger.info('sign.post', `Using uploaded file (alt format) at ${scriptPath}`);
    } else if (files.script?.[0]) {
      scriptPath = files.script[0].filepath;
      logger.info('sign.post', `Using uploaded script at ${scriptPath}`);
    } else if (files.script) {
      // Handle different formidable versions
      scriptPath = (files.script as any).filepath;
      logger.info('sign.post', `Using uploaded script (alt format) at ${scriptPath}`);
    }

    // Validate inputs
    if (!password) {
      logger.warn('sign.post', `Missing password`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: 'Password is required' 
      }));
    }
    
    if (!certPath) {
      logger.warn('sign.post', `Missing certificate`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: 'Certificate is required' 
      }));
    }
    
    if (!scriptPath) {
      logger.warn('sign.post', `Missing script or file`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: 'Script or file is required' 
      }));
    }

    try {
      // Read the script content
      logger.info('sign.post', `Reading script from: ${scriptPath}`);
      const scriptContent = await fs.readFile(scriptPath, 'utf-8');
      logger.info('sign.post', `Script content read, length: ${scriptContent.length} bytes`);
      
      // Sign the script
      logger.info('sign.post', `Signing script with certificate: ${path.basename(certPath)}`);
      try {
        const signature = await signScriptWithCert(scriptContent, certPath, password);
        logger.info('sign.post', `Signature generated successfully, length: ${signature.length}`);
        
        // Create the signature block for PowerShell script
        const currentDate = new Date().toISOString();
        const signedScript = createSignedScript(scriptContent, signature, currentDate);
        
        // Create a temporary file for the signed script
        const signedScriptPath = path.join(tempDir, 'signed_' + path.basename(scriptPath));
        await fs.writeFile(signedScriptPath, signedScript);
        
        // Read the signed script to send back
        const signedContent = await fs.readFile(signedScriptPath, 'utf-8');
        
        logger.info('sign.post', `Successfully signed script, returning result`);
        return {
          success: true,
          message: "Script signed successfully",
          signedScript: signedContent
        };
      } catch (signErr) {
        logger.error('sign.post', `Error in signing operation: ${signErr}`);
        logger.error('sign.post', `Error stack: ${(signErr as Error).stack}`);
        return sendError(event, createError({
          statusCode: 500,
          message: `Error signing script: ${(signErr as Error).message}`,
          cause: signErr
        }));
      }
    } catch (err) {
      logger.error('sign.post', `Error reading script: ${err}`);
      logger.error('sign.post', `Error stack: ${(err as Error).stack}`);
      return sendError(event, createError({
        statusCode: 500,
        message: `Error reading script: ${(err as Error).message}`,
        cause: err
      }));
    }

  } catch (err) {
    logger.error('sign.post', `Error in sign endpoint: ${err}`);
    logger.error('sign.post', `Error stack: ${(err as Error).stack}`);
    return sendError(event, createError({
      statusCode: 500,
      message: 'Internal server error: ' + (err as Error).message
    }));
  } finally {
    // Clean up temporary directory
    try {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
          logger.warn('sign.post', `Error cleaning up temp directory: ${err}`);
        });
      }
    } catch (err) {
      logger.warn('sign.post', `Error in cleanup: ${err}`);
    }
  }
});
