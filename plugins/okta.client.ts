// filepath: plugins/okta.client.ts
import { OktaAuth } from '@okta/okta-auth-js'

console.log('[okta.client.ts] Initializing Okta plugin...')

// Create a global Okta instance that can be used outside of the plugin system
export let globalOktaAuth: OktaAuth | null = null;

// Flag to track if Okta has been initialized to prevent multiple initializations
let oktaInitialized = false;

export default defineNuxtPlugin((nuxtApp) => {
  console.log('[okta.client.ts] Plugin executing on client')

  // Skip on server
  if (!process.client) {
    console.log('[okta.client.ts] Not running on client, skipping Okta initialization')
    return {
      provide: {
        okta: null,
        oktaAuth: null
      }
    }
  }
  
  // If Okta has already been initialized, skip to prevent duplicate initialization
  if (oktaInitialized) {
    console.log('[okta.client.ts] Okta already initialized, skipping duplicate initialization')
    return {
      provide: {
        okta: globalOktaAuth,
        oktaAuth: globalOktaAuth
      }
    }
  }

  try {
    const config = useRuntimeConfig()
    console.log('[okta.client.ts] Config:', config.public.oktaIssuer, config.public.oktaClientId)

    const oktaAuth = new OktaAuth({
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
    
    // Save to global variable for direct access if needed
    globalOktaAuth = oktaAuth
    
    // Mark as initialized
    oktaInitialized = true
    
    // Optional global fallback (safe define)
    try {
      const existing = Object.getOwnPropertyDescriptor(window, '__oktaAuth')
      if (!existing) {
        Object.defineProperty(window, '__oktaAuth', {
          value: oktaAuth,
          writable: true,
          configurable: true
        })
      } else {
        // fallback to overwrite
        ;(window as any).__oktaAuth = oktaAuth
      }
    } catch (e) {
      console.warn('[okta.client.ts] Failed to define window.__oktaAuth', e)
    }
    
    console.log('[okta.client.ts] Okta provided to Nuxt app successfully')
    
    // ONLY use the return method for providing to Nuxt app - do NOT use nuxtApp.provide()
    return {
      provide: {
        okta: oktaAuth,
        oktaAuth: oktaAuth
      }
    }
  } catch (err) {
    console.error('[okta.client.ts] Failed to initialize Okta:', err)
    return {
      provide: {
        okta: null,
        oktaAuth: null
      }
    }
  }
})
