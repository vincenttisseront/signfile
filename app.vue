<template>
  <div class="app-container text-modernity">
    <!-- Mobile overlay - only shown when sidebar is open on mobile -->
    <div 
      v-if="isSmallScreen && isSidebarOpen" 
      class="fixed inset-0 bg-modernity bg-opacity-50 z-[995]"
      @click="toggleSidebar"
    ></div>
    
    <!-- Sidebar Menu -->
    <aside class="sidebar" :class="{ 'open': isSidebarOpen }">
      <div class="sidebar-logo">
        <span class="text-lg font-bold text-security">SignFile</span>
      </div>
      <!-- Mobile close button -->
      <button v-if="isSmallScreen && isSidebarOpen" 
              @click="toggleSidebar" 
              class="absolute top-3 right-3 text-modernity-50 hover:text-security p-1.5 rounded-full">
        &times;
      </button>
      <nav class="flex flex-col h-[calc(100%-70px)]">
        <div class="flex-grow">
          <NuxtLink to="/" class="menu-item" active-class="active" @click="closeOnMobile">
            <span class="menu-icon">📝</span>
            <span>Sign File</span>
          </NuxtLink>
          <NuxtLink to="/about" class="menu-item" active-class="active" @click="closeOnMobile">
            <span class="menu-icon">ℹ️</span>
            <span>About</span>
          </NuxtLink>
          
          <!-- Admin section with collapsible submenu -->
          <div>
            <div
              class="menu-item"
              :class="{ 'active': $route.path.startsWith('/admin') }"
              @click="toggleAdminSubmenu"
            >
              <span class="menu-icon">⚙️</span>
              <span>Admin</span>
              <span v-if="!authState.isAuthenticated" class="text-[0.675rem] bg-energy/20 text-energy px-1 py-0.5 rounded ml-1">Auth Required</span>
              <span class="menu-item-arrow" :class="{ 'open': showAdminSubmenu }">▶</span>
            </div>
            
            <div class="admin-submenu" :class="{ 'open': showAdminSubmenu }">
              <button 
                class="menu-item"
                :class="{ 'active': isAdminSection('system') }"
                @click="navigateAdminSection('system')"
              >
                <span class="menu-icon">📊</span>
                <span>System Info</span>
              </button>
              <button 
                class="menu-item"
                :class="{ 'active': isAdminSection('certificates') }"
                @click="navigateAdminSection('certificates')"
              >
                <span class="menu-icon">🔐</span>
                <span>Certificate Management</span>
              </button>
              <button 
                class="menu-item"
                :class="{ 'active': isAdminSection('packages') }"
                @click="navigateAdminSection('packages')"
              >
                <span class="menu-icon">📦</span>
                <span>NPM Packages</span>
              </button>
              <button 
                class="menu-item"
                :class="{ 'active': isAdminSection('config') }"
                @click="navigateAdminSection('config')"
              >
                <span class="menu-icon">⚙️</span>
                <span>Configuration</span>
              </button>
              <button 
                class="menu-item"
                :class="{ 'active': isAdminSection('userAdmin') }"
                @click="navigateAdminSection('userAdmin')"
              >
                <span class="menu-icon">👥</span>
                <span>User Admin Rights</span>
              </button>
            </div>
          </div>
        </div>
        <!-- Version Info -->
        <div class="text-center text-[0.675rem] text-modernity-50 mt-auto border-t border-security-10 pt-3">
          <p>{{ appVersion.formattedVersion() }}</p>
        </div>
        
        <!-- Authentication State -->
        <div class="border-t border-security-10 pt-3 pb-2 mt-2">
          <div v-if="!authState.isAuthenticated" class="text-center">
            <p class="text-[0.675rem] mb-2 text-modernity-50">Authentication required for admin access</p>
            <button type="button" @click="loginWithOkta" class="btn btn-primary btn-sm w-full">
              Login with Okta
            </button>
          </div>
          <div v-else class="text-center">
            <p class="text-xs font-medium mb-1">
              👋 <span class="text-security">{{ authState.user?.name || authState.user?.email }}</span>
            </p>
            <button @click="logout" class="btn btn-secondary btn-sm w-full mt-2 text-xs">
              Logout
            </button>
          </div>
        </div>
        <div class="text-xs text-center text-modernity-50 pt-2 border-t border-security-10">
          &copy; {{ new Date().getFullYear() }} SignFile<br>
          iBanFirst - All Rights Reserved
        </div>
      </nav>
    </aside>

    <!-- Mobile menu toggle button - always visible on small screens -->
    <button 
      v-if="isSmallScreen" 
      class="mobile-sidebar-toggle"
      @click="toggleSidebar"
      aria-label="Toggle menu"
    >
      <span v-if="isSidebarOpen">✕</span>
      <span v-else>☰</span>
    </button>
    
    <!-- Main Content Area -->
    <main class="main-content">
      <button v-if="isSmallScreen" class="menu-toggle" @click="toggleSidebar">
        ☰
      </button>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLayout } from '~/composables/useLayout';
