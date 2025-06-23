import { readFile } from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'

export default defineEventHandler(async (event) => {
  const url = new URL(event.req.url || '', 'http://localhost')
  const name = url.searchParams.get('name')
  const password = url.searchParams.get('password')
  if (!name || !/^[\w.\-]+$/.test(name)) {
    return { error: 'Invalid certificate name.' }
  }
  if (!password) {
    return { error: 'Missing password.' }
  }
  const certPath = path.join('/certs', name)
  // Extract certificate info using openssl
  try {
    // Extract the certificate to PEM
    const pem = await new Promise<string>((resolve, reject) => {
      const args = [
        'pkcs12',
        '-in', certPath,
        '-clcerts',
        '-nokeys',
        '-passin', `pass:${password}`,
        '-out', '/tmp/tmpcert.pem'
      ]
      const proc = spawn('openssl', args)
      proc.on('close', async (code) => {
        if (code === 0) {
          try {
            const pemData = await readFile('/tmp/tmpcert.pem', 'utf8')
            resolve(pemData)
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error('Failed to extract certificate'))
        }
      })
      proc.on('error', reject)
    })
    // Parse certificate info
    const info = await new Promise((resolve, reject) => {
      const proc = spawn('openssl', ['x509', '-noout', '-subject', '-issuer', '-dates', '-serial', '-text'], { stdio: ['pipe', 'pipe', 'ignore'] })
      let out = ''
      proc.stdout.on('data', d => { out += d.toString() })
      proc.on('close', () => {
        // Parse fields
        const subject = out.match(/subject=([^\n]+)/)?.[1]?.trim() || ''
        const issuer = out.match(/issuer=([^\n]+)/)?.[1]?.trim() || ''
        const validFrom = out.match(/notBefore=([^\n]+)/)?.[1]?.trim() || ''
        const validTo = out.match(/notAfter=([^\n]+)/)?.[1]?.trim() || ''
        const serialNumber = out.match(/serial=([^\n]+)/)?.[1]?.trim() || ''
        const ca = /CA:TRUE/i.test(out)
        resolve({ subject, issuer, validFrom, validTo, serialNumber, ca })
      })
      proc.stdin.write(pem)
      proc.stdin.end()
      proc.on('error', reject)
    })
    return info
  } catch (e) {
    return { error: 'Unable to extract certificate info.' }
  }
})
