import { defineEventHandler, getQuery as h3GetQuery } from 'h3'
import logger from '../utils/logger'

/**
 * Test endpoint for file downloads
 * This endpoint generates a test file and forces it to download
 * Use this to test browser download behaviors
 */
export default defineEventHandler(async (event) => {
  logger.info('download-test', 'File download test endpoint called')
  
  // Get the type parameter (default to 'txt')
  const query = h3GetQuery(event)
  const type = (query.type as string) || 'txt'
  
  // Create content based on type
  let content = ''
  let filename = ''
  let contentType = 'application/octet-stream'
  
  if (type === 'cmd') {
    content = `@echo off
echo This is a test CMD file
echo %date% %time%
exit /b 0
`
    filename = 'test-script.cmd'
  } else if (type === 'ps1') {
    content = `# Test PowerShell script
Write-Host "This is a test PowerShell script"
Write-Host "Current date: $(Get-Date)"
exit 0
`
    filename = 'test-script.ps1'
  } else {
    content = `This is a test text file
Generated at: ${new Date().toISOString()}
This file is for testing download functionality.
`
    filename = 'test-file.txt'
  }
  
  // Set all headers needed for proper download
  event.node.res.setHeader('Content-Type', contentType)
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  event.node.res.setHeader('Content-Length', Buffer.byteLength(content))
  // Cache control
  event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  event.node.res.setHeader('Pragma', 'no-cache')
  event.node.res.setHeader('Expires', '0')
  // CORS headers
  event.node.res.setHeader('Access-Control-Allow-Origin', '*')
  event.node.res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
  
  // Log headers for debugging
  const headers = event.node.res.getHeaders()
  logger.debug('download-test', 'Response headers:', JSON.stringify(headers))
  
  // Send the file
  event.node.res.end(content)
  
  logger.info('download-test', `Sent test ${type} file: ${filename}`)
})