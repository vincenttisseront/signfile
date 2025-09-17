/**
 * Diagnostic API to get jsign version and capabilities
 */
import { defineEventHandler } from 'h3'
import { spawn } from 'child_process'
import logger from '../utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const jsignVersion = await getJsignVersion()
    const jsignHelp = await getJsignHelp()
    
    // Extract supported file types from help text
    const supportedTypes = extractSupportedTypes(jsignHelp)
    
    return {
      version: jsignVersion,
      isAvailable: true,
      supportedTypes,
      helpText: jsignHelp.slice(0, 1000) // Truncate help text to avoid overwhelming response
    }
  } catch (err) {
    logger.error('jsign-version', `Error getting jsign info: ${err}`)
    return {
      isAvailable: false,
      error: `${err}`
    }
  }
})

async function getJsignVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('jsign', ['--version'])
    let stdout = ''
    let stderr = ''
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(new Error(`jsign --version failed with code ${code}: ${stderr}`))
      }
    })
    
    proc.on('error', (err) => {
      reject(err)
    })
  })
}

async function getJsignHelp(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('jsign', ['--help'])
    let stdout = ''
    let stderr = ''
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    proc.on('close', (code) => {
      // Help often outputs to stderr in CLI tools
      if (code === 0 || code === 1) { // Some CLI tools exit with 1 for help
        resolve(stdout || stderr)
      } else {
        reject(new Error(`jsign --help failed with code ${code}`))
      }
    })
    
    proc.on('error', (err) => {
      reject(err)
    })
  })
}

function extractSupportedTypes(helpText: string): string[] {
  // Try to extract file types from help text
  const types: string[] = []
  
  // Look for --type parameter in help text
  const typeMatch = helpText.match(/--type\s+<type>\s+([^-]+)/i)
  if (typeMatch && typeMatch[1]) {
    const typeDesc = typeMatch[1].trim()
    // Extract words that might be file types
    const possibleTypes = typeDesc.match(/\b([a-z0-9-]+)\b/gi)
    if (possibleTypes) {
      types.push(...possibleTypes)
    }
  }
  
  return types.filter(t => t !== 'type' && t !== 'the') // Remove common words
}