// Layout system plugin for SignFile
// This plugin ensures consistent dimensions and spacing across the application
import { defineNuxtPlugin } from '#app'

interface LayoutUtils {
  updateLayout: () => void;
  getCurrentBreakpoint: () => string;
}

declare module '#app' {
  interface NuxtApp {
    $layout?: LayoutUtils
  }
}

export default defineNuxtPlugin((nuxtApp) => {// Initialize responsive layout behavior
  const debouncedUpdateLayout = debounce(updateLayoutVariables, 250);
  
  nuxtApp.hook('app:mounted', () => {
    if (process.client) {
      // Apply responsive layout adjustments
      updateLayoutVariables();
      
      // Listen for window resize events to update layout
      window.addEventListener('resize', debouncedUpdateLayout);
    }
  });
    // Cleanup event listener when component is unmounted
  // Use Vue's onBeforeUnmount in components instead of here
  // This setup will persist for the app lifecycle
    // Create layout utilities
  const layoutUtils = {
    updateLayout: updateLayoutVariables,
    getCurrentBreakpoint: (): string => {
      if (!process.client) return 'desktop';
      const width = window.innerWidth;
      if (width < 640) return 'mobile';
      if (width < 768) return 'small-tablet';
      if (width < 1024) return 'large-tablet';
      return 'desktop';
    }
  };

  // Expose these utilities through the plugin system
  return {
    provide: {
      layout: layoutUtils
    }
  }
    // Debounce helper to prevent excessive updates during resize
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function(this: any, ...args: Parameters<T>) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }  // Update CSS variables based on viewport
  function updateLayoutVariables(): void {
    try {
      const root = document.documentElement;
      const width = window.innerWidth;
      
      // Adjust layout variables based on screen size
      if (width < 640) {
        // Mobile layout
        root.style.setProperty('--content-max-width', '100%');
        root.style.setProperty('--page-padding', '0.75rem');
        root.style.setProperty('--section-spacing', '1.25rem');
        root.style.setProperty('--form-max-width', '100%');
      } else if (width < 768) {
        // Small tablet layout
        root.style.setProperty('--content-max-width', '100%');
        root.style.setProperty('--page-padding', '1rem');
        root.style.setProperty('--section-spacing', '1.5rem');
        root.style.setProperty('--form-max-width', '95%');
      } else if (width < 1024) {
        // Large tablet layout
        root.style.setProperty('--content-max-width', '90%');
        root.style.setProperty('--page-padding', '1.5rem');
        root.style.setProperty('--section-spacing', '1.75rem');
        root.style.setProperty('--form-max-width', '80%');
      } else {
        // Desktop layout (default)
        root.style.setProperty('--content-max-width', '1024px');
        root.style.setProperty('--page-padding', '2rem');
        root.style.setProperty('--section-spacing', '2rem');
        root.style.setProperty('--form-max-width', '650px');
      }
    } catch (error) {
      console.error('Error updating layout variables:', error);
    }
  }
});
