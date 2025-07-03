// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
    './plugins/**/*.{js,ts}',
    './assets/css/main.css'
  ],
  theme: {
    extend: {
      colors: {
        modernity: 'var(--color-modernity)',
        'modernity-90': 'var(--color-modernity-90)',
        'modernity-75': 'var(--color-modernity-75)',
        'modernity-50': 'var(--color-modernity-50)',
        'modernity-25': 'var(--color-modernity-25)',
        'modernity-10': 'var(--color-modernity-10)',
        'modernity-5': 'var(--color-modernity-5)',
        
        care: 'var(--color-care)',
        
        security: 'var(--color-security)',
        'security-90': 'var(--color-security-90)',
        'security-75': 'var(--color-security-75)',
        'security-50': 'var(--color-security-50)',
        'security-25': 'var(--color-security-25)',
        'security-10': 'var(--color-security-10)',
        'security-5': 'var(--color-security-5)',
        
        currency: 'var(--color-currency)',
        'currency-90': 'var(--color-currency-90)',
        'currency-75': 'var(--color-currency-75)',
        'currency-50': 'var(--color-currency-50)',
        'currency-25': 'var(--color-currency-25)',
        'currency-10': 'var(--color-currency-10)',
        'currency-5': 'var(--color-currency-5)',
        
        energy: 'var(--color-energy)',
        'energy-90': 'var(--color-energy-90)',
        'energy-75': 'var(--color-energy-75)',
        'energy-50': 'var(--color-energy-50)',
        'energy-25': 'var(--color-energy-25)',
        'energy-10': 'var(--color-energy-10)',
        'energy-5': 'var(--color-energy-5)',
        
        // Semantic aliases for better naming in components
        primary: 'var(--color-security)',
        'primary-light': 'var(--color-security-75)',
        secondary: 'var(--color-currency)',
        danger: 'var(--color-energy)',
        background: 'var(--color-care)',
        foreground: 'var(--color-modernity)',
      },
    },
  },
  plugins: [],
}

export default config
