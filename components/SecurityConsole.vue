<template>
  <div class="max-w-5xl mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6 text-security">SignFile Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-care p-6 rounded-lg shadow border border-security/20">
        <h2 class="text-lg font-semibold mb-4 text-security">Agents Overview</h2>
        <canvas ref="agentsPieChart" height="180"></canvas>
        <div v-if="agents.length" class="mt-4">
          <ul class="divide-y divide-security/10">
            <li v-for="agent in agents" :key="agent.id" class="py-2 flex items-center justify-between">
              <span class="font-medium text-security">{{ agent.name }}</span>
              <span class="text-xs text-modernity-60">{{ agent.type }}</span>
            </li>
          </ul>
        </div>
        <div v-else class="text-center py-6 text-security-70">
          <span class="text-3xl">🛡️</span>
          <p>No agents found.</p>
        </div>
      </div>
      <div class="bg-care p-6 rounded-lg shadow border border-security/20">
        <h2 class="text-lg font-semibold mb-4 text-security">Agent Types Distribution</h2>
        <canvas ref="typesPieChart" height="180"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Chart from 'chart.js/auto'

interface Agent {
  id: string
  name: string
  type: string
}

const agents = ref<Agent[]>([])
const agentsPieChart = ref<HTMLCanvasElement | null>(null)
const typesPieChart = ref<HTMLCanvasElement | null>(null)

let agentsChartInstance: Chart | null = null
let typesChartInstance: Chart | null = null

async function fetchAgents() {
  try {
    const response = await fetch('/api/agents')
    if (response.ok) {
      const data = await response.json()
      agents.value = data.agents || []
    }
  } catch { /* endpoint may not exist yet */ }
}

function renderAgentsPie() {
  if (!agentsPieChart.value) return
  agentsChartInstance?.destroy()
  agentsChartInstance = new Chart(agentsPieChart.value, {
    type: 'pie',
    data: {
      labels: agents.value.map(a => a.name),
      datasets: [{
        data: agents.value.map(() => 1),
        backgroundColor: ['#8f40ff', '#64ffa2', '#ff5249', '#140309', '#fffdf6', '#fbbf24', '#3b82f6', '#10b981']
      }]
    },
    options: { plugins: { legend: { display: true, position: 'bottom' } } }
  })
}

function renderTypesPie() {
  if (!typesPieChart.value) return
  const typeCounts: Record<string, number> = {}
  agents.value.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1 })
  typesChartInstance?.destroy()
  typesChartInstance = new Chart(typesPieChart.value, {
    type: 'pie',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: ['#8f40ff', '#64ffa2', '#ff5249', '#140309', '#fffdf6', '#fbbf24', '#3b82f6', '#10b981']
      }]
    },
    options: { plugins: { legend: { display: true, position: 'bottom' } } }
  })
}

onMounted(async () => {
  await fetchAgents()
  renderAgentsPie()
  renderTypesPie()
})

onUnmounted(() => {
  agentsChartInstance?.destroy()
  typesChartInstance?.destroy()
})
</script>
