// This file enhances the SignFile.vue component with debugging capabilities
// and improved event handling. Import and use it in pages/index.vue to replace
// the existing SignFile component.

import SignFile from '../components/SignFile.vue';
import { h, defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'EnhancedSignFile',
  setup() {
    const debugLogs = ref([]);
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Intercept console messages
    const setupConsoleInterception = () => {
      console.log = (...args) => {
        debugLogs.value.push({
          type: 'log',
          time: new Date().toLocaleTimeString(),
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ')
        });
        originalConsoleLog(...args);
      };
      
      console.error = (...args) => {
        debugLogs.value.push({
          type: 'error',
          time: new Date().toLocaleTimeString(),
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ')
        });
        originalConsoleError(...args);
      };
    };
    
    // Monitor form submissions
    const monitorFormSubmissions = () => {
      const originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function() {
        debugLogs.value.push({
          type: 'form',
          time: new Date().toLocaleTimeString(),
          message: `Form submitted: ${this.action || 'no action'}`
        });
        return originalSubmit.apply(this, arguments);
      };
      
      // Also monitor fetch requests
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        debugLogs.value.push({
          type: 'fetch',
          time: new Date().toLocaleTimeString(),
          message: `Fetch request to ${url}, method: ${options?.method || 'GET'}`
        });
        
        return originalFetch.apply(this, arguments)
          .then(response => {
            debugLogs.value.push({
              type: 'fetch',
              time: new Date().toLocaleTimeString(),
              message: `Fetch response from ${url}: status ${response.status}`
            });
            return response;
          })
          .catch(error => {
            debugLogs.value.push({
              type: 'fetch',
              time: new Date().toLocaleTimeString(),
              message: `Fetch error for ${url}: ${error.message}`
            });
            throw error;
          });
      };
    };
    
    // Restore original console functions
    const restoreConsole = () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
    
    onMounted(() => {
      setupConsoleInterception();
      monitorFormSubmissions();
      
      console.log('Enhanced SignFile component mounted with debugging');
      
      // Add specific click handler to the sign button
      setTimeout(() => {
        const signButton = document.querySelector('button[type="submit"]');
        if (signButton) {
          const originalOnClick = signButton.onclick;
          
          signButton.addEventListener('click', function(event) {
            console.log('Sign button clicked!');
            debugLogs.value.push({
              type: 'event',
              time: new Date().toLocaleTimeString(),
              message: 'Sign button clicked'
            });
            
            // Let the original handler run
            if (originalOnClick) {
              originalOnClick.call(this, event);
            }
          });
          
          console.log('Added click handler to sign button');
        } else {
          console.error('Could not find sign button to enhance');
        }
      }, 500);
    });
    
    return () => [
      // Render the original SignFile component
      h(SignFile),
      
      // Render debug panel if there are logs
      debugLogs.value.length > 0 ? 
        h('div', { 
          class: 'mt-8 p-4 bg-security/5 rounded-lg border border-security/20' 
        }, [
          h('h3', { class: 'text-lg font-semibold mb-2' }, 'Debug Logs'),
          h('div', { 
            class: 'bg-modernity text-care p-2 rounded max-h-40 overflow-y-auto text-sm font-mono' 
          }, [
            h('pre', debugLogs.value.map(log => 
              `[${log.time}][${log.type}] ${log.message}`
            ).join('\n'))
          ]),
          h('button', {
            class: 'btn btn-sm btn-outline mt-2',
            onClick: () => { debugLogs.value = []; }
          }, 'Clear Logs')
        ]) : null
    ];
  }
});