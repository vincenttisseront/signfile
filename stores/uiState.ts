import { defineStore } from 'pinia'

// Certificate management state removed

export interface UIState {
  hydrated: boolean
}

const defaultState: UIState = {
  hydrated: false,
}

export const useUIState = defineStore('uiState', {
  state: (): UIState => ({ ...defaultState }),
  actions: {
    hydrateFromLocalStorage() {
      this.hydrated = true
    },
    reset() {
      Object.assign(this, { ...defaultState })
    }
  }
})
