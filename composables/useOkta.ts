// composables/useOkta.ts
import { inject } from 'vue'
import { OktaAuth } from '@okta/okta-auth-js'
import { globalOktaAuth } from '~/plugins/okta.client'

// Create a cache to avoid recreating instances
let cachedOktaInstance: OktaAuth | null = null;

// Track initialization attempts to prevent loops
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 2;

export const useOkta = (): OktaAuth | null => {
  // Server-side: always return null
  if (!process.client) return null
  
  // Safety mechanism to prevent infinite loops or excessive initialization attempts
  if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
    console.warn('[useOkta] Maximum initialization attempts reached, returning null');
    return null;
  }
  
  initializationAttempts++;
  
  // If we have a cached instance from a previous call, return it
  if (cachedOktaInstance) {
    return cachedOktaInstance
  }
  
  // Try all possible injection methods in order of reliability
  let okta: OktaAuth | null = null;
  
  // Method 1: Try the global exported instance from plugin (most reliable)
  if (globalOktaAuth) {
    okta = globalOktaAuth
  }
  
  // Method 2: Try window object (emergency fallback that works well)
  if (!okta && typeof window !== 'undefined') {
    try {
      if (Object.prototype.hasOwnProperty.call(window, '__oktaAuth')) {
        console.log('[useOkta] Using window.__oktaAuth')
        okta = (window as any).__oktaAuth
      }
    } catch (windowError) {
      console.warn('[useOkta] Error accessing window.__oktaAuth:', windowError)
    }
  }
  
  // Method 3: Try Vue inject - AVOID USING THIS DIRECTLY as it can cause the error
  // "Cannot redefine property: $okta"
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
  
  // Method 4: Use nuxtApp payload - safer than direct inject
  if (!okta) {
    try {
      const nuxtApp = useNuxtApp()
      if (nuxtApp && nuxtApp.payload && nuxtApp.payload.okta) {
        console.log('[useOkta] Using Okta from nuxtApp payload')
        okta = nuxtApp.payload.okta as OktaAuth
      }
    } catch (err) {
      console.debug('[useOkta] Could not access Nuxt app payload:', err)
    }
  }
  
  // Last resort: Create a new instance if we have config
  if (!okta) {
    console.warn('[useOkta] All injection methods failed, creating new instance')
    try {
      const config = useRuntimeConfig()
      if (config && config.public && config.public.oktaIssuer && config.public.oktaClientId) {
        console.log('[useOkta] Creating new Okta instance from config')
        try {
          const newOkta = new OktaAuth({
            issuer: String(config.public.oktaIssuer),
            clientId: String(config.public.oktaClientId),
            redirectUri: window.location.origin + '/login/callback',
            responseType: 'code',
            pkce: true,
            scopes: ['openid', 'profile', 'email'],
            tokenManager: {
              autoRenew: true,
              secure: true
            }
          })
          
          // Save to window with safer approach - using try/catch for safety
          if (typeof window !== 'undefined') {
            try {
              Object.defineProperty(window, '__oktaAuth', {
                value: newOkta,
                writable: true,           // allow future assignment
                configurable: true        // allow redefinition
              })
            } catch (e) {
              console.warn('[useOkta] Failed to define window.__oktaAuth:', e)
              // fallback to assignment, overwrites directly
              try {
                ;(window as any).__oktaAuth = newOkta
              } catch (assignErr) {
                console.error('[useOkta] Direct overwrite of window.__oktaAuth failed:', assignErr)
              }
            }
          }
          
          // Cache the new instance
          cachedOktaInstance = newOkta;
          return newOkta;
        } catch (oktaError) {
          console.error('[useOkta] Failed to create Okta instance:', oktaError);
        }
      } else {
        console.error('[useOkta] Missing Okta configuration');
      }
    } catch (err) {
      console.error('[useOkta] Failed to create fallback Okta instance:', err)
    }
  } else {
    // Cache the found instance for future calls
    cachedOktaInstance = okta;
  }
  
  return okta;
}
