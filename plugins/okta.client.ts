// filepath: plugins/okta.client.ts
import { OktaAuth } from '@okta/okta-auth-js'

console.log('[okta.client.ts] Initializing Okta plugin...')

// Declare global types for Okta
declare global {
  interface Window {
    __oktaAuth?: OktaAuth;
    __oktaInitialized?: boolean;
    __oktaInitializationStarted?: boolean;
    __oktaInitCount?: number;
  }
}

// Track initialization to prevent loops
if (typeof window !== 'undefined') {
  if (!window.__oktaInitCount) {
    window.__oktaInitCount = 0;
  } else {
    window.__oktaInitCount++;
  }
  
  // If we've tried to initialize more than 3 times, there's likely a loop
  if (window.__oktaInitCount > 3) {
    console.warn('[okta.client.ts] ⚠️ Detected potential initialization loop, skipping init');
  }
}

// Simple check if we're in HMR mode during development
const isHotReload = typeof window !== 'undefined' && 
                   (window as any).__VUE_HMR_RUNTIME__ !== undefined;

// Create a global variable to store the Okta instance
let globalOktaAuth: OktaAuth | null = null;

// Export the global Okta instance directly so composables can import it
export { globalOktaAuth };

// Also provide a getter function for more flexibility
export function getOktaAuth(): OktaAuth | null {
  if (typeof window !== 'undefined') {
    return window.__oktaAuth || null;
  }
  return null;
}

// Simple plugin that just provides the Okta instance
export default defineNuxtPlugin(() => {
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
  
  // Prevent initialization loop during hot reload
  if (isHotReload && window.__oktaInitialized) {
    console.log('[okta.client.ts] Hot reload detected, skipping re-initialization')
    // Return the existing instance if available
    if (globalOktaAuth) {
      return {
        provide: {
          okta: globalOktaAuth,
          oktaAuth: globalOktaAuth
        }
      }
    }
    return {
      provide: {
        okta: null,
        oktaAuth: null
      }
    }
  }
  
  // Hard limit on initialization attempts to break potential loops
  if (typeof window !== 'undefined' && window.__oktaInitCount && window.__oktaInitCount > 3) {
    console.warn('[okta.client.ts] Too many initialization attempts, likely in a loop. Returning null.')
    return {
      provide: {
        okta: null,
        oktaAuth: null
      }
    }
  }
  
  // More reliable initialization check
  // This prevents the initialization loop that can occur with HMR or plugin reloading
  if (globalOktaAuth) {
    console.log('[okta.client.ts] Okta instance already exists globally, reusing it');
    // Return the type the plugin is expecting - always consistent return type
    return {
      provide: {
        okta: globalOktaAuth,
        oktaAuth: globalOktaAuth
      }
    }
  }
  
  // Check for window.__oktaAuth first as this is our most reliable global reference
  if (typeof window !== 'undefined' && (window as any).__oktaAuth) {
    console.log('[okta.client.ts] Found window.__oktaAuth, reusing it');
    globalOktaAuth = (window as any).__oktaAuth;
    return {
      provide: {
        okta: globalOktaAuth,
        oktaAuth: globalOktaAuth
      }
    }
  }
  
  // Additional safeguard against duplicate initialization
  if (typeof window !== 'undefined' && (window as any).__oktaInitializationStarted) {
    console.log('[okta.client.ts] Okta initialization already in progress, waiting...');
    
    // We'll return an empty provider for now, the app should use the global getter
    return {
      provide: {
        okta: null,
        oktaAuth: null
      }
    }
  }
  
  // Set the initialization flag
  if (typeof window !== 'undefined') {
    (window as any).__oktaInitializationStarted = true;
  }

  try {
    const config = useRuntimeConfig()
    const issuer = config.public.oktaIssuer
    const clientId = config.public.oktaClientId
    const redirectUri = window.location.origin + '/login/callback'
    
    console.log('[okta.client.ts] Environment check:')
    console.log(`- Issuer: ${issuer ? '✅ Set' : '❌ Missing'}`)
    console.log(`- Client ID: ${clientId ? '✅ Set' : '❌ Missing'}`)
    console.log(`- Redirect URI: ${redirectUri}`)
    console.log(`- Current Origin: ${window.location.origin}`)
    
    if (!issuer || !clientId) {
      console.error('[okta.client.ts] ❌ Missing Okta config – aborting initialization')
      return {
        provide: {
          okta: null,
          oktaAuth: null
        }
      }
    }

    // Don't clean up PKCE state on initialization as this may interfere with ongoing auth flows
    // Only clean up if we're not on the callback page and only clean up expired PKCE state
    if (!window.location.pathname.includes('/login/callback')) {
      console.log('[okta.client.ts] Not on callback page, checking for expired PKCE state');
      
      try {
        const now = Date.now();
        const twoHoursAgo = now - (2 * 60 * 60 * 1000); // 2 hours in ms
        
        // Get all storage keys first to avoid issues with changing storage during iteration
        const keysToCheck = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('okta-') && !key.includes('signfile') && 
              !key.includes('pkce-storage')) {
            keysToCheck.push(key);
          }
        }
        
        // Now process each key
        for (const key of keysToCheck) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              // If the item has a timestamp and it's old, remove it
              if (parsed && parsed.timestamp && parsed.timestamp < twoHoursAgo) {
                console.log(`[okta.client.ts] Removing expired state (${Math.round((now - parsed.timestamp)/60000)}min old):`, key);
                localStorage.removeItem(key);
              }
            }
          } catch (parseErr) {
            // If we can't parse it, leave it alone to be safe
            console.log(`[okta.client.ts] Couldn't parse item ${key}, leaving it alone`);
          }
        }
        
        // NEVER remove PKCE storage during initialization
        console.log('[okta.client.ts] Preserving PKCE state for potential auth completion');
      } catch (e) {
        console.warn('[okta.client.ts] Error cleaning up localStorage:', e);
      }
    } else {
      console.log('[okta.client.ts] On callback page, preserving ALL state for token exchange');
    }

    // Create a consistent state key that will be used for storing PKCE state
    const stateKey = 'signfile-auth-state';

    const oktaAuth = new OktaAuth({
      issuer: String(config.public.oktaIssuer),
      clientId: String(config.public.oktaClientId),
      redirectUri: window.location.origin + '/login/callback',
      responseType: ['code'], // AUTHORIZATION CODE FLOW with PKCE
      pkce: true, // Enable PKCE
      scopes: ['openid', 'profile', 'email'],
      cookies: {
        secure: false,
        sameSite: 'none'
      },
      devMode: true,
      tokenManager: {
        autoRenew: true,
        expireEarlySeconds: 120,
        storageKey: 'signfile_okta_tokens',
        storage: 'localStorage',
        secure: false
      }
    })
    
    // Initialize token verification
    console.log('[okta.client.ts] Checking for existing token state...');
    try {
      // Check if we have tokens already
      const existingTokens = oktaAuth.tokenManager.getTokensSync();
      if (existingTokens && Object.keys(existingTokens).length > 0) {
        console.log('[okta.client.ts] Found existing tokens in storage');
      } else {
        console.log('[okta.client.ts] No existing tokens found in storage');
      }
    } catch (e) {
      console.warn('[okta.client.ts] Error checking existing tokens:', e);
    }
    
    // Save to global variable for direct access if needed
    globalOktaAuth = oktaAuth
    
    // Mark as initialized in window global
    window.__oktaInitialized = true
    
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
