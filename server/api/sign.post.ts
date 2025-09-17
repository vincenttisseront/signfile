import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { createError, defineEventHandler, sendError } from 'h3'
import logger from '../utils/logger'

// Add a general catch handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('sign.post', 'Unhandled Rejection at:', promise, 'reason:', reason);
});

export const config = {
  api: {
    bodyParser: false
  }
}

// Run OpenSSL with arguments and optional stdin input
function runOpenSSL(args: string[], input?: Buffer): Promise<Buffer> {
  logger.debug('sign.post', 'Running OpenSSL with args:', args.join(' '))
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn('openssl', args);
    } catch (spawnErr) {
      logger.error('sign.post', 'Failed to spawn OpenSSL process:', spawnErr);
      return reject(new Error(`Failed to spawn OpenSSL: ${spawnErr}`));
    }

    const out: Buffer[] = []
    const err: Buffer[] = []

    proc.stdout.on('data', (chunk) => {
      out.push(Buffer.from(chunk));
    });
    
    proc.stderr.on('data', (chunk) => {
      err.push(Buffer.from(chunk));
    });

    proc.on('error', (error) => {
      // Handle missing openssl binary or spawn errors
      logger.error('sign.post', 'OpenSSL spawn error:', error)
      reject(new Error('OpenSSL not found or failed to execute. Error: ' + error.message))
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
  
  logger.info('sign.post', '================================================================')
  logger.info('sign.post', 'Received file signing request')
  logger.info('sign.post', `Request URL: ${event.node.req.url}`)
  logger.info('sign.post', `Request Method: ${event.node.req.method}`)
  logger.info('sign.post', `Request IP: ${event.node.req.socket.remoteAddress}`)
  logger.info('sign.post', '================================================================')
  
  try {
    // Create a unique temp directory for this request to help with debugging
    const requestId = randomUUID().slice(0, 8)
    logger.debug('sign.post', `Creating request with ID: ${requestId}`)
    
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true, // ✅ allows 0-byte scripts for password checks
      maxFileSize: 50 * 1024 * 1024, // 50MB max file size
      multiples: true
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
      const certsDir = process.env.CERTS_DIR || '/certs';
      certPath = path.join(certsDir, path.basename(storedCert));
      logger.info('sign.post', `Using stored certificate: ${path.basename(storedCert)}`);
      
      // Verify the certificate exists before proceeding
      try {
        await fs.access(certPath, fs.constants.R_OK);
        const certStat = await fs.stat(certPath);
        logger.debug('sign.post', `Certificate file exists, size: ${certStat.size} bytes`);
      } catch (certErr) {
        logger.error('sign.post', `Certificate file not accessible: ${certErr}`);
        return sendError(event, createError({ 
          statusCode: 404, 
          message: `Certificate file not found or not accessible: ${path.basename(storedCert)}` 
        }));
      }
    }
    const scriptPath = files.script?.[0]?.filepath

    if (!password || !certPath) {
      logger.warn('sign.post', `Missing certificate or password. password=${!!password}, certPath=${!!certPath}`);
      return sendError(event, createError({ statusCode: 400, message: 'Missing certificate or password.' }))
    }

    const tmpKey = path.join(tmpdir(), `key-${randomUUID()}.pem`)

    // Check certificate password and extract private key
    try {
      logger.debug('sign.post', 'Validating certificate password...');
      try {
        // Verify the temporary key doesn't already exist
        try {
          await fs.access(tmpKey);
          // If the file exists, remove it
          await fs.rm(tmpKey, { force: true });
          logger.debug('sign.post', `Removed existing temp key file: ${tmpKey}`);
        } catch (accessErr) {
          // File doesn't exist, which is fine
        }
        
        await runOpenSSL([
          'pkcs12',
          '-in', certPath,
          '-nocerts',
          '-nodes',
          '-passin', `pass:${password}`,
          '-out', tmpKey
        ]);
        
        // Verify the key was created
        const keyStats = await fs.stat(tmpKey);
        logger.debug('sign.post', `Private key extracted successfully, size: ${keyStats.size} bytes`);
      } catch (opensslErr) {
        logger.error('sign.post', 'Failed during OpenSSL key extraction:', opensslErr);
        throw opensslErr; // Re-throw to be caught by the outer catch
      }
    } catch (err) {
      logger.error('sign.post', 'Invalid certificate password or certificate error:', err);
      return sendError(event, createError({ 
        statusCode: 401, 
        message: 'Invalid password or unreadable certificate.' 
      }));
    }

    // Step 2: Password check only, no script to sign
    if (!scriptPath || (await fs.stat(scriptPath)).size === 0) {
      logger.info('sign.post', `Password check only, no script to sign. scriptPath=${scriptPath}`);
      try {
        await fs.rm(tmpKey, { force: true });
      } catch (rmErr) {
        logger.warn('sign.post', `Non-critical: Failed to remove temp key file: ${rmErr}`);
      }
      return { signature: '' } // Only password validation
    }

    // Step 3: Sign the script
    try {
      const originalName = files.script?.[0]?.originalFilename || 'signedfile';
      logger.debug('sign.post', `Original filename: ${originalName}`);
      const ext = path.extname(originalName).toLowerCase();
      logger.debug('sign.post', `File extension: ${ext}`);
      const baseName = originalName.slice(0, -ext.length);

      if (ext === '.ps1' || ext === '.cmd') {
        logger.info('sign.post', `Signing as PowerShell/CMD script. ext=${ext}`);
        
        // Special handling for .cmd files - convert to .ps1 temporarily
        let tempSignedScriptPath;
        let originalExt = ext;
        
        if (ext === '.cmd') {
          logger.info('sign.post', '=== CMD FILE SPECIAL HANDLING ===');
          // For CMD files, we'll use a .ps1 extension for signing, then convert back
          tempSignedScriptPath = path.join(tmpdir(), `signed-${randomUUID()}.ps1`);
          
          try {
            // Read the CMD file content
            const cmdContent = await fs.readFile(scriptPath, 'utf8');
            logger.debug('sign.post', `Read CMD file, size: ${cmdContent.length} bytes`);
            
            // Write it to a temporary .ps1 file with the same content
            await fs.writeFile(tempSignedScriptPath, cmdContent, 'utf8');
            logger.debug('sign.post', `Wrote temporary PS1 file for signing: ${tempSignedScriptPath}`);
          } catch (convErr) {
            logger.error('sign.post', `Failed to convert CMD to PS1 for signing: ${convErr}`);
            return sendError(event, createError({ 
              statusCode: 500, 
              message: `Failed to prepare CMD file for signing: ${convErr}` 
            }));
          }
        } else {
          // Normal handling for .ps1 files
          tempSignedScriptPath = path.join(tmpdir(), `signed-${randomUUID()}${ext}`);
          
          // Copy script to temp file for signing
          try {
            await fs.copyFile(scriptPath, tempSignedScriptPath);
            logger.debug('sign.post', `Copied PS1 file for signing: ${tempSignedScriptPath}`);
          } catch (copyErr) {
            logger.error('sign.post', `Failed to copy PS1 file: ${copyErr}`);
            return sendError(event, createError({ 
              statusCode: 500, 
              message: `Failed to copy script: ${copyErr}` 
            }));
          }
        }

        // Verify that jsign is actually available before attempting to use it
        try {
          const jsignCheck = spawn('which', ['jsign']);
          let jsignPath = '';
          jsignCheck.stdout.on('data', (data) => { jsignPath += data.toString().trim(); });
          
          await new Promise<void>((resolve) => {
            jsignCheck.on('close', (code) => {
              if (code !== 0 || !jsignPath) {
                logger.error('sign.post', 'jsign not found in PATH, this will cause signing to fail');
              } else {
                logger.debug('sign.post', `jsign found at: ${jsignPath}`);
              }
              resolve();
            });
          });
        } catch (whichErr) {
          logger.error('sign.post', 'Failed to check jsign availability:', whichErr);
          // Continue anyway, we'll get a more specific error when trying to spawn jsign
        }

        // Build jsign arguments
        const jsignArgs = [
          '--storetype', 'PKCS12',
          '--keystore', certPath,
          '--storepass', password,
          '--tsaurl', 'http://timestamp.digicert.com',
          '--alg', 'SHA-256',
          '--name', 'Signed Script',
          tempSignedScriptPath // Use the temporary PS1 file path for signing
        ];

        logger.debug('sign.post', `Executing jsign command with args: ${jsignArgs.join(' ')}`);
        
        try {
          await new Promise((resolve, reject) => {
            logger.debug('sign.post', 'Spawning jsign process...');
            let jsign;
            try {
              // Log the current PATH to help with debugging
              logger.debug('sign.post', `Current PATH: ${process.env.PATH}`);
              
              // Use absolute path for jsign if we know it
              jsign = spawn('jsign', jsignArgs, { 
                windowsHide: true,
                env: { ...process.env }
              });
            } catch (spawnErr) {
              logger.error('sign.post', `Failed to spawn jsign: ${spawnErr}`);
              return reject(new Error(`Failed to spawn jsign: ${spawnErr}`));
            }
            
            let stderr = '';
            let stdout = '';
            
            jsign.stderr.on('data', (data) => { 
              const text = data.toString().trim(); 
              stderr += text;
              logger.error('jsign', text); 
            });
            
            jsign.stdout.on('data', (data) => { 
              const text = data.toString().trim();
              stdout += text;
              logger.debug('jsign', text); 
            });
            
            jsign.on('close', (code) => {
              logger.debug('sign.post', `jsign process exited with code ${code}`);
              if (code === 0) {
                logger.info('sign.post', 'jsign completed successfully.');
                if (originalExt === '.cmd') {
                  logger.info('sign.post', '=== CMD FILE SIGNED SUCCESSFULLY AS PS1 ===');
                }
                resolve(null);
              } else {
                logger.error('sign.post', `jsign failed with code ${code}. stderr: "${stderr}". stdout: "${stdout}"`);
                if (originalExt === '.cmd') {
                  logger.error('sign.post', '=== CMD FILE SIGNING FAILED AS PS1 ===');
                }
                reject(new Error(stderr || 'Failed to sign script with jsign'));
              }
            });
            
            jsign.on('error', (err) => {
              logger.error('sign.post', 'jsign spawn error:', err);
              reject(err);
            });
          });
        } catch (jsignErr) {
          logger.error('sign.post', `jsign execution failed: ${jsignErr}`);
          return sendError(event, createError({ 
            statusCode: 500, 
            message: `Failed to sign script: ${jsignErr}` 
          }));
        }

        // Return the signed script file (with Authenticode block)
        logger.debug('sign.post', `Reading signed script from path: ${tempSignedScriptPath}`);
        let signedScript;
        try {
          // Check if file exists before trying to read it
          try {
            await fs.access(tempSignedScriptPath, fs.constants.R_OK);
            logger.debug('sign.post', `Signed script file exists and is readable: ${tempSignedScriptPath}`);
          } catch (accessErr) {
            logger.error('sign.post', `Signed script file not accessible: ${accessErr}`);
            
            // For CMD files, provide extra diagnostic information
            if (originalExt === '.cmd') {
              logger.error('sign.post', '=== CMD FILE ACCESS ERROR ===');
              try {
                // List the directory contents to see if the file is there
                const tmpDirPath = path.dirname(tempSignedScriptPath);
                const dirContents = await fs.readdir(tmpDirPath);
                logger.error('sign.post', `Temp directory contents: ${dirContents.join(', ')}`);
              } catch (dirErr) {
                logger.error('sign.post', `Failed to list temp directory: ${dirErr}`);
              }
            }
            
            throw accessErr; // Re-throw to be caught by outer try/catch
          }
          
          // Read the signed file
          signedScript = await fs.readFile(tempSignedScriptPath);
          logger.debug('sign.post', `Successfully read signed script, size: ${signedScript.length} bytes`);
          
          // Special handling for CMD files - convert the signed PS1 back to CMD
          let finalExt = originalExt;
          if (originalExt === '.cmd') {
            logger.info('sign.post', '=== CONVERTING SIGNED PS1 BACK TO CMD ===');
            // No conversion needed, just use the CMD extension
          }
        } catch (readErr) {
          logger.error('sign.post', `Failed to read signed script: ${readErr}`);
          return sendError(event, createError({ statusCode: 500, message: `Failed to read signed script: ${readErr}` }));
        }
        
        // Create the filename with the original extension
        const signedFilename = `${baseName}_signed${originalExt}`;
        event.node.res.setHeader('Content-Type', 'application/octet-stream');
        event.node.res.setHeader('Content-Disposition', `attachment; filename="${signedFilename}"`);
        logger.info('sign.post', `Sending signed script file: ${signedFilename}`);
        event.node.res.end(signedScript);

        // Remove both the signed and original script files
        await fs.rm(tempSignedScriptPath, { force: true });
        if (scriptPath) {
          logger.debug('sign.post', `Removing original script file: ${scriptPath}`);
          await fs.rm(scriptPath, { force: true });
        }
        await fs.rm(tmpKey, { force: true });
        logger.info('sign.post', 'Signing process complete, response sent.');
        return;
      }

      // Default: detached signature for other file types
  logger.info('sign.post', `Signing non-ps1 file with OpenSSL: ${scriptPath}`);
      logger.debug('sign.post', 'Running OpenSSL for detached signature...');
      
      let signature;
      try {
        // Check if the script file exists before reading it
        await fs.access(scriptPath);
        const scriptContent = await fs.readFile(scriptPath);
        logger.debug('sign.post', `Script file read successfully, size: ${scriptContent.length} bytes`);
        
        signature = await runOpenSSL([
          'dgst',
          '-sha256',
          '-sign', tmpKey
        ], scriptContent);
        
        logger.debug('sign.post', `OpenSSL signature created successfully, size: ${signature.length} bytes`);
      } catch (err) {
        logger.error('sign.post', `Error with script file or OpenSSL: ${err}`);
        return sendError(event, createError({ statusCode: 500, message: `Error with script file or OpenSSL: ${err}` }));
      }

      // Determine appropriate filename and content type based on extension
      let signatureFilename;
      
      // Use extension-specific naming convention for different file types
      if (['.js', '.ts', '.json', '.txt'].includes(ext)) {
        signatureFilename = `${baseName}_signed${ext}`;
      } else {
        // Default for other file types
        signatureFilename = `${baseName}_signed${ext || '.sig'}`;
      }
  event.node.res.setHeader('Content-Type', 'application/octet-stream');
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${signatureFilename}"`);
  logger.info('sign.post', `Sending detached signature file: ${signatureFilename}`);
  event.node.res.end(signature);
  await fs.rm(tmpKey, { force: true });
  logger.info('sign.post', 'Detached signature sent for non-ps1 file.');
      return;

    } catch (err) {
  logger.error('sign.post', `OpenSSL signing error: ${err}`);
  return sendError(event, createError({ statusCode: 500, message: 'Signing failed: ' + err }))
    } finally {
      await fs.rm(tmpKey, { force: true })
    }

  } catch (err: any) {
  logger.error('sign.post', `CRITICAL ERROR: Unexpected error in sign.post.ts endpoint: ${err}`);
  logger.error('sign.post', `Error stack: ${err.stack}`);
  
  // Try to determine if the error is related to a .cmd file
  let isCmdFileError = false;
  try {
    if (err.message && typeof err.message === 'string') {
      // Check if the request was trying to sign a .cmd file
      const requestBody = await new Promise<string>((resolve) => {
        let body = '';
        event.node.req.on('data', (chunk) => { body += chunk.toString(); });
        event.node.req.on('end', () => { resolve(body); });
      });
      
      if (requestBody.includes('.cmd') || requestBody.includes('filename="') && requestBody.includes('.cmd"')) {
        isCmdFileError = true;
        logger.error('sign.post', '=== CMD FILE ERROR DETECTED ===');
        
        // Run jsign --version to check if it supports .cmd files
        try {
          const jsignProc = spawn('jsign', ['--version']);
          let jsignVersion = '';
          
          jsignProc.stdout.on('data', (data) => {
            jsignVersion += data.toString();
          });
          
          await new Promise<void>((resolve) => {
            jsignProc.on('close', () => {
              logger.error('sign.post', `JSign version: ${jsignVersion.trim()}`);
              resolve();
            });
          });
        } catch (jsignErr) {
          logger.error('sign.post', `Failed to get jsign version: ${jsignErr}`);
        }
      }
    }
  } catch (detectionErr) {
    logger.error('sign.post', `Error while trying to detect .cmd file: ${detectionErr}`);
  }
  
  // Create fallback error report file for diagnostics (will be available even if logs are lost)
  try {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: err.stack,
      endpoint: '/api/sign',
      method: event.node.req.method,
      url: event.node.req.url,
      isCmdFileError
    };
    
    const errorDir = process.env.TEMP_DIR || tmpdir();
    const errorFilePath = path.join(errorDir, `sign-error-${Date.now()}.json`);
    await fs.writeFile(errorFilePath, JSON.stringify(errorReport, null, 2));
    logger.info('sign.post', `Error report written to ${errorFilePath}`);
  } catch (writeErr) {
    logger.error('sign.post', `Failed to write error report: ${writeErr}`);
  }
  
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
