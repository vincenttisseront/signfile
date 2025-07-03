// composables/useOkta.ts
import { inject } from 'vue'
import { OktaAuth } from '@okta/okta-auth-js'
import { globalOktaAuth, getOktaAuth } from '~/plugins/okta.client'

// Create a cache to avoid recreating instances
let cachedOktaInstance: OktaAuth | null = null;

export const useOkta = (): OktaAuth | null => {
  // Server-side: always return null
  if (!process.client) return null
  
  // If we have a cached instance from a previous call, return it
  if (cachedOktaInstance) {
    return cachedOktaInstance
  }
  
  // Try all possible methods in order of reliability
  let okta: OktaAuth | null = null;
  
  // Method 1: Try the global exported variable from plugin (most reliable)
  if (globalOktaAuth) {
    console.log('[useOkta] Using globalOktaAuth exported from plugin')
    okta = globalOktaAuth
  }
  
  // Method 2: Use the exported getter function
  if (!okta) {
    const retrievedAuth = getOktaAuth()
    if (retrievedAuth) {
      console.log('[useOkta] Using getOktaAuth() function')
      okta = retrievedAuth
    }
  }
  
  // Method 3: Try window object directly
  if (!okta && typeof window !== 'undefined') {
    try {
      if (window.__oktaAuth) {
        console.log('[useOkta] Using window.__oktaAuth directly')
        okta = window.__oktaAuth
      }
    } catch (windowError) {
      console.warn('[useOkta] Error accessing window.__oktaAuth:', windowError)
    }
  }
  
  // Method 4: Try Vue inject as last resort
  if (!okta) {
    try {
      const injectedOkta = inject<OktaAuth>('okta') || inject<OktaAuth>('oktaAuth')
      if (injectedOkta) {
        console.log('[useOkta] Using injected Okta')
        okta = injectedOkta
      }
    } catch (injectError) {
      console.warn('[useOkta] Error with inject method:', injectError)
    }
  }
  
  // We found a valid Okta instance through one of our methods
  if (okta) {
    // Cache the found instance for future calls
    cachedOktaInstance = okta;
    return okta;
  }
  
  // No Okta instance was found through any method
  console.warn('[useOkta] No Okta instance found. Authentication will not be available.')
  return null;
}
