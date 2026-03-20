<template>
  <div class="app-container text-modernity">
    <!-- Mobile overlay -->
    <div
      v-if="isSmallScreen && isSidebarOpen"
      class="fixed inset-0 bg-modernity bg-opacity-50 z-[995]"
      @click="toggleSidebar"
    ></div>

    <!-- Sidebar Menu -->
    <aside class="sidebar" :class="{ 'open': isSidebarOpen }">
      <div class="sidebar-logo flex items-center justify-center mb-4">
        <img src="/images/logo/securityconsole_rectangle_logo2.png" alt="SignFile Logo" style="max-width:200px;max-height:400px;object-fit:contain;" />
      </div>
      <button v-if="isSmallScreen && isSidebarOpen"
              @click="toggleSidebar"
              class="absolute top-3 right-3 text-modernity-50 hover:text-security p-1.5 rounded-full">
        &times;
      </button>
      <nav class="flex flex-col h-[calc(100%-70px)]">
        <div class="flex-grow">
          <NuxtLink to="/" class="menu-item" active-class="active" @click="closeOnMobile">
            <span class="menu-icon">📝</span>
            <span>Dashboard</span>
          </NuxtLink>
          <NuxtLink to="/agent" class="menu-item" active-class="active" @click="closeOnMobile">
            <span class="menu-icon">🛡️</span>
            <span>Agents</span>
          </NuxtLink>
          <NuxtLink to="/about" class="menu-item" active-class="active" @click="closeOnMobile">
            <span class="menu-icon">ℹ️</span>
            <span>About</span>
          </NuxtLink>

          <!-- Admin section with collapsible submenu -->
          <div>
            <div
              class="menu-item"
              :class="{ 'active': route.path.startsWith('/admin') }"
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
                :class="{ 'active': route.query.section === 'system' }"
                @click="navigateAdminSection('system')"
              >
                <span class="menu-icon">📊</span>
                <span>System Info</span>
              </button>
              <button
                class="menu-item"
                :class="{ 'active': route.query.section === 'packages' }"
                @click="navigateAdminSection('packages')"
              >
                <span class="menu-icon">📦</span>
                <span>NPM Packages</span>
              </button>
              <button
                class="menu-item"
                :class="{ 'active': route.query.section === 'config' }"
                @click="navigateAdminSection('config')"
              >
                <span class="menu-icon">⚙️</span>
                <span>Configuration</span>
              </button>
              <button
                class="menu-item"
                :class="{ 'active': route.query.section === 'userAdmin' }"
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

    <!-- Mobile menu toggle button -->
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
const router = useRouter()
const route = useRoute()
const appVersion = useAppVersion()
const { isSmallScreen } = useLayout()
const okta = useOkta()

const isSidebarOpen = ref(false)
const showAdminSubmenu = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
  if (isSidebarOpen.value && isSmallScreen.value) {
    document.body.classList.add('sidebar-open')
  } else {
    document.body.classList.remove('sidebar-open')
  }
}

function toggleAdminSubmenu() {
  showAdminSubmenu.value = !showAdminSubmenu.value
}

function navigateAdminSection(section: string) {
  router.push({ path: '/admin', query: { section } })
  closeOnMobile()
}

function closeOnMobile() {
  if (isSmallScreen.value) {
    isSidebarOpen.value = false
    document.body.classList.remove('sidebar-open')
  }
}

watch(isSidebarOpen, (isOpen) => {
  if (isOpen) {
    document.body.classList.add('sidebar-open')
  } else {
    document.body.classList.remove('sidebar-open')
  }
})

// Authentication state
const authState = reactive({
  isAuthenticated: false,
  user: null as any,
  errorMessage: null as string | null
})

async function checkOktaSession() {
  if (!okta) {
    authState.errorMessage = 'Okta is not available.'
    return
  }

  try {
    const idToken = await okta.tokenManager.get('idToken')
    const accessToken = await okta.tokenManager.get('accessToken')

    if (idToken && typeof idToken === 'object' && 'claims' in idToken) {
      authState.isAuthenticated = true
      authState.user = idToken.claims
      authState.errorMessage = null
    } else if (accessToken && typeof accessToken === 'object' && 'claims' in accessToken) {
      authState.isAuthenticated = true
      authState.user = accessToken.claims
      authState.errorMessage = null
    } else {
      authState.isAuthenticated = false
      authState.user = null
    }
  } catch (err: any) {
    authState.isAuthenticated = false
    authState.user = null
    authState.errorMessage = 'Token validation error: ' + err.message
  }
}

async function loginWithOkta() {
  if (!okta) {
    authState.errorMessage = 'Cannot login: Okta is not available.'
    return
  }

  try {
    await okta.tokenManager.clear()
    await okta.signInWithRedirect({
      originalUri: window.location.origin
    })
  } catch (err: any) {
    authState.errorMessage = 'Login failed: ' + err.message
  }
}

async function logout() {
  if (!okta) {
    authState.errorMessage = 'Logout failed: Okta instance missing.'
    return
  }

  try {
    await okta.signOut()
    authState.isAuthenticated = false
    authState.user = null
    authState.errorMessage = null
  } catch (err: any) {
    authState.errorMessage = 'Logout error: ' + err.message
  }
}

onMounted(async () => {
  if (!okta) return
  await checkOktaSession()
})
</script>
