import { defineStore } from 'pinia'

export interface CertInfo {
  name: string
  data: string // base64 or PEM
  type: string // e.g. 'pfx' or 'pem'
}

export interface UIState {
  certFile: CertInfo | null
  password: string
  certSource: 'upload' | 'stored'
  selectedStoredCert: string
  storedCerts: string[]
  passwordRequired: boolean
  passwordEntered: boolean
  hydrated: boolean // new flag
}

const STORAGE_KEY = 'uiState-v1'

const defaultState: UIState = {
  certFile: null,
  password: '',
  certSource: 'upload',
  selectedStoredCert: '',
  storedCerts: [],
  passwordRequired: false,
  passwordEntered: false,
  hydrated: false,
}

export const useUIState = defineStore('uiState', {
  state: (): UIState => ({ ...defaultState }),
  actions: {
    hydrateFromLocalStorage() {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            Object.assign(this, parsed)
          } catch {}
        }
        this.hydrated = true
      }
    },
    setCertFile(cert: CertInfo | null) {
      (this as any).certFile = cert
      this.save()
    },
    setPassword(password: string) {
      (this as any).password = password
      this.save()
    },
    setCertSource(source: 'upload' | 'stored') {
      (this as any).certSource = source
      this.save()
    },
    setSelectedStoredCert(cert: string) {
      (this as any).selectedStoredCert = cert
      this.save()
    },
    setStoredCerts(certs: string[]) {
      (this as any).storedCerts = certs
      this.save()
    },
    setPasswordRequired(required: boolean) {
      (this as any).passwordRequired = required
      this.save()
    },
    setPasswordEntered(entered: boolean) {
      (this as any).passwordEntered = entered
      this.save()
    },
    save() {
      if (typeof window !== 'undefined') {
        // Save only the state fields, not actions
        const { certFile, password, certSource, selectedStoredCert, storedCerts, passwordRequired, passwordEntered } = this as any
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ certFile, password, certSource, selectedStoredCert, storedCerts, passwordRequired, passwordEntered }))
      }
    },
    reset() {
      Object.assign(this, { ...defaultState })
      this.save()
    }
  }
})
