import { spawn } from 'child_process'

export default defineEventHandler(async (event) => {
  if (event.req.method !== 'POST') {
    return { error: 'Method not allowed' }
  }
  const body = await readBody(event)
  const pkg = body?.name
  if (!pkg || typeof pkg !== 'string') {
    return { error: 'Missing or invalid package name' }
  }
  return new Promise((resolve) => {
    const proc = spawn('npm', ['install', `${pkg}@latest`], { cwd: process.cwd() })
    let out = '', err = ''
    proc.stdout.on('data', d => (out += d.toString()))
    proc.stderr.on('data', d => (err += d.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve({ ok: true, output: out })
      else resolve({ error: err || 'Failed to update package' })
    })
    proc.on('error', (e) => resolve({ error: e.message }))
  })
})
