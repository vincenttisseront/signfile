// Fix for Okta authentication errors where o.offset is not a function
// This file should be loaded before Okta's scripts

// Add default export for Nuxt 3 compatibility
export default defineNuxtPlugin(() => {
  // Plugin functionality
  console.log('[okta-fixes.client.js] Initializing Okta fixes plugin');
  console.log(`[okta-fixes.client.js] typeof atob: ${typeof atob}`);
  console.log(`[okta-fixes.client.js] process.client: ${typeof process !== 'undefined' ? process.client : 'undefined'}`);
});

if (typeof window !== 'undefined') {
  // Add a console message to know this script is running
  console.log('[okta-fixes.client.js] Loading fixes for Okta authentication');
  
  // This is used by MutationObserver in Okta's code
  window.addEventListener('DOMContentLoaded', function() {
    console.log('[okta-fixes.client.js] DOM loaded, applying fixes');
    
    // Wait for jQuery to load if it's being used
    setTimeout(function() {
      // Polyfill for jQuery's offset() if it doesn't exist
      // This will fix the "o.offset is not a function" error
      if (typeof window.jQuery !== 'undefined') {
        console.log('[okta-fixes.client.js] jQuery detected, checking for offset function');
        
        const $ = window.jQuery;
        if ($.fn && !$.fn.offset) {
          console.log('[okta-fixes.client.js] Adding offset function to jQuery');
          
          // Simple offset function implementation
          $.fn.offset = function() {
            if (!this[0]) {
              return { top: 0, left: 0 };
            }
            
            const rect = this[0].getBoundingClientRect();
            return {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX
            };
          };
        }
      } else {
        console.log('[okta-fixes.client.js] jQuery not found, applying global fixes');
        
        // Add a global fix that will be applied to any objects
        // that might be missing the offset function
        const originalGetElementById = document.getElementById;
        document.getElementById = function(id) {
          const element = originalGetElementById.call(document, id);
          if (element && !element.offset) {
            element.offset = function() {
              const rect = this.getBoundingClientRect();
              return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
              };
            };
          }
          return element;
        };
        
        // Also patch querySelector and querySelectorAll
        const enhanceElement = function(element) {
          if (element && !element.offset) {
            element.offset = function() {
              const rect = this.getBoundingClientRect();
              return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
              };
            };
          }
          return element;
        };
        
        const originalQuerySelector = Element.prototype.querySelector;
        Element.prototype.querySelector = function(selector) {
          const element = originalQuerySelector.call(this, selector);
          return enhanceElement(element);
        };
        
        const originalDocQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
          const element = originalDocQuerySelector.call(this, selector);
          return enhanceElement(element);
        };
      }
      
      console.log('[okta-fixes.client.js] Fixes applied successfully');
    }, 500); // Small delay to ensure everything is loaded
  });
}
