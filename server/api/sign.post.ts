import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { createError, defineEventHandler, sendError } from 'h3'
import logger from '../utils/logger'

export const config = {
  api: {
    bodyParser: false
  }
}

// Run OpenSSL with arguments and optional stdin input
function runOpenSSL(args: string[], input?: Buffer): Promise<Buffer> {
  logger.debug('sign.post', 'Running OpenSSL with args:', args.join(' '))
  return new Promise((resolve, reject) => {
    const proc = spawn('openssl', args)

    const out: Buffer[] = []
    const err: Buffer[] = []

    proc.stdout.on('data', (chunk) => out.push(chunk))
    proc.stderr.on('data', (chunk) => err.push(chunk))

    proc.on('error', (error) => {
      // Handle missing openssl binary or spawn errors
      logger.error('sign.post', 'OpenSSL spawn error:', error)
      reject(new Error('OpenSSL not found. Please ensure OpenSSL is installed and available in PATH.'))
    })

    proc.on('close', (code) => {
      if (code === 0) {
        logger.debug('sign.post', 'OpenSSL command completed successfully')
        resolve(Buffer.concat(out))
      } else {
        const errorMsg = Buffer.concat(err).toString()
        logger.error('sign.post', 'OpenSSL error:', errorMsg)
        reject(errorMsg)
      }
    })

    if (input) proc.stdin.write(input)
    proc.stdin.end()
  })
}

export default defineEventHandler(async (event) => {
  // Create variables at the handler scope so they can be accessed in the finally block
  let tempDir = '';
  
  logger.info('sign.post', 'Received file signing request')
  
  try {
    // Create a unique temp directory for this request to help with debugging
    const requestId = randomUUID().slice(0, 8)
    logger.debug('sign.post', `Creating request with ID: ${requestId}`)
    
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true // ✅ allows 0-byte scripts for password checks
    })

    logger.debug('sign.post', 'Parsing form data...');
    
    // Add request timestamp to help identify each request uniquely
    const requestTimestamp = Date.now();
    logger.debug('sign.post', `Request started at: ${new Date(requestTimestamp).toISOString()}`);
    
    // Create temp directory with unique name
    const baseTempDir = process.env.TEMP_DIR || tmpdir();
    tempDir = path.join(baseTempDir, `signfile-${requestTimestamp}-${randomUUID()}`);
    try {
      await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
      logger.debug('sign.post', `Created temp dir: ${tempDir}`);
    } catch (dirErr) {
      logger.error('sign.post', `Failed to create temp dir:`, dirErr);
      // Fallback to system temp dir if the custom one fails
      tempDir = path.join(tmpdir(), `signfile-${requestTimestamp}-${randomUUID()}`);
      await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
      logger.info('sign.post', `Created fallback temp dir: ${tempDir}`);
    }

    // Configure formidable with specific upload dir to avoid conflicts
    // @ts-ignore - uploadDir may not be in the typings but it's a valid option
    form.uploadDir = tempDir;
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          logger.error('sign.post', `Form parse error:`, err);
          reject(err);
        } else {
          logger.debug('sign.post', `Form parsed successfully. Fields: ${Object.keys(fields).join(', ')}`);
          logger.debug('sign.post', `Files: ${Object.keys(files).map(key => `${key}:${files[key]?.[0]?.originalFilename}`).join(', ')}`);
          resolve([fields, files]);
        }
      })
    })

    const password = fields.password?.[0]
    // Support storedCert (filename in /certs) or uploaded cert
    let certPath = files.certificate?.[0]?.filepath
    const storedCert = fields.storedCert?.[0]
    if (storedCert) {
      certPath = path.join(process.env.CERTS_DIR || '/certs', path.basename(storedCert))
      logger.info('sign.post', 'Using stored certificate:', certPath)
    }
    const scriptPath = files.script?.[0]?.filepath

    if (!password || !certPath) {
      logger.warn('sign.post', 'Missing certificate or password.');
      return sendError(event, createError({ statusCode: 400, message: 'Missing certificate or password.' }))
    }

    const tmpKey = path.join(tmpdir(), `key-${randomUUID()}.pem`)

    // Check certificate password and extract private key
    try {
      await runOpenSSL([
        'pkcs12',
        '-in', certPath,
        '-nocerts',
        '-nodes',
        '-passin', `pass:${password}`,
        '-out', tmpKey
      ])
    } catch (err) {
      logger.error('sign.post', 'Invalid certificate password:', err)
      return sendError(event, createError({ statusCode: 401, message: 'Invalid password or unreadable certificate.' }))
    }

    // Step 2: Password check only, no script to sign
    if (!scriptPath || (await fs.stat(scriptPath)).size === 0) {
      logger.info('sign.post', 'Password check only, no script to sign.');
      await fs.rm(tmpKey, { force: true })
      return { signature: '' } // Only password validation
    }

    // Step 3: Sign the script
    try {
      const originalName = files.script?.[0]?.originalFilename || 'signedfile';
      const ext = path.extname(originalName).toLowerCase();
      const baseName = originalName.slice(0, -ext.length);

      if (ext === '.ps1' || ext === '.cmd') {
      }

      // Default: detached signature for other file types
      logger.info('sign.post', 'Signing non-ps1 file with OpenSSL:', scriptPath);
      const signature = await runOpenSSL([
        'dgst',
        '-sha256',
        '-sign', tmpKey
      ], await fs.readFile(scriptPath));

      const signatureFilename = `${baseName}_signed${ext || '.sig'}`;
      event.node.res.setHeader('Content-Type', 'application/octet-stream');
      event.node.res.setHeader('Content-Disposition', `attachment; filename="${signatureFilename}"`);
      event.node.res.end(signature);
      await fs.rm(tmpKey, { force: true });
      logger.info('sign.post', 'Detached signature sent for non-ps1 file.');
      return;

    } catch (err) {
      logger.error('sign.post', 'OpenSSL signing error:', err);
      return sendError(event, createError({ statusCode: 500, message: 'Signing failed: ' + err }))
    } finally {
      await fs.rm(tmpKey, { force: true })
    }

  } catch (err: any) {
    logger.error('sign.post', 'Unexpected error:', err);
    return sendError(event, createError({
      statusCode: 500,
      message: 'Internal server error: ' + err.message
    }))
  } finally {
    // Clean up the temporary directory if we created one
    try {
      if (tempDir && tempDir !== tmpdir()) {
        logger.debug('sign.post', `Cleaning up temp dir: ${tempDir}`);
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      logger.error('sign.post', `Error cleaning up temp dir:`, cleanupErr);
    }
  }
})
