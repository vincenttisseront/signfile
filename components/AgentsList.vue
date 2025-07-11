<template>
  <div class="max-w-3xl mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6 text-security">Agents List</h1>
    <div class="bg-care p-6 rounded-lg shadow border border-security/20">
      <p class="text-modernity mb-4">Below is a list of all available agents in the system.</p>
      <div v-if="loading" class="text-center py-6">
        <span class="animate-spin inline-block w-6 h-6 border-2 border-security border-t-transparent rounded-full"></span>
        <p class="mt-2 text-security">Loading agents...</p>
      </div>
      <div v-else-if="agents.length === 0" class="text-center py-6 text-security-70">
        <span class="text-3xl">🛡️</span>
        <p>No agents found.</p>
      </div>
      <ul v-else class="divide-y divide-security/10">
        <li v-for="agent in agents" :key="agent.id" class="py-3 flex items-center justify-between">
          <div>
            <span class="font-medium text-security">{{ agent.name }}</span>
            <span class="ml-2 text-xs text-modernity-60">{{ agent.type }}</span>
          </div>
          <span class="text-xs text-modernity-50">ID: {{ agent.id }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Agent {
  id: string;
  name: string;
  type: string;
}

const agents = ref<Agent[]>([])
const loading = ref(true)

async function fetchAgents() {
  loading.value = true
  try {
    // Replace with your actual API endpoint
    const response = await fetch('/api/agents')
    if (response.ok) {
      const data = await response.json()
      agents.value = data.agents || []
    } else {
      agents.value = []
    }
  } catch (err) {
    agents.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAgents()
})
</script>

<style scoped>
/* Add custom styles if needed */
</style>
