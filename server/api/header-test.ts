import { defineEventHandler } from 'h3'
import logger from '../utils/logger'

/**
 * Header diagnostic endpoint
 * Returns information about HTTP headers received and sent
 * Useful for debugging download issues
 */
export default defineEventHandler((event) => {
  logger.info('header-test', 'Header diagnostic endpoint called')
  
  // Get request headers
  const requestHeaders = event.node.req.headers
  
  // Log headers for debugging
  logger.debug('header-test', 'Request headers:', JSON.stringify(requestHeaders))
  
  // Parse user agent and browser capabilities
  const userAgent = requestHeaders['user-agent'] || 'Unknown'
  const browserInfo = getBrowserInfo(userAgent)
  
  // Determine download capabilities based on browser
  const downloadCapabilities = {
    supportsDownloadAttribute: browserInfo.name !== 'IE' && browserInfo.name !== 'Edge Legacy',
    supportsBlob: browserInfo.name !== 'IE' || (browserInfo.name === 'IE' && browserInfo.version >= 10),
    supportsFetch: browserInfo.name !== 'IE' || (browserInfo.name === 'IE' && browserInfo.version >= 10),
    prefersContentDisposition: browserInfo.name === 'Safari' || browserInfo.name === 'IE',
    recommendedMethod: getRecommendedDownloadMethod(browserInfo)
  }
  
  // Set a variety of response headers to test browser behavior
  event.node.res.setHeader('Content-Type', 'application/json')
  event.node.res.setHeader('X-Diagnostic-Test', 'true')
  event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  event.node.res.setHeader('Pragma', 'no-cache')
  event.node.res.setHeader('Expires', '0')
  
  // Add CORS headers
  event.node.res.setHeader('Access-Control-Allow-Origin', '*')
  event.node.res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  event.node.res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Diagnostic-Test, Content-Length')
  
  // Get response headers after setting them
  const responseHeaders = event.node.res.getHeaders()
  
  // Return diagnostic information
  return {
    success: true,
    requestHeaders: filterSensitiveHeaders(requestHeaders),
    responseHeaders,
    browserInfo,
    downloadCapabilities,
    recommendedHeaders: getRecommendedHeaders(browserInfo),
    clientInfo: {
      ip: event.node.req.socket.remoteAddress,
      userAgent: requestHeaders['user-agent'],
      acceptHeader: requestHeaders['accept'],
      acceptEncoding: requestHeaders['accept-encoding']
    },
    serverInfo: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    }
  }
})

// Filter out sensitive headers like cookies and authorization
function filterSensitiveHeaders(headers: Record<string, any>): Record<string, any> {
  const filtered = { ...headers }
  
  // List of sensitive header names to filter
  const sensitiveHeaders = [
    'cookie',
    'authorization',
    'proxy-authorization',
    'x-forwarded-for',
    'x-real-ip'
  ]
  
  // Remove sensitive headers
  sensitiveHeaders.forEach(header => {
    if (header in filtered) {
      filtered[header] = '[FILTERED]'
    }
  })
  
  return filtered
}

/**
 * Parse browser information from User-Agent string
 */
function getBrowserInfo(userAgent: string) {
  const ua = userAgent.toLowerCase()
  let browser = {
    name: 'Unknown',
    version: 0,
    mobile: false,
    os: 'Unknown'
  }
  
  // Detect browser name and version
  if (ua.includes('firefox')) {
    browser.name = 'Firefox'
    browser.version = parseFloat(ua.split('firefox/')[1]) || 0
  } else if (ua.includes('edg/')) {
    browser.name = 'Edge'
    browser.version = parseFloat(ua.split('edg/')[1]) || 0
  } else if (ua.includes('edge/')) {
    browser.name = 'Edge Legacy'
    browser.version = parseFloat(ua.split('edge/')[1]) || 0
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser.name = 'Opera'
    browser.version = parseFloat(ua.includes('opr/') ? ua.split('opr/')[1] : ua.split('opera/')[1]) || 0
  } else if (ua.includes('chrome/')) {
    browser.name = 'Chrome'
    browser.version = parseFloat(ua.split('chrome/')[1]) || 0
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser.name = 'Safari'
    browser.version = parseFloat(ua.split('version/')[1]) || 0
  } else if (ua.includes('msie ')) {
    browser.name = 'IE'
    browser.version = parseFloat(ua.split('msie ')[1]) || 0
  } else if (ua.includes('trident/')) {
    browser.name = 'IE'
    browser.version = parseFloat(ua.split('rv:')[1]) || 0
  }
  
  // Detect mobile
  browser.mobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')
  
  // Detect OS
  if (ua.includes('windows')) {
    browser.os = 'Windows'
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    browser.os = 'MacOS'
  } else if (ua.includes('linux')) {
    browser.os = 'Linux'
  } else if (ua.includes('android')) {
    browser.os = 'Android'
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    browser.os = 'iOS'
  }
  
  return browser
}

/**
 * Get recommended download method based on browser
 */
function getRecommendedDownloadMethod(browserInfo: any) {
  if (browserInfo.name === 'Safari') {
    return 'iframe or direct form submission'
  } else if (browserInfo.name === 'IE') {
    return browserInfo.version >= 10 ? 'msSaveBlob' : 'iframe'
  } else if (browserInfo.name === 'Edge Legacy') {
    return 'msSaveBlob'
  } else {
    return 'fetch API with Blob or direct form submission'
  }
}

/**
 * Get recommended headers based on browser
 */
function getRecommendedHeaders(browserInfo: any) {
  const commonHeaders = {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="example.txt"',
    'Content-Length': '1234',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
  
  if (browserInfo.name === 'Safari') {
    return {
      ...commonHeaders,
      'X-Download-Options': 'noopen'
    }
  } else if (browserInfo.name === 'IE' || browserInfo.name === 'Edge Legacy') {
    return {
      ...commonHeaders,
      'X-Content-Type-Options': 'nosniff',
      'X-Download-Options': 'noopen'
    }
  } else {
    return commonHeaders
  }
}