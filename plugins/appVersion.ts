// plugins/appVersion.ts
import { defineNuxtPlugin } from '#app'
import pkg from '../package.json'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      appPackage: {
        version: pkg.version,
        name: pkg.name
      }
    }
  }
})
