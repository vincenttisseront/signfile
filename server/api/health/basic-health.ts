/**
 * Simple health check endpoint - no dependencies
 */
import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return {
    status: "healthy", 
    time: new Date().toISOString()
  }
})
