export function useLayout() {
  const screenWidth = ref(import.meta.client ? window.innerWidth : 1024)

  const isSmallScreen = computed(() => screenWidth.value < 768)
  const isMediumScreen = computed(() => screenWidth.value >= 768 && screenWidth.value < 1024)
  const isLargeScreen = computed(() => screenWidth.value >= 1024)

  let timeout: ReturnType<typeof setTimeout> | undefined
  function updateLayout() {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      screenWidth.value = window.innerWidth
    }, 100)
  }

  if (import.meta.client) {
    onMounted(() => window.addEventListener('resize', updateLayout))
    onUnmounted(() => {
      clearTimeout(timeout)
      window.removeEventListener('resize', updateLayout)
    })
  }

  return { screenWidth, isSmallScreen, isMediumScreen, isLargeScreen, updateLayout }
}
