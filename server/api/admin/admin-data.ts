import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { defineEventHandler, readBody } from 'h3'
import logger from './../../utils/logger'

export default defineEventHandler(async (event: any) => {
  // Get the data directory from environment
  const dataDir = process.env.DATA_DIR || '/app/data'
  const authDataDir = process.env.AUTH_DATA_DIR || '/app/auth-data'
  const secureStorageDir = process.env.SECURE_STORAGE_DIR || '/app/secure-storage'
  const certsDir = process.env.CERTS_DIR || path.join(secureStorageDir, 'certs')
  const adminPasswordFile = process.env.ADMIN_PASSWORD_FILE || path.join(secureStorageDir, 'admin_password.txt')
  const adminUsersFile = process.env.ADMIN_USERS_FILE || path.join(dataDir, 'admin_users.json')
  const authenticatedUsersFile = process.env.AUTHENTICATED_USERS_FILE || path.join(authDataDir, 'authenticated_users.json')
  
  // Ensure data directories exist
  try {
    await fs.mkdir(dataDir, { recursive: true, mode: 0o777 })
    await fs.mkdir(authDataDir, { recursive: true, mode: 0o777 })
    await fs.mkdir(secureStorageDir, { recursive: true, mode: 0o777 })
    await fs.mkdir(certsDir, { recursive: true, mode: 0o777 })
  } catch (err) {
    logger.warn('admin-data', 'Failed to create data directories:', err)
    // Continue execution even if mkdir fails
  }

  // Handle GET request to retrieve data
  if (event.req.method === 'GET') {
    // Get query parameters
    const url = new URL(event.req.url || '', 'http://localhost')
    const type = url.searchParams.get('type')
    
    try {
      if (type === 'password') {
        // Return admin password if it exists
        if (existsSync(adminPasswordFile)) {
          try {
            const password = await fs.readFile(adminPasswordFile, 'utf-8')
            return { password: password.trim() }
          } catch (err) {
            console.error(`[admin-data.ts] Error reading admin password file:`, err)
            // If we can't read the file, create a new one
            const newPassword = generateRandomPassword(16)
            await fs.writeFile(adminPasswordFile, newPassword)
            console.log(`[admin-data.ts] Created new admin password after read failure`)
            return { password: newPassword }
          }
        } else {
          // Generate a new password if it doesn't exist
          console.log(`[admin-data.ts] Admin password file doesn't exist, generating new password`)
          const newPassword = generateRandomPassword(16)
          
          // Make sure directory exists before writing
          await fs.mkdir(path.dirname(adminPasswordFile), { recursive: true })
          
          try {
            await fs.writeFile(adminPasswordFile, newPassword)
            console.log(`[admin-data.ts] Successfully wrote new admin password to: ${adminPasswordFile}`)
            
            // Set permissive permissions to avoid access issues
            try {
              await fs.chmod(adminPasswordFile, 0o666)
            } catch (chmodErr) {
              console.warn(`[admin-data.ts] Could not set file permissions:`, chmodErr)
            }
            
            return { password: newPassword }
          } catch (writeErr) {
            console.error(`[admin-data.ts] Failed to write admin password:`, writeErr)
            // Even if we can't write to file, return the generated password
            return { 
              password: newPassword,
              error: 'Could not save password to file, please check permissions'
            }
          }
        }
      } 
      else if (type === 'admin-users') {
        // Return admin users if the file exists
        if (existsSync(adminUsersFile)) {
          const adminUsersData = await fs.readFile(adminUsersFile, 'utf-8')
          return { users: JSON.parse(adminUsersData) }
        } else {
          // Initialize with empty array
          await fs.writeFile(adminUsersFile, '[]')
          return { users: [] }
        }
      } 
      else if (type === 'authenticated-users') {
        // Return authenticated users if the file exists
        console.log(`[admin-data.ts] Retrieving authenticated users from: ${authenticatedUsersFile}`)
        
        try {
          // Ensure the directory exists first
          await fs.mkdir(path.dirname(authenticatedUsersFile), { recursive: true })
          
          if (existsSync(authenticatedUsersFile)) {
            console.log(`[admin-data.ts] Authenticated users file exists, reading contents`)
            try {
              const authUsersData = await fs.readFile(authenticatedUsersFile, 'utf-8')
              console.log(`[admin-data.ts] Read ${authUsersData.length} characters from authenticated users file`)
              
              try {
                const users = JSON.parse(authUsersData)
                console.log(`[admin-data.ts] Successfully parsed JSON, found ${users.length} authenticated users`)
                // Validate that it's really an array
                if (!Array.isArray(users)) {
                  console.error(`[admin-data.ts] Authenticated users data is not an array, resetting`)
                  await fs.writeFile(authenticatedUsersFile, '[]')
                  return { users: [] }
                }
                return { users }
              } catch (parseError) {
                console.error('[admin-data.ts] Error parsing authenticated users file:', parseError)
                // If file is corrupted, reset it
                console.log(`[admin-data.ts] Resetting corrupted authenticated users file`)
                await fs.writeFile(authenticatedUsersFile, '[]')
                return { users: [] }
              }
            } catch (readError) {
              console.error(`[admin-data.ts] Error reading authenticated users file:`, readError)
              // If we can't read the file, create a new one
              console.log(`[admin-data.ts] Creating new authenticated users file after read failure`)
              await fs.writeFile(authenticatedUsersFile, '[]')
              return { users: [] }
            }
          } else {
            // Initialize with empty array
            console.log(`[admin-data.ts] Creating new authenticated users file: ${authenticatedUsersFile}`)
            await fs.writeFile(authenticatedUsersFile, '[]')
            
            // Set permissive permissions to avoid access issues
            try {
              await fs.chmod(authenticatedUsersFile, 0o666)
              console.log(`[admin-data.ts] Set permissions on authenticated users file`)
            } catch (chmodErr) {
              console.warn(`[admin-data.ts] Could not set file permissions:`, chmodErr)
            }
            
            return { users: [] }
          }
        } catch (err) {
          console.error(`[admin-data.ts] Unexpected error handling authenticated users:`, err)
          return { 
            users: [], 
            error: 'Failed to access authenticated users data'
          }
        }
      } else {
        return { error: 'Invalid data type requested' }
      }
    } catch (error) {
      console.error('[admin-data.ts] Error retrieving data:', error)
      return { error: 'Failed to retrieve data' }
    }
  }
  
  // Handle POST request to update data
  else if (event.req.method === 'POST') {
    try {
      // Get body data
      const body = await readBody(event)
      const { type, data } = body
      
      if (!type || !data) {
        return { error: 'Missing type or data parameters' }
      }
      
      if (type === 'admin-users') {
        // Save admin users
        await fs.writeFile(adminUsersFile, JSON.stringify(data))
        return { success: true }
      } 
      else if (type === 'authenticated-users') {
        // Validate data is an array
        if (!Array.isArray(data)) {
          console.error('[admin-data.ts] Invalid authenticated users data (not an array):', typeof data)
          return { error: 'Invalid data format - must be an array' }
        }
        
        try {
          // Make sure the directory exists
          const dirPath = path.dirname(authenticatedUsersFile)
          await fs.mkdir(dirPath, { recursive: true, mode: 0o777 })
          
          console.log(`[admin-data.ts] Saving ${data.length} authenticated users to ${authenticatedUsersFile}`)
          console.log(`[admin-data.ts] User data sample: ${JSON.stringify(data.slice(0, 2))}`)
          
          await fs.writeFile(authenticatedUsersFile, JSON.stringify(data))
          
          // Verify the file was written correctly
          const fileExists = existsSync(authenticatedUsersFile)
          console.log(`[admin-data.ts] File exists after write: ${fileExists}`)
          
          if (fileExists) {
            const writtenData = await fs.readFile(authenticatedUsersFile, 'utf-8')
            const parsedData = JSON.parse(writtenData)
            console.log(`[admin-data.ts] Successfully wrote and verified ${parsedData.length} users`)
          }
          
          return { success: true }
        } catch (err) {
          const writeError: any = err;
          console.error('[admin-data.ts] Error writing authenticated users file:', writeError)
          return { error: `Failed to save authenticated users: ${writeError.message}` }
        }
      }
      else if (type === 'password' && typeof data === 'string') {
        // Update admin password
        await fs.writeFile(adminPasswordFile, data)
        return { success: true }
      }
      else if (type === 'verify-admin-password') {
        // Verify the provided password against the stored admin password
        console.log('[admin-data.ts] Verifying admin password')
        
        try {
          // Get the password from either data or password field for backward compatibility
          const passwordInput = typeof body.data === 'string' ? body.data : 
                             typeof body.password === 'string' ? body.password : null;
          
          console.log(`[admin-data.ts] Password input present: ${passwordInput !== null}`)
          
          if (!passwordInput) {
            console.error('[admin-data.ts] No password provided in request')
            return {
              success: false,
              message: 'No password provided'
            }
          }
          
          if (!existsSync(adminPasswordFile)) {
            console.error('[admin-data.ts] Admin password file does not exist for verification')
            return { 
              success: false, 
              message: 'Admin password not configured'
            }
          }
          
          const storedPassword = await fs.readFile(adminPasswordFile, 'utf-8')
          // Ensure we clean up any whitespace, newlines, etc.
          const cleanStoredPassword = storedPassword.trim();
          const cleanInputPassword = passwordInput.trim();
          
          console.log(`[admin-data.ts] Password verification: Input length=${cleanInputPassword.length}, Stored length=${cleanStoredPassword.length}`)
          
          // Log first and last characters for debugging (safely)
          if (cleanStoredPassword.length > 0) {
            console.log(`[admin-data.ts] Stored password first char: ${cleanStoredPassword[0]}, last char: ${cleanStoredPassword[cleanStoredPassword.length - 1]}`)
          }
          
          const passwordMatches = cleanInputPassword === cleanStoredPassword
          
          console.log(`[admin-data.ts] Password verification result: ${passwordMatches ? 'success' : 'failed'}`)
          
          return { 
            success: passwordMatches,
            message: passwordMatches 
              ? 'Password verified successfully' 
              : 'Invalid administrator password'
          }
        } catch (error) {
          console.error('[admin-data.ts] Error during password verification:', error)
          return { 
            success: false, 
            message: 'Error verifying password'
          }
        }
      }
      else {
        return { error: 'Invalid data type' }
      }
    } catch (error) {
      console.error('[admin-data.ts] Error updating data:', error)
      return { error: 'Failed to update data' }
    }
  }
  
  // Return error for unsupported methods
  return { error: 'Unsupported method' }
})

// Helper function to generate random password
function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  
  // Server-side environment, use Node.js crypto
  const { randomFillSync } = require('crypto')
  randomFillSync(randomValues)
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length)
  }
  
  return result
}
