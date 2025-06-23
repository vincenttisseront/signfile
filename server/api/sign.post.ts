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
  try {
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true // ✅ allows 0-byte scripts for password checks
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const password = fields.password?.[0]
    const certPath = files.certificate?.[0]?.filepath
    const scriptPath = files.script?.[0]?.filepath

    if (!password || !certPath) {
      return sendError(event, createError({ statusCode: 400, message: 'Missing certificate or password.' }))
    }

    const tmpKey = path.join(tmpdir(), `key-${randomUUID()}.pem`)

    // Step 1: Extract private key from PFX
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
      console.error('[openssl] Failed to extract key:', err)
      return sendError(event, createError({ statusCode: 401, message: 'Invalid password or malformed PFX file.' }))
    }

    // Step 2: Password check only, no script to sign
    if (!scriptPath || (await fs.stat(scriptPath)).size === 0) {
      await fs.rm(tmpKey, { force: true })
      return { signature: '' } // Only password validation
    }

    // Step 3: Sign the script
    try {
      const originalName = files.script?.[0]?.originalFilename || 'signedfile';
      const ext = path.extname(originalName).toLowerCase();
      const baseName = originalName.slice(0, -ext.length);

      if (ext === '.ps1') {
        // PowerShell script: sign using Set-AuthenticodeSignature
        const signedScriptPath = path.join(tmpdir(), `signed-${randomUUID()}.ps1`);
        // Copy the script to a temp location for signing
        await fs.copyFile(scriptPath, signedScriptPath);

        // Use PowerShell to sign the script
        // Assumes the extracted key is a PFX file, so we use the original certPath and password
        const psCommand = `
          $cert = Get-PfxCertificate -FilePath "${certPath}" -Password (ConvertTo-SecureString "${password}" -AsPlainText -Force);
          Set-AuthenticodeSignature -FilePath "${signedScriptPath}" -Certificate $cert | Out-Null
        `;
        await new Promise((resolve, reject) => {
          const ps = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], { windowsHide: true });
          let stderr = '';
          ps.stderr.on('data', (data) => { stderr += data.toString(); });
          ps.on('close', (code) => {
            if (code === 0) resolve(null);
            else reject(new Error(stderr || 'Failed to sign PowerShell script'));
          });
        });

        // Return the signed script file
        const signedScript = await fs.readFile(signedScriptPath);
        const signedFilename = `${baseName}_signed${ext}`;
        event.node.res.setHeader('Content-Type', 'application/octet-stream');
        event.node.res.setHeader('Content-Disposition', `attachment; filename="${signedFilename}"`);
        event.node.res.end(signedScript);

        // Cleanup
        await fs.rm(signedScriptPath, { force: true });
        await fs.rm(tmpKey, { force: true });
        return;
      }

      // Default: detached signature for other file types
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
  }
})
