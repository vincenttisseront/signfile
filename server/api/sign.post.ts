import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { spawn } from 'child_process';
import { createError, sendError } from 'h3';

/**
 * Helper function to run OpenSSL commands
 */
async function runOpenSSL(args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const openssl = spawn('openssl', args);
    const chunks: Buffer[] = [];

    if (input) {
      openssl.stdin.write(input);
      openssl.stdin.end();
    }

    openssl.stdout.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    openssl.stderr.on('data', (data) => {
      logger.error('openssl', data.toString());
    });

    openssl.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`OpenSSL process exited with code ${code}`));
      }
    });
  });
}

export default defineEventHandler(async (event) => {
  // Parse form and extract variables
  const form = formidable();
  const tempDir = path.join(tmpdir(), `signfile-${Date.now()}-${randomUUID()}`);
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
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
    const password = fields.password?.[0];
    const storedCert = fields.storedCert?.[0];
    
    let certPath = '';
    if (storedCert) {
      const certsDir = process.env.CERTS_DIR || '/certs';
      certPath = path.join(certsDir, path.basename(storedCert));
      try {
        await fs.access(certPath, fs.constants.R_OK);
      } catch (err) {
        logger.error('sign.post', `Certificate file not accessible: ${err}`);
        return sendError(event, createError({ 
          statusCode: 404, 
          message: `Certificate file not found or not accessible` 
        }));
      }
    } else if (files.certificate?.[0]) {
      certPath = files.certificate[0].filepath;
    }
    
    const scriptPath = files.script?.[0]?.filepath;

    // Validate inputs
    if (!password || !certPath) {
      logger.warn('sign.post', `Missing certificate or password`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: 'Missing certificate or password' 
      }));
    }

    // For now, return a success response
    // Actual signing implementation will be added incrementally
    return {
      success: true,
      message: "File signing placeholder - implementation in progress"
    };

  } catch (err) {
    logger.error('sign.post', `Error in sign endpoint: ${err}`);
    return sendError(event, createError({
      statusCode: 500,
      message: 'Internal server error: ' + (err as Error).message
    }));
  } finally {
    // Clean up temporary directory
    try {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});
