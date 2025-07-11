// Layout system plugin for securityconsole
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
      const height = window.innerHeight;
      
      // Set height variable for consistent calculations
      root.style.setProperty('--viewport-height', `${height}px`);
      
      // Set breakpoint variables for consistent use across CSS and JS
      root.style.setProperty('--mobile-breakpoint', '640px');
      root.style.setProperty('--tablet-breakpoint', '768px');
      root.style.setProperty('--desktop-breakpoint', '1024px');
      
      // Adjust layout variables based on screen size
      if (width < 640) {
        // Mobile layout
        root.style.setProperty('--content-max-width', '100%');
        root.style.setProperty('--page-padding', '0.75rem');
        root.style.setProperty('--section-spacing', '1.25rem');
        root.style.setProperty('--form-max-width', '100%');
        root.style.setProperty('--sidebar-width', '280px'); // Wider sidebar for mobile touch
        root.style.setProperty('--admin-sidebar-width', '280px');
        
        // Add mobile class to body
        document.body.classList.add('is-mobile');
        document.body.classList.remove('is-tablet', 'is-desktop');
        
        // Fix any mobile-specific layout issues immediately
        fixLayoutIssues();
      } else if (width < 768) {
        // Small tablet layout
        root.style.setProperty('--content-max-width', '100%');
        root.style.setProperty('--page-padding', '1rem');
        root.style.setProperty('--section-spacing', '1.5rem');
        root.style.setProperty('--form-max-width', '95%');
        root.style.setProperty('--sidebar-width', '250px');
        root.style.setProperty('--admin-sidebar-width', '250px');
        
        // Add tablet class to body
        document.body.classList.add('is-tablet');
        document.body.classList.remove('is-mobile', 'is-desktop');
      } else if (width < 1024) {
        // Large tablet layout
        root.style.setProperty('--content-max-width', '90%');
        root.style.setProperty('--page-padding', '1.5rem');
        root.style.setProperty('--section-spacing', '1.75rem');
        root.style.setProperty('--form-max-width', '80%');
        root.style.setProperty('--sidebar-width', '250px');
        root.style.setProperty('--admin-sidebar-width', '250px');
        
        // Add tablet class to body
        document.body.classList.add('is-tablet');
        document.body.classList.remove('is-mobile', 'is-desktop');
      } else {
        // Desktop layout (default)
        root.style.setProperty('--content-max-width', '1024px');
        root.style.setProperty('--page-padding', '2rem');
        root.style.setProperty('--section-spacing', '2rem');
        root.style.setProperty('--form-max-width', '650px');
        root.style.setProperty('--sidebar-width', '250px');
        root.style.setProperty('--admin-sidebar-width', '250px');
        
        // Add desktop class to body
        document.body.classList.add('is-desktop');
        document.body.classList.remove('is-mobile', 'is-tablet');
      }
      
      // Fix common layout issues
      fixLayoutIssues();
    } catch (error) {
      console.error('Error updating layout variables:', error);
    }
  }
  
  // Additional function to fix common layout issues
  function fixLayoutIssues(): void {
    try {
      // Fix admin sidebar and main sidebar conflicts
      const adminSidebar = document.querySelector('.admin-sidebar') as HTMLElement | null;
      const mainSidebar = document.querySelector('.sidebar') as HTMLElement | null;
      const mainContent = document.querySelector('.main-content') as HTMLElement | null;
      const appContainer = document.querySelector('.app-container') as HTMLElement | null;
      
      // Get current breakpoint
      const width = window.innerWidth;
      const isMobile = width < 768;
      
      // Z-index management for proper stacking
      if (mainSidebar) {
        mainSidebar.style.zIndex = '1000';
      }
      
      if (adminSidebar) {
        // Admin sidebar should be above main sidebar but below modals
        adminSidebar.style.zIndex = isMobile ? '1010' : '1001';
        
        // Ensure it has proper background to avoid see-through issues
        adminSidebar.style.backgroundColor = 'var(--color-care)';
        
        // On mobile, admin sidebar should occupy full width and start at left edge
        if (isMobile) {
          adminSidebar.style.left = '0';
          adminSidebar.style.width = '100%';
        } else {
          adminSidebar.style.left = 'var(--sidebar-width)';
          adminSidebar.style.width = 'var(--admin-sidebar-width)';
        }
        
        // Handle admin sidebar visibility
        if (adminSidebar.classList.contains('open')) {
          document.body.classList.add('admin-sidebar-open');
        } else {
          document.body.classList.remove('admin-sidebar-open');
        }
      }
      
      // Handle main content position based on admin sidebar presence
      if (mainContent && appContainer) {
        if (adminSidebar) {
          appContainer.classList.add('with-admin-sidebar');
        } else {
          appContainer.classList.remove('with-admin-sidebar');
        }
        
        // Always ensure main content is clickable
        mainContent.style.pointerEvents = 'auto';
      }
      
      // Ensure login and modal elements are always above sidebars
      document.querySelectorAll('.modal, .admin-login-modal, [class*="modal"]').forEach((modal: Element) => {
        if (modal instanceof HTMLElement) {
          modal.style.zIndex = '2000';
        }
      });
      
    } catch (error) {
      console.error('Error fixing layout issues:', error);
    }
  }
});
