// This plugin hydrates Pinia uiState from localStorage on client only
import { useUIState } from '@/stores/uiState'

export default defineNuxtPlugin(() => {
  if (process.client) {
    const uiState = useUIState()
    uiState.hydrateFromLocalStorage()
  }
})
