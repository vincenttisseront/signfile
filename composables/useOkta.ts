import { globalOktaAuth } from '~/plugins/okta.client'

export function useOkta() {
  return globalOktaAuth
}
