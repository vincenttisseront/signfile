import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// Composable to provide layout utilities across components
export function useLayout() {
  const isSmallScreen = ref(false);
  const isMediumScreen = ref(false);
  const isLargeScreen = ref(false);
  
  // Reactive screen dimensions
  const screenWidth = ref(0);
  const screenHeight = ref(0);
  
  // Current breakpoint from the layout plugin
  const currentBreakpoint = ref('');
  
  // Update screen dimensions and breakpoints
  const updateScreenDimensions = () => {
    if (process.client) {
      screenWidth.value = window.innerWidth;
      screenHeight.value = window.innerHeight;
      
      // Update breakpoint flags
      isSmallScreen.value = screenWidth.value < 640;
      isMediumScreen.value = screenWidth.value >= 640 && screenWidth.value < 1024;
      isLargeScreen.value = screenWidth.value >= 1024;      // Set current breakpoint based on screen size
      if (screenWidth.value < 640) {
        currentBreakpoint.value = 'mobile';
      } else if (screenWidth.value < 768) {
        currentBreakpoint.value = 'small-tablet';
      } else if (screenWidth.value < 1024) {
        currentBreakpoint.value = 'large-tablet';
      } else {
        currentBreakpoint.value = 'desktop';
      }
    }
  };
  
  // Setup resize listener
  onMounted(() => {
    if (process.client) {
      updateScreenDimensions();
      window.addEventListener('resize', updateScreenDimensions);
    }
  });
  
  // Cleanup resize listener
  onBeforeUnmount(() => {
    if (process.client) {
      window.removeEventListener('resize', updateScreenDimensions);
    }
  });
  
  // Determine content class based on screen size
  const contentClass = computed(() => {
    if (isSmallScreen.value) return 'layout-content-mobile';
    if (isMediumScreen.value) return 'layout-content-tablet';
    return 'layout-content-desktop';
  });
  
  // Get appropriate container width based on screen
  const containerWidth = computed(() => {
    if (isSmallScreen.value) return '100%';
    if (isMediumScreen.value) return '90%';
    return 'var(--content-max-width)';
  });
    return {
    isSmallScreen,
    isMediumScreen, 
    isLargeScreen,
    screenWidth,
    screenHeight,
    contentClass,
    containerWidth,    currentBreakpoint,
    // Allow forcing layout updates manually
    updateLayout: () => {
      updateScreenDimensions();
    }
  };
}
