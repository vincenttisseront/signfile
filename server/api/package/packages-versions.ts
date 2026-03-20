import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import https from 'https'
import { getQuery } from 'h3'

// --- Version Helpers ---
function isOutdated(current: string, latest: string): boolean {
  if (current === latest) return false
  if (!current || !latest || current === 'Unavailable' || latest === 'Unavailable') return false

  // Proper semver comparison
  try {
    // Extract numeric parts and pre-release identifiers
    const parseSemver = (version: string) => {
      // Remove any leading 'v' or other non-version characters
      const cleaned = version.trim().replace(/^[^0-9]*/, '')
      
      // Split by dash to separate version from pre-release
      const parts = cleaned.split('-')
      // Get the numeric parts
      const nums = parts[0].split('.').map(n => parseInt(n, 10) || 0)
      // Pad with zeros if needed
      while (nums.length < 3) nums.push(0)
      
      // Check for pre-release tags
      const isPrerelease = parts.length > 1 || 
        /alpha|beta|rc|preview|pre|dev|experimental|nightly|unstable/i.test(version)
      
      return { nums, isPrerelease }
    }

    const curr = parseSemver(current)
    const lat = parseSemver(latest)

    // Compare major.minor.patch
    for (let i = 0; i < 3; i++) {
      if (curr.nums[i] < lat.nums[i]) return true
      if (curr.nums[i] > lat.nums[i]) return false
    }

    // If we reach here, numeric versions are the same
    // A non-prerelease is newer than a prerelease with the same version numbers
    if (curr.isPrerelease && !lat.isPrerelease) return true
    
    return false
  } catch (e) {
    // Fallback to simple string comparison if parsing fails
    return current !== latest
  }
}

