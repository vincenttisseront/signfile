import { spawn } from 'child_process'
import https from 'https'
import path from 'path'

// --- Version Helpers ---
function isOutdated(current: string, latest: string): boolean {
  const parse = (v: string) =>
    (v || '')
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(n => parseInt(n, 10) || 0)

  const [c, l] = [parse(current), parse(latest)]
  const len = Math.max(c.length, l.length)
  for (let i = 0; i < len; i++) {
    if ((c[i] || 0) < (l[i] || 0)) return true
    if ((c[i] || 0) > (l[i] || 0)) return false
  }
  return false
}

function getJsignVersion(): Promise<string> {
  return Promise.resolve(process.env.JSIGN_VERSION || 'Unavailable')
}

async function getOpenSSLVersion(): Promise<{ current: string, candidate: string }> {
  return new Promise((resolve) => {
    const proc = spawn('apt-cache', ['policy', 'openssl'])
    let out = ''
    proc.stdout.on('data', d => { out += d.toString() })
    proc.on('close', () => {
      const current = out.match(/Installed:\s*([^\s]+)/)?.[1] || 'Unavailable'
      const candidate = out.match(/Candidate:\s*([^\s]+)/)?.[1] || 'Unavailable'
      resolve({ current, candidate })
    })
    proc.on('error', () => resolve({ current: 'Unavailable', candidate: 'Unavailable' }))
  })
}

async function getOpenJDKVersion(): Promise<string> {
  return new Promise(resolve => {
    const proc = spawn('java', ['-version'])
    let out = '', err = ''
    proc.stdout.on('data', d => (out += d.toString()))
    proc.stderr.on('data', d => (err += d.toString()))
    proc.on('close', () => {
      const all = (out + '\n' + err).trim()
      const match = all.match(/openjdk version\s+"([^"]+)"/i)
      resolve(match ? match[1] : all || 'Unavailable')
    })
    proc.on('error', () => resolve('Unavailable'))
  })
}

async function getBaseImage(): Promise<string> {
  return new Promise(resolve => {
    try {
      const proc = spawn('cat', ['/etc/os-release'])
      let out = ''
      proc.stdout.on('data', d => (out += d.toString()))
      proc.on('close', () => {
        const pretty = out.match(/^PRETTY_NAME="([^"]+)"/m)
        if (pretty) return resolve(pretty[1])
        const name = out.match(/^NAME="([^"]+)"/m)
        const version = out.match(/^VERSION="([^"]+)"/m)
        if (name && version) return resolve(`${name[1]} ${version[1]}`)
        resolve(out.trim() || 'Unknown')
      })
      proc.on('error', () => resolve('Unavailable'))
    } catch {
      resolve('Unavailable')
    }
  })
}

// --- GitHub / Adoptium APIs ---
async function getLatestGithubRelease(repo: string): Promise<string> {
  return new Promise(resolve => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: { 'User-Agent': 'SignFile-App' }
    }
    https.get(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.tag_name?.replace(/^v/, '') || json.name || 'Unavailable')
        } catch {
          resolve('Unavailable')
        }
      })
    }).on('error', () => resolve('Unavailable'))
  })
}

async function getLatestOpenJDK17(): Promise<string> {
  return new Promise(resolve => {
    https.get('https://api.adoptium.net/v3/info/release_versions?version=17', res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const versions = json?.versions || []
          if (Array.isArray(versions) && versions.length > 0) {
            versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
            resolve(versions[0])
          } else {
            resolve('Unavailable')
          }
        } catch {
          resolve('Unavailable')
        }
      })
    }).on('error', () => resolve('Unavailable'))
  })
}

// --- Final API Handler ---
export default defineEventHandler(async () => {
  const [jsign, opensslInfo, openjdk, baseImage] = await Promise.all([
    getJsignVersion(),
    getOpenSSLVersion(),
    getOpenJDKVersion(),
    getBaseImage()
  ])

  const opensslOutdated = opensslInfo.current !== 'Unavailable'
    && opensslInfo.candidate !== 'Unavailable'
    && opensslInfo.current !== opensslInfo.candidate

  return {
    baseImage,
    versions: {
      jsign: {
        current: jsign,
      },
      openssl: {
        current: opensslInfo.current,
        latest: opensslInfo.candidate,
        outdated: opensslOutdated
      },
      openjdk: {
        current: openjdk,
      }
    }
  }
})
