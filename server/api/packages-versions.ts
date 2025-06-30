import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import https from 'https'

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

// --- NPM Package Version Helpers ---
async function getNpmPackages() {
  const fs = await import('fs/promises')
  const path = await import('path')
  const https = await import('https')

  // Read package.json
  const pkgPath = path.join(process.cwd(), 'package.json')
  const nodeModulesPath = path.join(process.cwd(), 'node_modules')
  let pkgJson = { dependencies: {}, devDependencies: {} }
  try {
    pkgJson = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  } catch {}
  const allDeps = {
    ...(pkgJson.dependencies || {}),
    ...(pkgJson.devDependencies || {})
  }
  const pkgs = Object.keys(allDeps)
  const results = await Promise.all(pkgs.map(async name => {
    let current = 'Unavailable', latest = 'Unavailable', outdated = false
    // Try to read installed version from node_modules
    try {
      const modPkg = JSON.parse(await fs.readFile(path.join(nodeModulesPath, name, 'package.json'), 'utf8'))
      current = modPkg.version || 'Unavailable'
    } catch {}
    // Fetch latest version from GitHub releases if possible, else fallback to npm
    let repo = null
    try {
      // Try to get repo from package.json
      const modPkg = JSON.parse(await fs.readFile(path.join(nodeModulesPath, name, 'package.json'), 'utf8'))
      if (modPkg.repository && typeof modPkg.repository === 'object' && modPkg.repository.url) {
        // e.g. "git+https://github.com/nuxt/nuxt.git"
        const match = modPkg.repository.url.match(/github.com[:/](.+?)(?:\.git)?$/i)
        if (match) repo = match[1].replace(/\.git$/, '')
      }
    } catch {}
    let isTypesPackage = /^@types\//.test(name)
    if (isTypesPackage) {
      // For @types/* packages, fetch all versions and pick the highest semver
      latest = await new Promise(resolve => {
        https.get({
          hostname: 'registry.npmjs.org',
          path: `/${name.replace(/^@/, '%40')}`,
          headers: { 'User-Agent': 'SignFile-App' }
        }, res => {
          let data = ''
          res.on('data', chunk => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              const versions = Object.keys(json.versions || {})
              if (versions.length > 0) {
                // Sort semver descending
                versions.sort((a, b) => {
                  const pa = a.split('.').map(Number)
                  const pb = b.split('.').map(Number)
                  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                    if ((pa[i] || 0) > (pb[i] || 0)) return -1
                    if ((pa[i] || 0) < (pb[i] || 0)) return 1
                  }
                  return 0
                })
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
    } else {
      if (repo) {
        // Try GitHub releases
        latest = await new Promise(resolve => {
          https.get({
            hostname: 'api.github.com',
            path: `/repos/${repo}/releases/latest`,
            headers: { 'User-Agent': 'SignFile-App' }
          }, res => {
            let data = ''
            res.on('data', chunk => (data += chunk))
            res.on('end', () => {
              try {
                const json = JSON.parse(data)
                const ghVersion = (json.tag_name || json.name || 'Unavailable').replace(/^v/, '')
                if (ghVersion && ghVersion !== 'Unavailable') resolve(ghVersion)
                else resolve('Unavailable')
              } catch {
                resolve('Unavailable')
              }
            })
          }).on('error', () => resolve('Unavailable'))
        })
        // Fallback to npm if GitHub release is unavailable
        if (latest === 'Unavailable') {
          latest = await new Promise(resolve => {
            https.get({
              hostname: 'registry.npmjs.org',
              path: `/${name.replace(/^@/, '%40')}/latest`,
              headers: { 'User-Agent': 'SignFile-App' }
            }, res => {
              let data = ''
              res.on('data', chunk => (data += chunk))
              res.on('end', () => {
                try {
                  const json = JSON.parse(data)
                  resolve(json.version || 'Unavailable')
                } catch {
                  resolve('Unavailable')
                }
              })
            }).on('error', () => resolve('Unavailable'))
          })
        }
      } else {
        // Fallback to npm registry
        latest = await new Promise(resolve => {
          https.get({
            hostname: 'registry.npmjs.org',
            path: `/${name.replace(/^@/, '%40')}/latest`,
            headers: { 'User-Agent': 'SignFile-App' }
          }, res => {
            let data = ''
            res.on('data', chunk => (data += chunk))
            res.on('end', () => {
              try {
                const json = JSON.parse(data)
                resolve(json.version || 'Unavailable')
              } catch {
                resolve('Unavailable')
              }
            })
          }).on('error', () => resolve('Unavailable'))
        })
      }
    }
    // Always fallback to npm registry if latest is still 'Unavailable' (network or GitHub issues)
    if (latest === 'Unavailable') {
      latest = await new Promise(resolve => {
        https.get({
          hostname: 'registry.npmjs.org',
          path: `/${name.replace(/^@/, '%40')}/latest`,
          headers: { 'User-Agent': 'SignFile-App' }
        }, res => {
          let data = ''
          res.on('data', chunk => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              resolve(json.version || 'Unavailable')
            } catch {
              resolve('Unavailable')
            }
          })
        }).on('error', () => resolve('Unavailable'))
      })
    }
    outdated = current !== 'Unavailable' && latest !== 'Unavailable' && current !== latest
    return { name, current, latest, outdated }
  }))
  return results
}

// --- Final API Handler ---
export default defineEventHandler(async () => {
  const [jsign, opensslInfo, openjdk, baseImage, npmPackages] = await Promise.all([
    getJsignVersion(),
    getOpenSSLVersion(),
    getOpenJDKVersion(),
    getBaseImage(),
    getNpmPackages()
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
    },
    npmPackages
  }
})
