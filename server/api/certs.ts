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
  // List certificates
  try {
    const files = await fs.readdir(certDir)
    return files.filter(f => f.endsWith('.pfx') || f.endsWith('.pem'))
  } catch {
    return []
  }
})
