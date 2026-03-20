<template>
  <div class="p-4 rounded-lg border border-security/20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-4 text-security border-b border-security-30 pb-2">User Admin Rights Management</h2>

    <!-- Current Admin Users Section -->
    <div class="mb-8">
      <h3 class="text-lg text-security font-medium mb-3">Admin Users</h3>

      <div class="mb-4 bg-security-5 p-4 rounded-lg">
        <div v-if="props.user" class="mb-4">
          <p class="text-sm text-modernity-80 mb-2">You are currently logged in as:</p>
          <div class="flex items-center gap-2 mb-2 p-2 bg-care rounded border border-security-20">
            <span class="text-lg">👤</span>
            <div>
              <p class="font-medium">{{ props.user.name }}</p>
              <p class="text-sm text-modernity-70">{{ props.user.email }}</p>
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
              <button @click="removeAdminRights(adminUser.email)" class="p-1.5 text-sm bg-energy text-care rounded hover:bg-energy-80">
                Remove Rights
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add New Admin User -->
      <div class="mb-6">
        <h4 class="font-medium text-security mb-2">Grant Admin Rights</h4>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1" for="newAdminEmail">User Email</label>
          <input id="newAdminEmail" v-model="newAdminEmail" type="email" class="w-full p-2 border border-security-30 rounded" placeholder="user@example.com" />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1" for="newAdminName">User Name (Optional)</label>
          <input id="newAdminName" v-model="newAdminName" type="text" class="w-full p-2 border border-security-30 rounded" placeholder="John Doe" />
        </div>
        <button @click="addAdminRights" class="py-2 px-4 bg-security text-care rounded hover:bg-security-80" :disabled="!newAdminEmail">
          Add Admin Rights
        </button>
        <p v-if="adminActionMessage" class="mt-2 text-sm" :class="adminActionError ? 'text-energy' : 'text-forest'">
          {{ adminActionMessage }}
        </p>
      </div>

      <!-- Recently Authenticated Users -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium text-security">Recently Authenticated Users</h4>
          <button @click="loadAuthenticatedUsers" class="p-1.5 text-xs bg-security-10 text-security rounded hover:bg-security-20" title="Refresh the list of authenticated users">
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
                <p class="text-xs text-modernity-60">Authenticated: {{ new Date(authUser.lastAuthenticated).toLocaleString() }}</p>
              </div>
            </div>
            <button v-if="!isAdminUser(authUser.email)" @click="grantAdminRightsToExisting(authUser)" class="p-1.5 text-sm bg-security text-care rounded hover:bg-security-80">
              Grant Admin Rights
            </button>
            <span v-else class="text-xs py-1 px-2 bg-forest-20 text-forest rounded">Has Admin Rights</span>
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
const props = defineProps<{
  user: any
}>()

const adminUsers = ref<{ name: string; email: string }[]>([])
const authenticatedUsers = ref<{ name: string; email: string; lastAuthenticated: number }[]>([])
const newAdminEmail = ref('')
const newAdminName = ref('')
const adminActionMessage = ref('')
const adminActionError = ref(false)

onMounted(() => {
  loadAdminUsers()
  loadAuthenticatedUsers()
})

async function loadAdminUsers() {
  try {
    const response = await fetch('/api/admin-data?type=admin-users')
    const data = await response.json()
    if (data.users) {
      adminUsers.value = data.users
    }
  } catch {
    adminUsers.value = []
  }
}

async function saveAdminUsers() {
  try {
    await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'admin-users', data: adminUsers.value })
    })
  } catch { /* API unavailable */ }
}

async function loadAuthenticatedUsers() {
  try {
    const response = await fetch('/api/admin-data?type=authenticated-users')
    const data = await response.json()
    if (data.users) {
      authenticatedUsers.value = data.users.sort(
        (a: any, b: any) => b.lastAuthenticated - a.lastAuthenticated
      )
    }
  } catch {
    authenticatedUsers.value = []
  }
}

async function saveAuthenticatedUsers() {
  try {
    await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'authenticated-users', data: authenticatedUsers.value })
    })
  } catch { /* API unavailable */ }
}

function addAdminRights() {
  if (!newAdminEmail.value) {
    adminActionMessage.value = 'Email is required'
    adminActionError.value = true
    return
  }
  if (isAdminUser(newAdminEmail.value)) {
    adminActionMessage.value = 'User already has admin rights'
    adminActionError.value = true
    return
  }
  adminUsers.value.push({ name: newAdminName.value || newAdminEmail.value, email: newAdminEmail.value })
  saveAdminUsers()
  newAdminEmail.value = ''
  newAdminName.value = ''
  showActionMessage('Admin rights granted successfully')
}

function removeAdminRights(email: string) {
  adminUsers.value = adminUsers.value.filter(u => u.email !== email)
  saveAdminUsers()
  showActionMessage('Admin rights removed successfully')
}

function isAdminUser(email: string): boolean {
  return adminUsers.value.some(u => u.email === email)
}

function grantAdminRightsToExisting(user: { name: string; email: string }) {
  adminUsers.value.push({ name: user.name, email: user.email })
  saveAdminUsers()
  showActionMessage('Admin rights granted successfully')
}

async function recordUserAuthentication(userData: any) {
  if (!userData?.email) return

  const idx = authenticatedUsers.value.findIndex(u => u.email === userData.email)
  const timestamp = Date.now()

  if (idx >= 0) {
    authenticatedUsers.value[idx].lastAuthenticated = timestamp
    if (userData.name) authenticatedUsers.value[idx].name = userData.name
  } else {
    authenticatedUsers.value.push({
      name: userData.name || userData.email,
      email: userData.email,
      lastAuthenticated: timestamp
    })
  }

  authenticatedUsers.value.sort((a, b) => b.lastAuthenticated - a.lastAuthenticated)
  await saveAuthenticatedUsers()
}

function showActionMessage(msg: string) {
  adminActionMessage.value = msg
  adminActionError.value = false
  setTimeout(() => { adminActionMessage.value = '' }, 3000)
}

defineExpose({ recordUserAuthentication, isAdminUser })
</script>
