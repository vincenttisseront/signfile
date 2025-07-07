<template>
  <div class="p-4 rounded-lg border border-security/20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-4 text-security border-b border-security-30 pb-2">User Admin Rights Management</h2>
    
    <!-- Current Admin Users Section -->
    <div class="mb-8">
      <h3 class="text-lg text-security font-medium mb-3">Admin Users</h3>
      
      <div class="mb-4 bg-security-5 p-4 rounded-lg">
        <div v-if="user" class="mb-4">
          <p class="text-sm text-modernity-80 mb-2">
            You are currently logged in as:
          </p>
          <div class="flex items-center gap-2 mb-2 p-2 bg-care rounded border border-security-20">
            <span class="text-lg">👤</span>
            <div>
              <p class="font-medium">{{ user.name }}</p>
              <p class="text-sm text-modernity-70">{{ user.email }}</p>
            </div>
          </div>
        </div>
        
        <!-- Admin Users List -->
        <div class="mb-4">
          <h4 class="font-medium text-security mb-2">Users with Admin Rights</h4>
          <div v-if="adminUsers.length === 0" class="text-sm text-modernity-70 italic">
            No users with admin rights found
          </div>
          <div v-else class="space-y-2">
            <div v-for="adminUser in adminUsers" :key="adminUser.email" class="flex items-center justify-between p-2 bg-care rounded border border-security-20">
              <div class="flex items-center gap-2">
                <span class="text-lg">👤</span>
                <div>
                  <p class="font-medium">{{ adminUser.name }}</p>
                  <p class="text-sm text-modernity-70">{{ adminUser.email }}</p>
                </div>
              </div>
              <button 
                @click="removeAdminRights(adminUser.email)"
                class="p-1.5 text-sm bg-energy text-care rounded hover:bg-energy-80"
              >
                Remove Rights
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add New Admin User Section -->
      <div class="mb-6">
        <h4 class="font-medium text-security mb-2">Grant Admin Rights</h4>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1" for="newAdminEmail">User Email</label>
          <input 
            id="newAdminEmail"
            v-model="newAdminEmail" 
            type="email" 
            class="w-full p-2 border border-security-30 rounded" 
            placeholder="user@example.com"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1" for="newAdminName">User Name (Optional)</label>
          <input 
            id="newAdminName"
            v-model="newAdminName" 
            type="text" 
            class="w-full p-2 border border-security-30 rounded" 
            placeholder="John Doe"
          />
        </div>
        <button 
          @click="addAdminRights"
          class="py-2 px-4 bg-security text-care rounded hover:bg-security-80"
          :disabled="!newAdminEmail"
        >
          Add Admin Rights
        </button>
        <p v-if="adminActionMessage" class="mt-2 text-sm" :class="adminActionError ? 'text-energy' : 'text-forest'">
          {{ adminActionMessage }}
        </p>
      </div>
      
      <!-- Recently Authenticated Users Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium text-security">Recently Authenticated Users</h4>
          <button 
            @click="loadAuthenticatedUsers" 
            class="p-1.5 text-xs bg-security-10 text-security rounded hover:bg-security-20"
            title="Refresh the list of authenticated users"
          >
            Refresh List
          </button>
        </div>
        
        <div v-if="authenticatedUsers.length === 0" class="text-sm text-modernity-70 italic p-4 border border-dashed border-security-20 rounded text-center">
          No recent authentication records found
        </div>
        <div v-else class="space-y-2">
          <div v-for="authUser in authenticatedUsers" :key="authUser.email" class="flex items-center justify-between p-2 bg-care rounded border border-security-20">
            <div class="flex items-center gap-2">
              <span class="text-lg">👤</span>
              <div>
                <p class="font-medium">{{ authUser.name }}</p>
                <p class="text-sm text-modernity-70">{{ authUser.email }}</p>
                <p class="text-xs text-modernity-60">
                  Authenticated: {{ new Date(authUser.lastAuthenticated).toLocaleString() }}
                </p>
              </div>
            </div>
            <button 
              v-if="!isAdminUser(authUser.email)"
              @click="grantAdminRightsToExisting(authUser)"
              class="p-1.5 text-sm bg-security text-care rounded hover:bg-security-80"
            >
              Grant Admin Rights
            </button>
            <span v-else class="text-xs py-1 px-2 bg-forest-20 text-forest rounded">
              Has Admin Rights
            </span>
          </div>
          <p class="text-xs text-modernity-60 text-center">
            Showing {{ authenticatedUsers.length }} authenticated users. 
            <span v-if="authenticatedUsers.length > 0">
              Last login: {{ new Date(authenticatedUsers[0].lastAuthenticated).toLocaleString() }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps({
  user: {
    type: Object,
    default: null
  }
})

// User admin management
const adminUsers = ref<{name: string, email: string}[]>([])
const authenticatedUsers = ref<{name: string, email: string, lastAuthenticated: number}[]>([])
const newAdminEmail = ref('')
const newAdminName = ref('')
const adminActionMessage = ref('')
const adminActionError = ref(false)

onMounted(() => {
  loadAdminUsers()
  loadAuthenticatedUsers()
})

// Function to load admin users from persistent storage
async function loadAdminUsers() {
  try {
    // First try to load from API (persistent storage)
    const response = await fetch('/api/admin-data?type=admin-users')
    const data = await response.json()
    
    if (data.users) {
      adminUsers.value = data.users
      // Also store in localStorage as fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem('signfile_admin_users', JSON.stringify(data.users))
      }
      return
    }
  } catch (error) {
    console.warn('[UserAdmin.vue] Failed to retrieve admin users from persistent storage, falling back to localStorage')
  }
  
  // Fallback to localStorage
  try {
    if (typeof window !== 'undefined') {
      const storedAdminUsers = localStorage.getItem('signfile_admin_users')
      if (storedAdminUsers) {
        adminUsers.value = JSON.parse(storedAdminUsers)
        // Try to update the persistent storage
        try {
          await fetch('/api/admin-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'admin-users', data: adminUsers.value })
          })
        } catch (error) {
          console.warn('[UserAdmin.vue] Failed to update persistent storage with localStorage admin users')
        }
      } else {
        adminUsers.value = []
      }
    }
  } catch (error) {
    console.error('[UserAdmin.vue] Error loading admin users:', error)
    adminUsers.value = []
  }
}