import { useOkta } from '~/composables/useOkta';
import { useAppVersion } from '~/composables/useAppVersion';
import { OktaAuth } from '@okta/okta-auth-js';

// Declare global window property for admin section
declare global {
  interface Window {
    _adminSection?: string;
    __oktaAuth?: OktaAuth;
    __oktaInitialized?: boolean;
    __oktaInitializationStarted?: boolean;
    __oktaInitCount?: number;
  }
}

// Get the app version
const appVersion = useAppVersion();

// Use our layout composable to get responsive behavior
const { isSmallScreen } = useLayout();

// Sidebar toggle state
const isSidebarOpen = ref(false);
const showAdminSubmenu = ref(false);

// Toggle sidebar function for mobile view
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
  
  // Update body class for scroll locking
  if (isSidebarOpen.value && isSmallScreen.value) {
    document.body.classList.add('sidebar-open');
  } else {
    document.body.classList.remove('sidebar-open');
  }
  
  // Force layout update
  if (process.client) {
    setTimeout(() => {
      // Update layout variables
      window.dispatchEvent(new Event('resize'));
    }, 10);
  }
};

// Toggle admin submenu visibility
const toggleAdminSubmenu = () => {
  showAdminSubmenu.value = !showAdminSubmenu.value;
};

// Admin navigation section management
const isAdminSection = (section: string) => {
  if (!process.client) return false;
  
  // Check URL parameters for the section
  const urlParams = new URLSearchParams(window.location.search);
  const currentSection = urlParams.get('section');
  
  // Return true if the current section matches
  return currentSection === section;
};

// Navigate to admin section - enhanced version that avoids push errors
const navigateAdminSection = (section: string) => {
  if (!process.client) return;

  try {
    // Set the section via URL parameter without a full page reload
    const currentUrl = new URL(window.location.href);
    
    // If we're already on the admin page, just update the parameter
    if (currentUrl.pathname === '/admin') {
      currentUrl.searchParams.set('section', section);
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Dispatch an event for the Admin component to pick up the change
      window.dispatchEvent(new CustomEvent('admin_section_change', { 
        detail: { section } 
      }));
      
      // Also set a window-level variable for Admin component to read
      // This helps when event handling fails
      window._adminSection = section;
    } else {
      // If we're not on the admin page, navigate there with the section param
      // Use an anchor tag approach to avoid router.push entirely
      const newUrl = `/admin?section=${section}`;
      window.location.href = newUrl;
    }
  } catch (err) {
    console.error('[app.vue] Navigation error:', err);
    // Fallback - use the safest approach to avoid the push error
    try {
      // Set window variable directly, which Admin.vue checks on mount
      window._adminSection = section;
      
      // Only redirect if we're not already on /admin
      if (!window.location.pathname.endsWith('/admin')) {
        window.location.href = `/admin?section=${section}`;
      }
    } catch (fallbackErr) {
      console.error('[app.vue] Fallback navigation also failed:', fallbackErr);
    }
  }
  
  // Close the sidebar on mobile
  closeOnMobile();
};

// Close sidebar when clicking a link on mobile
const closeOnMobile = () => {
  if (isSmallScreen.value) {
    isSidebarOpen.value = false;
    document.body.classList.remove('sidebar-open');
  }
};

