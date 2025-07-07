import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { createError, sendError } from 'h3'

export const config = {
  api: {
    bodyParser: false
  }
}

// Run OpenSSL with arguments and optional stdin input
function runOpenSSL(args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('openssl', args)

    const out: Buffer[] = []
    const err: Buffer[] = []

    proc.stdout.on('data', (chunk) => out.push(chunk))
    proc.stderr.on('data', (chunk) => err.push(chunk))

    proc.on('error', (error) => {
      // Handle missing openssl binary or spawn errors
      reject(new Error('OpenSSL not found. Please ensure OpenSSL is installed and available in PATH.'))
    })

    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out))
      else reject(Buffer.concat(err).toString())
    })

    if (input) proc.stdin.write(input)
    proc.stdin.end()
  })
}

export default defineEventHandler(async (event) => {
  // Create variables at the handler scope so they can be accessed in the finally block
  let tempDir = '';
  
  try {
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true // ✅ allows 0-byte scripts for password checks
    })

    console.log('[sign.post.ts] Parsing form data...');
    
    // Add request timestamp to help identify each request uniquely
    const requestTimestamp = Date.now();
    console.log(`[sign.post.ts] Request started at: ${requestTimestamp}`);
    
    // Create temp directory with unique name
    const baseTempDir = process.env.TEMP_DIR || tmpdir();
    tempDir = path.join(baseTempDir, `signfile-${requestTimestamp}-${randomUUID()}`);
    try {
      await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
      console.log(`[sign.post.ts] Created temp dir: ${tempDir}`);
    } catch (dirErr) {
      console.error(`[sign.post.ts] Failed to create temp dir: ${dirErr}`);
      // Fallback to system temp dir if the custom one fails
      tempDir = path.join(tmpdir(), `signfile-${requestTimestamp}-${randomUUID()}`);
      await fs.mkdir(tempDir, { recursive: true, mode: 0o777 });
    }

    // Configure formidable with specific upload dir to avoid conflicts
    // @ts-ignore - uploadDir may not be in the typings but it's a valid option
    form.uploadDir = tempDir;
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          console.error(`[sign.post.ts] Form parse error: ${err}`);
          reject(err);
        } else {
          console.log(`[sign.post.ts] Form parsed successfully. Fields: ${Object.keys(fields).join(', ')}`);
          console.log(`[sign.post.ts] Files: ${Object.keys(files).map(key => `${key}:${files[key]?.[0]?.originalFilename}`).join(', ')}`);
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
      console.log('[sign.post.ts] Using stored certificate:', certPath)
    }
    const scriptPath = files.script?.[0]?.filepath

    if (!password || !certPath) {
      console.log('[sign.post.ts] Missing certificate or password.');
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
      console.error('[sign] Invalid certificate password:', err)
      return sendError(event, createError({ statusCode: 401, message: 'Invalid password or unreadable certificate.' }))
    }

    // Step 2: Password check only, no script to sign
    if (!scriptPath || (await fs.stat(scriptPath)).size === 0) {
      console.log('[sign.post.ts] Password check only, no script to sign.');
      await fs.rm(tmpKey, { force: true })
      return { signature: '' } // Only password validation
    }

    // Step 3: Sign the script
    try {
      const originalName = files.script?.[0]?.originalFilename || 'signedfile';
      const ext = path.extname(originalName).toLowerCase();
      const baseName = originalName.slice(0, -ext.length);

      if (ext === '.ps1') {
        // PowerShell script: sign using jsign (Authenticode)
        const signedScriptPath = path.join(tmpdir(), `signed-${randomUUID()}.ps1`);

        // Copy script to temp file for signing
        await fs.copyFile(scriptPath, signedScriptPath);

        // Build jsign arguments (no --output)
        const jsignArgs = [
          '--storetype', 'PKCS12',
          '--keystore', certPath,
          '--storepass', password,
          '--tsaurl', 'http://timestamp.digicert.com',
          '--alg', 'SHA-256',
          '--name', 'Signed Script',
          signedScriptPath
        ];

        console.log('[sign.post.ts] Executing jsign:', ['jsign', ...jsignArgs].join(' '));
        await new Promise((resolve, reject) => {
          const jsign = spawn('jsign', jsignArgs, { windowsHide: true });
          let stderr = '';
          jsign.stderr.on('data', (data) => { stderr += data.toString(); });
          jsign.stdout.on('data', (data) => { console.log('[jsign]', data.toString().trim()); });
          jsign.on('close', (code) => {
            if (code === 0) {
              console.log('[sign.post.ts] jsign completed successfully.');
              resolve(null);
            } else {
              console.error('[sign.post.ts] jsign failed:', stderr);
              reject(new Error(stderr || 'Failed to sign PowerShell script with jsign'));
            }
          });
          jsign.on('error', (err) => {
            console.error('[sign.post.ts] jsign spawn error:', err);
            reject(err);
          });
        });

        // Return the signed script file
        console.log('[sign.post.ts] Reading signed script:', signedScriptPath);
        const signedScript = await fs.readFile(signedScriptPath);
        const signedFilename = `${baseName}_signed${ext}`;
        event.node.res.setHeader('Content-Type', 'application/octet-stream');
        event.node.res.setHeader('Content-Disposition', `attachment; filename="${signedFilename}"`);
        event.node.res.end(signedScript);

        // Remove both the signed and original script files
        await fs.rm(signedScriptPath, { force: true });
        if (scriptPath) {
          await fs.rm(scriptPath, { force: true });
        }
        await fs.rm(tmpKey, { force: true });
        console.log('[sign.post.ts] Signing process complete, response sent.');
        return;
      }

      // Default: detached signature for other file types
      console.log('[sign.post.ts] Signing non-ps1 file with OpenSSL:', scriptPath);
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
      console.log('[sign.post.ts] Detached signature sent for non-ps1 file.');
      return;

    } catch (err) {
      console.error('[openssl] Signing error:', err)
      return sendError(event, createError({ statusCode: 500, message: 'Signing failed: ' + err }))
    } finally {
      await fs.rm(tmpKey, { force: true })
    }

  } catch (err: any) {
    console.error('[sign.post.ts] Unexpected error:', err)
    return sendError(event, createError({
      statusCode: 500,
      message: 'Internal server error: ' + err.message
    }))
  } finally {
    // Clean up the temporary directory if we created one
    try {
      if (tempDir && tempDir !== tmpdir()) {
        console.log(`[sign.post.ts] Cleaning up temp dir: ${tempDir}`);
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error(`[sign.post.ts] Error cleaning up temp dir: ${cleanupErr}`);
    }
  }
})