// Function to save admin users to persistent storage
async function saveAdminUsers() {
  try {
    // Save to persistent storage via API
    await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'admin-users', data: adminUsers.value })
    })
    
    // Also save to localStorage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('signfile_admin_users', JSON.stringify(adminUsers.value))
    }
  } catch (error) {
    console.error('[UserAdmin.vue] Error saving admin users to persistent storage:', error)
    
    // Fallback to localStorage only
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('signfile_admin_users', JSON.stringify(adminUsers.value))
      } catch (localError) {
        console.error('[UserAdmin.vue] Error saving admin users to localStorage:', localError)
      }
    }
  }
}

// Function to load authenticated users history from persistent storage
async function loadAuthenticatedUsers() {
  console.log('[UserAdmin.vue] Loading authenticated users')
  
  try {
    // First try to load from API (persistent storage)
    console.log('[UserAdmin.vue] Attempting to load authenticated users from API')
    const response = await fetch('/api/admin-data?type=authenticated-users')
    const data = await response.json()
    
    if (data.error) {
      console.error('[UserAdmin.vue] API returned error when loading authenticated users:', data.error)
    }
    
    if (data.users) {
      console.log(`[UserAdmin.vue] Loaded ${data.users.length} authenticated users from API`)
      authenticatedUsers.value = data.users
      
      // Sort by most recently authenticated
      authenticatedUsers.value.sort((a, b) => b.lastAuthenticated - a.lastAuthenticated)
      
      // Also store in localStorage as fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem('signfile_authenticated_users', JSON.stringify(data.users))
        console.log('[UserAdmin.vue] Updated localStorage with authenticated users from API')
      }
      return
    } else {
      console.warn('[UserAdmin.vue] API returned empty users array')
    }
  } catch (error) {
    console.warn('[UserAdmin.vue] Failed to retrieve authenticated users from persistent storage, falling back to localStorage', error)
  }
  
  // Fallback to localStorage
  try {
    if (typeof window !== 'undefined') {
      console.log('[UserAdmin.vue] Attempting to load authenticated users from localStorage')
      const storedAuthUsers = localStorage.getItem('signfile_authenticated_users')
      
      if (storedAuthUsers) {
        try {
          authenticatedUsers.value = JSON.parse(storedAuthUsers)
          console.log(`[UserAdmin.vue] Loaded ${authenticatedUsers.value.length} authenticated users from localStorage`)
          
          // Sort by most recently authenticated
          authenticatedUsers.value.sort((a, b) => b.lastAuthenticated - a.lastAuthenticated)
          
          // Try to update the persistent storage
          console.log('[UserAdmin.vue] Updating API storage with localStorage data')
          try {
            const updateResponse = await fetch('/api/admin-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'authenticated-users', data: authenticatedUsers.value })
            })
            
            const updateResult = await updateResponse.json()
            if (updateResult.success) {
              console.log('[UserAdmin.vue] Successfully updated API storage with localStorage data')
            } else if (updateResult.error) {
              console.warn('[UserAdmin.vue] API returned error when updating with localStorage data:', updateResult.error)
            }
          } catch (error) {
            console.warn('[UserAdmin.vue] Failed to update persistent storage with localStorage authenticated users', error)
          }
        } catch (parseError) {
          console.error('[UserAdmin.vue] Error parsing authenticated users from localStorage', parseError)
          authenticatedUsers.value = []
        }
      } else {
        console.log('[UserAdmin.vue] No authenticated users found in localStorage, initializing empty array')
        authenticatedUsers.value = []
      }
    }
  } catch (error) {
    console.error('[UserAdmin.vue] Error loading authenticated users:', error)
    authenticatedUsers.value = []
  }
}