// Watch for changes in sidebar state and update body class
watch(isSidebarOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
      
      // Ensure main sidebar is always above admin sidebar
      const mainSidebar = document.querySelector('.sidebar') as HTMLElement;
      const adminSidebar = document.querySelector('.admin-sidebar') as HTMLElement;
      
      if (mainSidebar) {
        mainSidebar.style.zIndex = '1000';
      }
      
      if (adminSidebar) {
        adminSidebar.style.zIndex = '999';
      }
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }
}, { immediate: true });

// Authentication state
const okta = useOkta() as OktaAuth | null;
const authState = reactive({
  isAuthenticated: false,
  user: null as any,
  errorMessage: null as string | null
});

// Authentication methods
async function checkOktaSession() {
  if (!process.client || !okta) {
    authState.errorMessage = 'Okta is not available.';
    return;
  }
  
  try {
    console.log('[App.vue] Checking Okta session status...');
    
    // Check if we have a fresh login success marker
    const loginSuccess = sessionStorage.getItem('okta_login_success');
    if (loginSuccess) {
      console.log('[App.vue] Found login success marker from callback');
      sessionStorage.removeItem('okta_login_success');
    }
    
    // First try to see if we're already authenticated
    try {
      const authState = await okta.authStateManager.getAuthState();
      console.log('[App.vue] Current auth state:', authState ? 'available' : 'not available');
      if (authState && authState.isAuthenticated) {
        console.log('[App.vue] User is already authenticated according to authStateManager');
      }
    } catch (authStateError) {
      console.warn('[App.vue] Error getting auth state:', authStateError);
    }
    
    // Try to get tokens from storage
    const idToken = await okta.tokenManager.get('idToken');
    const accessToken = await okta.tokenManager.get('accessToken');
    
    console.log('[App.vue] ID token present:', !!idToken);
    console.log('[App.vue] Access token present:', !!accessToken);
    
    if (idToken && typeof idToken === 'object' && 'claims' in idToken) {
      authState.isAuthenticated = true;
      authState.user = idToken.claims;
      authState.errorMessage = null;
      console.log('[App.vue] Authentication successful via ID token');
    } else if (accessToken && typeof accessToken === 'object' && 'claims' in accessToken) {
      authState.isAuthenticated = true;
      authState.user = accessToken.claims;
      authState.errorMessage = null;
      console.log('[App.vue] Authentication successful via access token');
    } else {
      console.log('[App.vue] No valid tokens found in token manager');
      authState.isAuthenticated = false;
      authState.user = null;
    }
  } catch (err: any) {
    console.error('[App.vue] Token error:', err);
    authState.isAuthenticated = false;
    authState.user = null;
    authState.errorMessage = 'Token validation error: ' + err.message;
  }
}

async function loginWithOkta() {
  if (!process.client || !okta) {
    authState.errorMessage = 'Cannot login: Okta is not available.';
    return;
  }
  
  try {
    console.log('[App.vue] Starting login process with Okta redirect');
    console.log('[App.vue] Current URL:', window.location.href);
    console.log('[App.vue] Redirect URI configured:', window.location.origin + '/login/callback');
    
    // Clear any existing tokens before starting a new login flow
    // But DO NOT clear PKCE state as this can cause issues with code_verifier
    await okta.tokenManager.clear();
    
    // Generate a unique state parameter to avoid collisions
    const stateValue = 'sf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    
    // Store the timestamp of this login attempt to help with debugging and cleanup
    try {
      localStorage.setItem('signfile_last_login_attempt', Date.now().toString());
    } catch (storageErr) {
      console.warn('[App.vue] Could not store login timestamp:', storageErr);
    }
    
    // Start the redirect flow with explicit options
    console.log('[App.vue] Starting auth flow with state:', stateValue);
    
    // Log all current storage keys for debugging
    console.log('[App.vue] Storage keys before redirect:');
    try {
      const storageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) storageKeys.push(key);
      }
      console.log(storageKeys);
    } catch (e) {
      console.warn('[App.vue] Error listing storage keys:', e);
    }
    
    // Check if user is already authenticated - if so, no need to redirect
    const currentAuthState = await okta.authStateManager.getAuthState();
    if (currentAuthState && currentAuthState.isAuthenticated) {
      console.log('[App.vue] User is already authenticated, refreshing tokens');
      
      try {
        // If already authenticated, try to refresh the tokens instead of redirect
        await okta.token.getWithoutPrompt({
          responseType: ['code'], // Use 'code' for Authorization Code flow
          pkce: true, // Use PKCE
          scopes: ['openid', 'profile', 'email']
        });
        
        // Update our auth state
        await checkOktaSession();
        return;
      } catch (refreshErr) {
        console.warn('[App.vue] Token refresh failed, falling back to redirect:', refreshErr);
      }
    }
    
    // For users who are not authenticated, use the redirect flow
    console.log('[App.vue] User is not authenticated, starting redirect flow');
    await okta.signInWithRedirect({
      // The redirect is managed internally by the SDK
      originalUri: window.location.origin
    });
  } catch (err: any) {
    // Provide detailed error message and store for debugging
    authState.errorMessage = 'Login failed: ' + err.message;
    console.error('[App.vue] Login error:', err);
    
    // Store the error for debugging purposes
    try {
      localStorage.setItem('signfile_last_login_error', JSON.stringify({
        time: Date.now(),
        message: err.message,
        name: err.name
      }));
    } catch (storageErr) {
      console.warn('[App.vue] Could not store error details:', storageErr);
    }
  }
}

