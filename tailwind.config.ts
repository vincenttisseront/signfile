// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        modernity: '#140309', // Modernity
        care: '#fffdf6',     // Care
        security: '#8f40ff', // Security
        currency: '#64ffa2', // Currency
        energy: '#ff5249',   // Energy
      },
    },
  },
  plugins: [],
}

export default config
