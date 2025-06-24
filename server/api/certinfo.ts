import { readFile } from 'fs/promises'
import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

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
  const tmpPemPath = path.join(tmpdir(), `cert-${randomUUID()}.pem`)

  try {
    // Step 1: extract PEM from PFX
    await new Promise((resolve, reject) => {
      const args = [
        'pkcs12',
        '-in', certPath,
        '-clcerts',
        '-nokeys',
        '-passin', `pass:${password}`,
        '-out', tmpPemPath
      ]
      const proc = spawn('openssl', args)
      proc.on('close', code => (code === 0 ? resolve(null) : reject(new Error('openssl pkcs12 failed'))))
      proc.on('error', reject)
    })

    // Step 2: read x509 fields directly from PEM file
    const info = await new Promise((resolve, reject) => {
      const proc = spawn('openssl', [
        'x509', '-in', tmpPemPath,
        '-noout', '-subject', '-issuer', '-dates', '-serial', '-text'
      ])
      let out = ''
      proc.stdout.on('data', chunk => (out += chunk.toString()))
      proc.on('close', () => {
        console.log('[certinfo] openssl x509 output:', out)
        let subject = out.match(/subject=([^\n]+)/)?.[1]?.trim() || ''
        let issuer = out.match(/issuer=([^\n]+)/)?.[1]?.trim() || ''
        const validFrom = out.match(/notBefore=([^\n]+)/)?.[1]?.trim() || ''
        const validTo = out.match(/notAfter=([^\n]+)/)?.[1]?.trim() || ''
        const serialNumber = out.match(/serial=([^\n]+)/)?.[1]?.trim() || ''
        const ca = /CA:TRUE/i.test(out)

        // Fallback: try to extract CN from Subject: ... line if subject is empty
        if (!subject) {
          const subjectLine = out.match(/Subject: ([^\n]+)/i)?.[1] || ''
          const cn = subjectLine.match(/CN\s*=\s*([^,]+)/)?.[1] || ''
          if (cn) subject = `CN=${cn}`
        }

        const result = { subject, issuer, validFrom, validTo, serialNumber, ca }
        console.log('[certinfo] parsed result:', result)
        resolve(result)
      })
      proc.stderr.on('data', () => {}) // suppress error
      proc.on('error', reject)
    })

    await fs.rm(tmpPemPath, { force: true })
    return info

  } catch (e) {
    console.error('[certinfo] error:', e)
    return { error: 'Unable to extract certificate info.' }
  }
})
