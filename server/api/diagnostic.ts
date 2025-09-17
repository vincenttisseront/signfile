/**
 * Diagnostic endpoint to check critical functionality related to signing
 */
import { defineEventHandler } from 'h3'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import logger from '../utils/logger'

export default defineEventHandler(async (event) => {
  const results: {
    timestamp: string;
    status: string;
    jsign: { available: boolean; version: string | null; error: string | null };
    openssl: { available: boolean; version: string | null; error: string | null };
    directories: Record<string, any>;
    environment: Record<string, any>;
    jsignValidation?: string;
  } = {
    timestamp: new Date().toISOString(),
    status: 'running',
    jsign: { available: false, version: null, error: null },
    openssl: { available: false, version: null, error: null },
    directories: {},
    environment: {}
  }

  // Check jsign
  try {
    const jsignPath = await runCommand('which', ['jsign'])
    if (jsignPath) {
      results.jsign.available = true
      
      try {
        const jsignVersion = await runCommand('jsign', ['--version'])
        results.jsign.version = jsignVersion.trim()
      } catch (versionErr) {
        results.jsign.error = `Found at ${jsignPath} but version check failed: ${versionErr}`
      }
    } else {
      results.jsign.error = 'Not found in PATH'
    }
  } catch (err) {
    results.jsign.error = `Error checking jsign: ${err}`
  }
  
  // Check OpenSSL
  try {
    const opensslPath = await runCommand('which', ['openssl'])
    if (opensslPath) {
      results.openssl.available = true
      
      try {
        const opensslVersion = await runCommand('openssl', ['version'])
        results.openssl.version = opensslVersion.trim()
      } catch (versionErr) {
        results.openssl.error = `Found at ${opensslPath} but version check failed: ${versionErr}`
      }
    } else {
      results.openssl.error = 'Not found in PATH'
    }
  } catch (err) {
    results.openssl.error = `Error checking OpenSSL: ${err}`
  }
  
  // Check directories
  const dirsToCheck = [
    { name: 'CERTS_DIR', path: process.env.CERTS_DIR || '/app/secure-storage/certs' },
    { name: 'TEMP_DIR', path: process.env.TEMP_DIR || '/app/temp' },
    { name: 'DATA_DIR', path: process.env.DATA_DIR || '/app/data' },
    { name: 'SECURE_STORAGE_DIR', path: process.env.SECURE_STORAGE_DIR || '/app/secure-storage' }
  ]
  
  for (const dir of dirsToCheck) {
    try {
      const stats = await fs.stat(dir.path)
      const isWritable = stats.mode & 0o200 // Check if writable by owner
      const isReadable = stats.mode & 0o400 // Check if readable by owner
      
      // Try to write a test file
      const testFilePath = path.join(dir.path, `diagnostic-test-${Date.now()}.tmp`)
      let canWrite = false
      
      try {
        await fs.writeFile(testFilePath, 'test', { encoding: 'utf8' })
        await fs.unlink(testFilePath) // Remove test file
        canWrite = true
      } catch (writeErr) {
        // Can't write
      }
      
      results.directories[dir.name] = {
        path: dir.path,
        exists: true,
        readable: !!isReadable,
        writable: !!isWritable,
        canWriteFile: canWrite,
        mode: stats.mode.toString(8)
      }
    } catch (err) {
      results.directories[dir.name] = {
        path: dir.path,
        exists: false,
        error: `${err}`
      }
    }
  }
  
  // Get important environment variables
  results.environment = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PATH: process.env.PATH,
    USER: process.env.USER,
    HOME: process.env.HOME,
    SHELL: process.env.SHELL
  }
  
  // Add simple jsign validation test
  results.jsignValidation = 'not run'
  
  if (results.jsign.available) {
    try {
      // Create test PS1 file
      const testDir = process.env.TEMP_DIR || tmpdir()
      const testPs1Path = path.join(testDir, `diagnostic-test-${Date.now()}.ps1`)
      const testCertPath = path.join(process.env.CERTS_DIR || '/app/secure-storage/certs', 'diagnostic.p12')
      
      // Write test PS1 file
      await fs.writeFile(testPs1Path, 'Write-Host "This is a diagnostic test script"', { encoding: 'utf8' })
      
      // Create a simple self-signed certificate for testing
      // Only do this if no cert is found (to avoid overwriting user certs)
      let certExists = false
      try {
        await fs.access(testCertPath)
        certExists = true
      } catch (e) {
        // Cert doesn't exist, will create
      }
      
      if (!certExists) {
        try {
          // Generate a simple self-signed cert for diagnostics
          await runCommand('openssl', [
            'req', '-x509', '-newkey', 'rsa:2048', 
            '-keyout', `${testDir}/diagnostic-key.pem`,
            '-out', `${testDir}/diagnostic-cert.pem`,
            '-days', '1',
            '-nodes',
            '-subj', '/CN=DiagnosticTest'
          ])
          
          // Convert to PKCS12
          await runCommand('openssl', [
            'pkcs12', '-export',
            '-out', testCertPath,
            '-inkey', `${testDir}/diagnostic-key.pem`,
            '-in', `${testDir}/diagnostic-cert.pem`,
            '-password', 'pass:diagnostic'
          ])
          
          results.jsignValidation = 'Created diagnostic certificate'
        } catch (certErr) {
          results.jsignValidation = `Failed to create diagnostic certificate: ${certErr}`
        }
      }
      
      // Try to run jsign (will fail but at least we can check if it runs)
      try {
        await runCommand('jsign', [
          '--storetype', 'PKCS12',
          '--keystore', testCertPath,
          '--storepass', 'diagnostic',
          '--tsaurl', 'http://timestamp.digicert.com',
          '--alg', 'SHA-256',
          '--name', 'Diagnostic Test',
          testPs1Path
        ], true) // Allow error exit code
        
        results.jsignValidation = 'Successfully ran jsign command'
      } catch (jsignErr) {
        // Even if it fails with error code, that's fine for diagnostics
        // We just want to know if it can be executed
        if (typeof jsignErr === 'object' && jsignErr !== null && 
            'toString' in jsignErr && 
            typeof jsignErr.toString === 'function') {
          const errStr = jsignErr.toString();
          if (errStr.includes('keytool error') || errStr.includes('certificate')) {
            results.jsignValidation = 'jsign executed but failed with certificate error (expected)';
          } else {
            results.jsignValidation = `jsign failed: ${errStr}`;
          }
        } else {
          results.jsignValidation = `jsign failed with unknown error type: ${String(jsignErr)}`;
        }
      }
      
      // Clean up
      try {
        await fs.unlink(testPs1Path)
        // Don't delete the cert, might be useful for later diagnostics
      } catch (e) {
        // Ignore cleanup errors
      }
    } catch (validationErr) {
      results.jsignValidation = `Error during validation: ${validationErr}`
    }
  }
  
  results.status = 'complete'
  return results
})

// Helper function to run commands
async function runCommand(command: string, args: string[], allowError = false): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const proc = spawn(command, args)
      let stdout = ''
      let stderr = ''
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      proc.on('close', (code) => {
        if (code === 0 || allowError) {
          resolve(stdout.trim())
        } else {
          reject(new Error(`Command exited with code ${code}: ${stderr}`))
        }
      })
      
      proc.on('error', (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}