// Check if a version is a pre-release (alpha, beta, rc, etc)
function isPrerelease(version: string): boolean {
  // Skip empty or unavailable versions
  if (!version || version === 'Unavailable') return false
  
  // Match common pre-release identifiers
  return /\b(alpha|beta|rc|preview|pre|dev|experimental|nightly|unstable|snapshot)\b|-alpha\.|-beta\.|-pre\.|-rc\.|[.-]dev[0-9]|[.-]canary|\+[0-9a-f]{7}/i.test(version)
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
async function getNpmPackages(includePrerelease: boolean = false) {
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
    let current = 'Unavailable', latest = 'Unavailable', outdated = false, latestReleaseDate = ''
    // Try to read installed version from node_modules
    try {
      const modPkg = JSON.parse(await fs.readFile(path.join(nodeModulesPath, name, 'package.json'), 'utf8'))
      current = modPkg.version || 'Unavailable'
    } catch {}
    // Fetch latest version from GitHub releases if possible, else fallback to npm
    let repo: string | null = null
    let repoUrl = null
    try {
      // Try to get repo from package.json
      const modPkg = JSON.parse(await fs.readFile(path.join(nodeModulesPath, name, 'package.json'), 'utf8'))
      if (modPkg.repository) {
        if (typeof modPkg.repository === 'object' && modPkg.repository.url) {
          // e.g. "git+https://github.com/nuxt/nuxt.git"
          const url = modPkg.repository.url
          repoUrl = url.replace(/^git\+/, '')
                       .replace(/\.git$/, '')
                       .replace(/^git@github\.com:/, 'https://github.com/')
          
          const match = url.match(/github.com[:/](.+?)(?:\.git)?$/i)
          if (match) repo = match[1].replace(/\.git$/, '')
        } else if (typeof modPkg.repository === 'string') {
          // Handle shorthand "owner/repo" format
          if (modPkg.repository.includes('/')) {
            repo = modPkg.repository
            repoUrl = `https://github.com/${repo}`
          }
        }
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
                const latestVersion = versions[0]
                latestReleaseDate = json.time && json.time[latestVersion] ? json.time[latestVersion] : ''
                resolve(latestVersion)
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
                // GitHub API does not provide release date in npm format, so fallback to npm below
                resolve(ghVersion)
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
                  latestReleaseDate = json.time && json.time[json.version] ? json.time[json.version] : ''
                  resolve(json.version || 'Unavailable')
                } catch {
                  resolve('Unavailable')
                }
              })
            }).on('error', () => resolve('Unavailable'))
          })
        } else {
          // If we got a version from GitHub, still try to get the release date from npm
          await new Promise<void>(resolve => {
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
                  latestReleaseDate = json.time && json.time[latest] ? json.time[latest] : ''
                } catch {}
                resolve()
              })
            }).on('error', () => resolve())
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
                latestReleaseDate = json.time && json.time[json.version] ? json.time[json.version] : ''
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
    
    // If we're excluding pre-releases and the latest version is a pre-release, try to find a stable version
    if (!includePrerelease && isPrerelease(latest) && latest !== 'Unavailable') {
      // Try to get all versions and pick the highest non-prerelease
      const allVersions = await new Promise<string[]>(resolve => {
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
              resolve(versions)
            } catch {
              resolve([])
            }
          })
        }).on('error', () => resolve([]))
      })
      
      if (allVersions.length > 0) {
        // Sort versions by semver, highest first
        allVersions.sort((a, b) => {
          // Helper function to parse semver properly
          const parseSemver = (v: string) => {
            // Clean version string and remove leading 'v' if present
            const cleaned = v.replace(/^[^0-9]*/, '')
            // Split on dash to separate version from pre-release identifiers
            const parts = cleaned.split('-')
            // Get numeric parts
            const nums = parts[0].split('.').map(n => parseInt(n, 10) || 0)
            // Ensure we have at least 3 numeric parts
            while (nums.length < 3) nums.push(0)
            // Extract pre-release info
            const prerelease = parts.length > 1 ? parts[1] : ''
            
            return { 
              nums, 
              prerelease,
              isPrerelease: parts.length > 1 || /alpha|beta|rc|preview|pre|dev|experimental|nightly|unstable/i.test(v)
            }
          }
          
          const vA = parseSemver(a)
          const vB = parseSemver(b)
          
          // Compare major.minor.patch
          for (let i = 0; i < 3; i++) {
            if (vA.nums[i] > vB.nums[i]) return -1
            if (vA.nums[i] < vB.nums[i]) return 1
          }
          
          // If same version numbers, non-prerelease wins
          if (!vA.isPrerelease && vB.isPrerelease) return -1
          if (vA.isPrerelease && !vB.isPrerelease) return 1
          
          // If both are prerelease or both aren't, compare lexicographically
          if (vA.prerelease < vB.prerelease) return -1
          if (vA.prerelease > vB.prerelease) return 1
          
          return 0
        })
        
        // Find the first non-prerelease version
        const stableVersion = allVersions.find(v => !isPrerelease(v))
        if (stableVersion) {
          latest = stableVersion
        }
      }
    }
    
    // Handle special cases like formidable where version numbers can be tricky
    if (name === 'formidable') {
      console.log(`[packages-versions] Formidable versions - Current: ${current}, Latest: ${latest}`)
      
      // Parse versions properly and log
      try {
        const currentParts = current.split('.').map(Number)
        const latestParts = latest.split('.').map(Number)
        
        console.log(`[packages-versions] Formidable parsed - Current: [${currentParts.join(', ')}], Latest: [${latestParts.join(', ')}]`)
        
        // Deep check if current version is actually newer than latest
        const isCurrNewer = currentParts.length >= 3 && 
          latestParts.length >= 3 && 
          (
            currentParts[0] > latestParts[0] || 
            (currentParts[0] === latestParts[0] && currentParts[1] > latestParts[1]) ||
            (currentParts[0] === latestParts[0] && currentParts[1] === latestParts[1] && currentParts[2] > latestParts[2])
          )
        
        if (isCurrNewer) {
          console.log('[packages-versions] Current formidable version is newer than latest, marking as up to date')
          latest = current
          outdated = false
        }
      } catch (err) {
        console.error(`[packages-versions] Error comparing formidable versions:`, err)
      }
    }
    
    // Use our improved isOutdated function for a more accurate check
    outdated = current !== 'Unavailable' && latest !== 'Unavailable' && isOutdated(current, latest)
    
    // Check if latest version is a prerelease
    const isLatestPrerelease = isPrerelease(latest)
    
    // If we have a GitHub repo but no URL, construct it
    if (repo && !repoUrl) {
      repoUrl = `https://github.com/${repo}`
    }
    
    // For packages with known GitHub repos but not detected
    if (!repoUrl) {
      const knownRepos: Record<string, string> = {
        '@okta/okta-auth-js': 'https://github.com/okta/okta-auth-js',
        'vue': 'https://github.com/vuejs/vue',
        'nuxt': 'https://github.com/nuxt/framework',
        'tailwindcss': 'https://github.com/tailwindlabs/tailwindcss',
        'typescript': 'https://github.com/microsoft/TypeScript',
        'pinia': 'https://github.com/vuejs/pinia'
      }
      
      if (knownRepos[name]) {
        repoUrl = knownRepos[name]
        if (!repo) {
          const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/)
          if (match) repo = match[1]
        }
      }
    }
    
    return { 
      name, 
      current, 
      latest, 
      latestReleaseDate,
      outdated,
      isPrerelease: isLatestPrerelease,
      repository: repoUrl || `https://www.npmjs.com/package/${name}`
    }
  }))
  return results
}

// --- Final API Handler ---
function defineEventHandler(
  handler: (event: any) => Promise<{
    baseImage: string;
    versions: {
      openssl: { current: string; latest: string; outdated: boolean };
      openjdk: { current: string };
    };
    npmPackages: {
      name: string;
      current: string;
      latest: string;
      latestReleaseDate: string;
      outdated: boolean;
      isPrerelease: boolean;
      repository: any;
    }[];
  }>
) {
  // This is a Nuxt/Nitro event handler wrapper.
  // In a real Nuxt/Nitro app, this would register the handler for API routes.
  // Here, just return the handler for framework to use.
  return handler;
}


