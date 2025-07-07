/**
 * Ultra minimal health check - Just returns 200 OK
 * Minimal dependencies
 */
import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return { alive: true }
})