// Function to save authenticated users history to persistent storage
async function saveAuthenticatedUsers() {
  try {
    console.log(`[UserAdmin.vue] Saving ${authenticatedUsers.value.length} authenticated users to API`)
    // Save to persistent storage via API
    const response = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'authenticated-users', data: authenticatedUsers.value })
    })
    
    const result = await response.json()
    
    if (result.error) {
      console.error('[UserAdmin.vue] API returned error when saving authenticated users:', result.error)
    } else if (result.success) {
      console.log('[UserAdmin.vue] Successfully saved authenticated users to API')
    }
    
    // Also save to localStorage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('signfile_authenticated_users', JSON.stringify(authenticatedUsers.value))
      console.log('[UserAdmin.vue] Saved authenticated users to localStorage as fallback')
    }
  } catch (error) {
    console.error('[UserAdmin.vue] Error saving authenticated users to persistent storage:', error)
    
    // Fallback to localStorage only
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('signfile_authenticated_users', JSON.stringify(authenticatedUsers.value))
        console.log('[UserAdmin.vue] Saved authenticated users to localStorage after API failure')
      } catch (localError) {
        console.error('[UserAdmin.vue] Error saving authenticated users to localStorage:', localError)
      }
    }
  }
}

// Function to add admin rights to a user
function addAdminRights() {
  if (!newAdminEmail.value) {
    adminActionMessage.value = 'Email is required'
    adminActionError.value = true
    return
  }
  
  // Check if user already has admin rights
  if (isAdminUser(newAdminEmail.value)) {
    adminActionMessage.value = 'User already has admin rights'
    adminActionError.value = true
    return
  }
  
  // Add user to admin users list
  adminUsers.value.push({
    name: newAdminName.value || newAdminEmail.value,
    email: newAdminEmail.value
  })
  
  // Save updated admin users list
  saveAdminUsers()
  
  // Clear form and show success message
  newAdminEmail.value = ''
  newAdminName.value = ''
  adminActionMessage.value = 'Admin rights granted successfully'
  adminActionError.value = false
  
  // Clear message after 3 seconds
  setTimeout(() => {
    adminActionMessage.value = ''
  }, 3000)
}

