import fs from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const certDir = '/certs'
  if (event.req.method === 'DELETE') {
    // Remove a certificate
    const url = new URL(event.req.url || '', 'http://localhost')
    const name = url.searchParams.get('name')
    if (!name || !/^[\w.\-]+$/.test(name)) {
      return { error: 'Invalid certificate name.' }
    }
    const certPath = path.join(certDir, name)
    try {
      await fs.unlink(certPath)
      return { ok: true }
    } catch (e) {
      return { error: 'Failed to remove certificate.' }
    }
  }
  if (event.req.method === 'POST') {
    // Save uploaded certificate to /certs
    // Use formidable to parse multipart form
    const formidable = (await import('formidable')).default
    const form = formidable({ multiples: false, uploadDir: certDir, keepExtensions: true })
    return new Promise((resolve) => {
      form.parse(event.req, async (err, fields, files) => {
        if (err) return resolve({ error: 'Failed to parse upload.' })
        const certFile = files.certificate?.[0]
        if (!certFile) return resolve({ error: 'No certificate uploaded.' })
        // Use original filename if available, fallback to newFilename
        const destPath = path.join(certDir, path.basename(certFile.originalFilename || certFile.newFilename))
        try {
          // Overwrite if exists
          await fs.copyFile(certFile.filepath, destPath)
          await fs.rm(certFile.filepath, { force: true })
          resolve({ ok: true })
        } catch (e) {
          resolve({ error: 'Failed to save certificate.' })
        }
      })
    })
  }
  // List certificates
  try {
    // Ensure /certs exists
    await fs.mkdir(certDir, { recursive: true })
    const files = await fs.readdir(certDir)
    return files.filter(f => f.endsWith('.pfx') || f.endsWith('.pem'))
  } catch {
    return []
  }
})