async function logout() {
  if (!process.client || !okta) {
    authState.errorMessage = 'Logout failed: Okta instance missing.';
    return;
  }
  
  try {
    await okta.signOut();
    authState.isAuthenticated = false;
    authState.user = null;
    authState.errorMessage = null;
  } catch (err: any) {
    authState.errorMessage = 'Logout error: ' + err.message;
    console.error('[App.vue] logout error:', err);
  }
}

onMounted(async () => {
  if (!process.client || !okta) return;
  
  try {
    // Check if we've been redirected from the callback page with a request to initiate login
    const initiateLogin = sessionStorage.getItem('login_redirect_from_callback');
    if (initiateLogin) {
      console.log('[App.vue] Detected redirect from callback page, initiating login');
      sessionStorage.removeItem('login_redirect_from_callback');
      // Short delay to ensure the page is fully loaded before starting login
      setTimeout(() => loginWithOkta(), 500);
      return;
    }
    
    // Check if we're on the main page with a code parameter (which shouldn't happen)
    if (window.location.search.includes('code=') && window.location.pathname !== '/login/callback') {
      console.log('[App.vue] Authorization code detected on main page, handling redirect');
      try {
        await okta.token.parseFromUrl();
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (parseErr) {
        console.error('[App.vue] Error parsing URL on main page:', parseErr);
      }
    }
    
    // Always check session status on page load
    await checkOktaSession();
  } catch (err: any) {
    console.error('[App.vue] Okta session check error:', err);
  }
});

// Check if we're in development mode
const isDev = computed(() => process.env.NODE_ENV === 'development');

// Optimize loading performance and prevent layout shifts
useHead({
  link: [
    // Preload key assets to prevent layout shifts
    { rel: 'preload', href: '/favicon.ico', as: 'image' }
  ],
  script: [
    // Prevent Flash Of Unstyled Content (FOUC)
    { innerHTML: `
      (function() {
        document.documentElement.classList.add('js-loaded');
        
        // Mark when DOM is loaded to trigger smoother transitions
        document.addEventListener('DOMContentLoaded', function() {
          document.documentElement.classList.add('dom-loaded');
        });
        
        // Use Content-Visibility optimization for offscreen content
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.target.classList.contains('optimize-render')) {
                if (entry.isIntersecting) {
                  entry.target.style.contentVisibility = 'auto';
                } else {
                  entry.target.style.contentVisibility = 'hidden';
                }
              }
            });
          });
          
          // Observe elements when the DOM is fully loaded
          window.addEventListener('load', () => {
            document.querySelectorAll('.optimize-render').forEach(el => {
              observer.observe(el);
            });
          });
        }
      })();
    `, type: 'text/javascript' }
  ],
  // Add CSS variables for consistent layout
  style: [
    { innerHTML: `
      :root {
        --content-max-width: 1024px;
        --content-min-height: 700px;
        --page-padding: 2rem;
        --section-spacing: 2rem;
        --form-max-width: 650px;
        --card-radius: 1rem;
        --transition-speed: 200ms;
      }
    ` }
  ]
})
</script>

<!-- All styles moved to utilities.css for better Tailwind integration -->
