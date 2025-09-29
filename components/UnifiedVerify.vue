<template>
  <div class="unified-verify-container max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-modernity mb-2">Signature Verification</h2>
      <p class="text-gray-600 max-w-3xl mx-auto">Verify digital signatures on files with our comprehensive suite of verification tools</p>
    </div>
    
    <div class="mb-8">
      <!-- Tab Navigation -->
      <div class="flex flex-wrap justify-center gap-4 mb-8">
        <button 
          v-for="(tab, index) in tabs" 
          :key="index" 
          @click="setActiveTab(tab.id)"
          class="px-6 py-4 rounded-xl flex items-center transition-all duration-300 shadow-sm relative overflow-hidden group"
          :class="activeTab === tab.id 
            ? 'bg-security text-white shadow-lg transform scale-105 border-2 border-security/30' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-security/20'"
        >
          <!-- Background glow effect for active tab -->
          <div 
            v-if="activeTab === tab.id" 
            class="absolute inset-0 bg-gradient-to-tr from-security/20 via-transparent to-white/30 opacity-50"
          ></div>
          
          <div class="relative z-10 flex items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all duration-300"
              :class="activeTab === tab.id ? 'bg-white/20' : 'bg-security/10'"
            >
              <span class="text-xl" :class="activeTab === tab.id ? 'text-white' : 'text-security'">{{ tab.icon }}</span>
            </div>
            <div>
              <span class="font-medium block">{{ tab.name }}</span>
              <span 
                class="text-xs block mt-0.5 truncate max-w-[180px]"
                :class="activeTab === tab.id ? 'text-white/80' : 'text-gray-500'"
              >
                {{ tab.shortDesc }}
              </span>
            </div>
          </div>
          
          <!-- Hover indicator -->
          <div 
            class="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
            :class="activeTab === tab.id ? 'bg-white/50' : 'bg-security'"
          ></div>
        </button>
      </div>
      
      <!-- Tab Description Card -->
      <div class="bg-gradient-to-br from-white to-security/5 p-6 rounded-xl shadow-sm border border-security/20 mb-8">
        <div class="flex items-start">
          <div class="text-security mr-4 p-3 bg-white rounded-full shadow-sm border border-security/10 flex-shrink-0">
            <svg v-if="activeTab === 'basic'" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <svg v-else-if="activeTab === 'advanced'" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h3 class="text-security font-bold text-xl mb-2">{{ getActiveTabName }}</h3>
            <p class="text-gray-700 leading-relaxed" v-html="tabDescription"></p>
            
            <div class="flex flex-wrap gap-2 mt-3">
              <span 
                v-for="(tag, idx) in activeTags" 
                :key="idx" 
                class="px-2 py-1 rounded-full text-xs font-medium bg-security/10 text-security"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab Content with Enhanced Transitions -->
    <div class="relative">
      <transition 
        name="tab-fade"
        mode="out-in"
        @before-enter="onBeforeEnter"
        @after-leave="onAfterLeave"
      >
        <!-- Standard Verification -->
        <div v-if="activeTab === 'basic'" key="basic" class="tab-content">
          <VerifyForm />
        </div>
        
        <!-- Advanced Verification -->
        <div v-else-if="activeTab === 'advanced'" key="advanced" class="tab-content">
          <VerifyAdvanced />
        </div>
        
        <!-- Intune Verification -->
        <div v-else key="intune" class="tab-content">
          <VerifyIntune />
        </div>
      </transition>
    </div>
    
    <!-- Features Section -->
    <div class="mt-16 bg-gradient-to-b from-white to-gray-50 rounded-xl p-8 border border-gray-200 shadow-sm">
      <h3 class="text-2xl font-bold text-center mb-8 text-modernity">Features of our Verification Tools</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-security/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-security mb-4 bg-security/10 p-3 rounded-full inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h4 class="font-semibold mb-3 text-lg text-security">Comprehensive Verification</h4>
          <p class="text-gray-600">Multiple verification methods ensure robust signature validation across different file types and signing standards.</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-security/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-security mb-4 bg-security/10 p-3 rounded-full inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h4 class="font-semibold mb-3 text-lg text-security">Certificate Analysis</h4>
          <p class="text-gray-600">Deep inspection of certificates including revocation checks, trust chain validation, and security scoring.</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-security/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-security mb-4 bg-security/10 p-3 rounded-full inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <h4 class="font-semibold mb-3 text-lg text-security">Enterprise Integration</h4>
          <p class="text-gray-600">Special tooling for MDM deployments, including Intune compatibility verification and deployment readiness checks.</p>
        </div>
      </div>
    </div>
    
    <!-- Help Section -->
    <div class="mt-12 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-security mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-xl font-bold text-modernity">Need Help?</h3>
      </div>
      <p class="mb-4 text-gray-600">Check out our guides on digital signatures and verification:</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <a href="#" class="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-security">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Understanding Digital Signatures
        </a>
        <a href="#" class="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-security">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verification FAQs
        </a>
      </div>
      
      <div class="bg-security/5 p-4 rounded-lg border border-security/10">
        <p class="text-sm text-gray-700">
          <strong>🔍 Pro Tip:</strong> For enterprise deployments or high-security environments, use the Advanced Verification 
          option which performs deeper certificate validation and checks against certificate revocation lists (CRLs).
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import VerifyForm from '~/components/VerifyForm.vue';
import VerifyAdvanced from '~/components/VerifyAdvanced.vue';
import VerifyIntune from '~/components/VerifyIntune.vue';

