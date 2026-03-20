import { OktaAuth } from '@okta/okta-auth-js'

// Shared OktaAuth instance — importable by composables
export let globalOktaAuth: OktaAuth | null = null

export default defineNuxtPlugin(() => {
  // Reuse existing instance (HMR)
  if (globalOktaAuth) {
    return { provide: { okta: globalOktaAuth, oktaAuth: globalOktaAuth } }
  }

  const config = useRuntimeConfig()
  const issuer = config.public.oktaIssuer
  const clientId = config.public.oktaClientId

  if (!issuer || !clientId) {
    return { provide: { okta: null as OktaAuth | null, oktaAuth: null as OktaAuth | null } }
  }

  try {
    const oktaAuth = new OktaAuth({
      issuer: String(issuer),
      clientId: String(clientId),
      redirectUri: window.location.origin + '/login/callback',
      responseType: ['code'],
      pkce: true,
      scopes: ['openid', 'profile', 'email'],
      tokenManager: {
        autoRenew: true,
        expireEarlySeconds: 120,
        storageKey: 'signfile_okta_tokens',
        storage: 'localStorage',
      }
    })

    globalOktaAuth = oktaAuth

    return { provide: { okta: oktaAuth, oktaAuth: oktaAuth } }
  } catch {
    return { provide: { okta: null as OktaAuth | null, oktaAuth: null as OktaAuth | null } }
  }
})
