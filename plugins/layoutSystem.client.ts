export default defineNuxtPlugin(() => {
  const updateHeight = () => {
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`)
  }

  updateHeight()

  let timeout: ReturnType<typeof setTimeout>
  window.addEventListener('resize', () => {
    clearTimeout(timeout)
    timeout = setTimeout(updateHeight, 200)
  })
})
