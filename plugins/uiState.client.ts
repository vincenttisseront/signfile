import { useUIState } from '@/stores/uiState'

export default defineNuxtPlugin(() => {
  const uiState = useUIState()
  uiState.hydrateFromLocalStorage()
})