const router = useRouter();
const route = useRoute();

const activeTab = ref('basic');

const tabs = [
  { 
    id: 'basic', 
    name: 'Standard Verification', 
    icon: '✅',
    shortDesc: 'Quick file signature validation',
    description: 'Verify file signatures with standard checks. Perfect for quick validation of signed files to ensure their authenticity and integrity.',
    tags: ['PowerShell Scripts', 'Executables', 'DLLs']
  },
  { 
    id: 'advanced', 
    name: 'Advanced Verification', 
    icon: '🔍',
    shortDesc: 'Detailed security analysis',
    description: 'Perform comprehensive analysis of file signatures with detailed certificate information, security scoring, and revocation checks.',
    tags: ['Deep Analysis', 'Certificate Chain', 'Revocation Check']
  },
  { 
    id: 'intune', 
    name: 'Intune Package Verification', 
    icon: '�',
    shortDesc: 'Intune deployment packages',
    description: 'Specialized verification for Microsoft Intune deployment packages (.intunewin files) with detailed content analysis and security assessment.',
    tags: ['Intune', 'MDM', 'Deployment Ready']
  }
];

// Get the description for the current tab
const tabDescription = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value);
  return tab ? tab.description : '';
});

// Get the name of the active tab
const getActiveTabName = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value);
  return tab ? tab.name : '';
});

// Get the tags for the active tab
const activeTags = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value);
  return tab ? tab.tags : [];
});

// Set active tab from URL if specified
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && tabs.some(t => t.id === tabParam)) {
    activeTab.value = tabParam;
  }
}

// Change the URL when tab changes
const setActiveTab = (tabId) => {
  activeTab.value = tabId;
  
  // Update the URL without page reload
  router.replace({ query: { ...route.query, tab: tabId } });
}

// Track loading state for transitions
const isTransitioning = ref(false);

// Transition methods
const onBeforeEnter = () => {
  isTransitioning.value = true;
};

const onAfterLeave = () => {
  isTransitioning.value = false;
};

// Add navigation tracking
watch(activeTab, (newTab) => {
  // You could add analytics tracking here
  console.log(`Tab changed to: ${newTab}`);
}, { immediate: true });
</script>

<style scoped>
.tab-content {
  min-height: 500px;
}

/* Tab transition animations */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.215, 0.61, 0.355, 1);
  will-change: opacity, transform;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(15px);
}

.tab-fade-enter-to,
.tab-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Enhanced hover effects */
button {
  will-change: transform;
}

.unified-verify-container {
  position: relative;
  z-index: 1;
}

/* Staggered animations for feature cards */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.grid > div {
  animation: fadeInUp 0.5s ease-out forwards;
}

.grid > div:nth-child(1) {
  animation-delay: 0.1s;
}

.grid > div:nth-child(2) {
  animation-delay: 0.2s;
}

.grid > div:nth-child(3) {
  animation-delay: 0.3s;
}
</style>