import { readFormData, createError, sendError } from 'h3'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'

// Run OpenSSL with arguments and optional stdin input
function runOpenSSL(args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('openssl', args)

    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    proc.stdout.on('data', chunk => stdout.push(chunk))
    proc.stderr.on('data', chunk => stderr.push(chunk))

    proc.on('error', (error) => {
      reject(new Error('OpenSSL not found. Please ensure OpenSSL is installed and available in PATH.'))
    })

    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(stdout))
      else reject(Buffer.concat(stderr).toString())
    })

    if (input) proc.stdin.write(input)
    proc.stdin.end()
  })
}

export default defineEventHandler(async (event) => {
  try {
    const form = await readFormData(event)

    const scriptFile = form.get('script') as File
    // Try to extract signature and certificate from the script file
    let signatureBase64: string | null = null
    let certificatePem: string | null = null

    if (scriptFile) {
      const text = await scriptFile.text()
      // Try PowerShell signature block first
      const psSigMatch = text.match(/# SIG # Begin signature block[\r\n]+([\s\S]+?)# SIG # End signature block/)
      if (psSigMatch) {
        // Remove all "# SIG #" and whitespace, join base64 lines
        const base64Lines = psSigMatch[1]
          .split('\n')
          .map(line => line.replace(/^# SIG #/, '').replace(/[\r\n]/g, '').trim())
          .filter(Boolean)
        signatureBase64 = base64Lines.join('')
        // No embedded cert in PS1, so try to extract PEM cert as fallback
        const certMatch = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)
        certificatePem = certMatch ? certMatch[0] : null
      } else {
        // Fallback to PEM blocks (for text-based signatures)
        const sigMatch = text.match(/-----BEGIN SIGNATURE-----\s*([\s\S]+?)\s*-----END SIGNATURE-----/)
        const certMatch = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)
        signatureBase64 = sigMatch ? sigMatch[1].replace(/\s+/g, '') : null
        certificatePem = certMatch ? certMatch[0] : null
      }
    }

    if (!scriptFile || !signatureBase64 || !certificatePem) {
      return {
        verified: false
      }
    }

    // Write certificate and signature to temp files
    const certPath = path.join(tmpdir(), `cert-${randomUUID()}.pem`)
    const sigPath = path.join(tmpdir(), `sig-${randomUUID()}.bin`)
    await fs.writeFile(certPath, certificatePem)
    await fs.writeFile(sigPath, Buffer.from(signatureBase64, 'base64'))

    // Read script buffer
    const scriptBuf = Buffer.from(await scriptFile.arrayBuffer())

    let verified = false
    try {
      await runOpenSSL([
        'dgst',
        '-sha256',
        '-verify', certPath,
        '-signature', sigPath
      ], scriptBuf)
      verified = true
    } catch (err) {
      console.warn('[openssl verify] failed:', err)
      verified = false
    }

    // Extract extended cert info
    const [fingerprint, subject, issuer, serial, algo] = await Promise.all([
      runOpenSSL(['x509', '-in', certPath, '-noout', '-fingerprint', '-sha256']),
      runOpenSSL(['x509', '-in', certPath, '-noout', '-subject']),
      runOpenSSL(['x509', '-in', certPath, '-noout', '-issuer']),
      runOpenSSL(['x509', '-in', certPath, '-noout', '-serial']),
      runOpenSSL(['x509', '-in', certPath, '-noout', '-text']) // for parsing signature algorithm
    ])

    const algoMatch = algo.toString().match(/Signature Algorithm:\s+([^\n\r]+)/)
    const signatureAlgorithm = algoMatch ? algoMatch[1].trim() : 'Unknown'

    await Promise.all([
      fs.rm(certPath, { force: true }),
      fs.rm(sigPath, { force: true })
    ])

    return {
      verified,
      certificate: {
        subject: subject.toString().trim().replace(/^subject=/, '').trim(),
        issuer: issuer.toString().trim().replace(/^issuer=/, '').trim(),
        serial: serial.toString().trim().replace(/^serial=/, '').trim(),
        fingerprint: fingerprint.toString().trim().replace(/^SHA256 Fingerprint=/, '').trim(),
        algorithm: signatureAlgorithm
      }
    }
  } catch (err: any) {
    console.error('[verify.post.ts] Unexpected error:', err)
    return sendError(event, createError({
      statusCode: 500,
      message: 'Verification failed: ' + err.message
    }))
  }
})