// Function to remove admin rights from a user
function removeAdminRights(email: string) {
  adminUsers.value = adminUsers.value.filter(user => user.email !== email)
  saveAdminUsers()
  
  // Show success message
  adminActionMessage.value = 'Admin rights removed successfully'
  adminActionError.value = false
  
  // Clear message after 3 seconds
  setTimeout(() => {
    adminActionMessage.value = ''
  }, 3000)
}

// Function to check if a user has admin rights
function isAdminUser(email: string): boolean {
  return adminUsers.value.some(user => user.email === email)
}

// Function to grant admin rights to a user from the authenticated users list
function grantAdminRightsToExisting(user: {name: string, email: string}) {
  adminUsers.value.push({
    name: user.name,
    email: user.email
  })
  
  saveAdminUsers()
  
  // Show success message
  adminActionMessage.value = 'Admin rights granted successfully'
  adminActionError.value = false
  
  // Clear message after 3 seconds
  setTimeout(() => {
    adminActionMessage.value = ''
  }, 3000)
}

// Function to record a user authentication
async function recordUserAuthentication(userData: any) {
  if (!userData || !userData.email) {
    console.warn('[UserAdmin.vue] Cannot record authentication - missing user email')
    return
  }
  
  console.log('[UserAdmin.vue] Recording authentication for user:', userData.email)
  
  // Make sure authenticatedUsers is initialized
  if (!Array.isArray(authenticatedUsers.value)) {
    console.warn('[UserAdmin.vue] authenticatedUsers is not an array, initializing it')
    authenticatedUsers.value = []
  }
  
  // Create or update authentication record
  const existingUserIndex = authenticatedUsers.value.findIndex(u => u.email === userData.email)
  const timestamp = Date.now()
  
  if (existingUserIndex >= 0) {
    // Update existing record
    console.log('[UserAdmin.vue] Updating existing authentication record')
    authenticatedUsers.value[existingUserIndex].lastAuthenticated = timestamp
    if (userData.name) {
      authenticatedUsers.value[existingUserIndex].name = userData.name
    }
  } else {
    // Create new record
    console.log('[UserAdmin.vue] Creating new authentication record')
    authenticatedUsers.value.push({
      name: userData.name || userData.email,
      email: userData.email,
      lastAuthenticated: timestamp
    })
  }
  
  // Sort by most recently authenticated
  authenticatedUsers.value.sort((a, b) => b.lastAuthenticated - a.lastAuthenticated)
  
  console.log(`[UserAdmin.vue] Now have ${authenticatedUsers.value.length} authenticated users, saving...`)
  
  try {
    // Save updated authenticated users list
    await saveAuthenticatedUsers()
    console.log('[UserAdmin.vue] Successfully saved authentication record')
  } catch (error) {
    console.error('[UserAdmin.vue] Error saving authentication record:', error)
    
    // Still try to save to localStorage as a fallback
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('signfile_authenticated_users', JSON.stringify(authenticatedUsers.value))
        console.log('[UserAdmin.vue] Saved to localStorage as fallback after API failure')
      } catch (localStorageError) {
        console.error('[UserAdmin.vue] Also failed to save to localStorage:', localStorageError)
      }
    }
  }
}

// Expose functions for parent component
defineExpose({
  recordUserAuthentication,
  isAdminUser
})
</script>
