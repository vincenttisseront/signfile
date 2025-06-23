<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white rounded-2xl shadow-xl p-10 w-full max-w-5xl border border-gray-200 flex flex-col md:flex-row gap-8">
      <!-- Left: Tabs + Forms -->
      <div class="w-full md:w-2/3">
        <h1 class="text-3xl font-extrabold text-blue-700 mb-6 font-sans">
          Digital Signature Tool
        </h1>

        <!-- Tabs -->
        <div class="mb-6 border-b border-gray-200">
          <nav class="-mb-px flex space-x-6">
            <button
              @click="activeTab = 'sign'"
              :class="activeTab === 'sign' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm"
            >
              Sign Script
            </button>
            <button
              @click="activeTab = 'verify'"
              :class="activeTab === 'verify' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm"
            >
              Verify Signature
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div>
          <UploadForm v-if="activeTab === 'sign'" />
          <VerifyForm v-else />
        </div>
      </div>

      <!-- Right: Logs -->
      <div class="w-full md:w-1/3 flex flex-col">
        <label class="font-semibold text-gray-700 mb-2" for="logs">Logs</label>
        <textarea
          id="logs"
          class="w-full h-64 border border-gray-300 rounded-lg p-3 bg-gray-50 text-xs font-mono resize-none"
          readonly
          :value="logs"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import UploadForm from '~/components/UploadForm.vue'
import VerifyForm from '~/components/VerifyForm.vue'
import { ref, provide } from 'vue'

const logs = ref('')
provide('logs', logs)

const activeTab = ref('sign')
</script>
