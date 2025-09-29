<template>
  <div class="verify-intune-container">
    <h2 class="text-2xl font-semibold mb-4 text-modernity">Verify Intune Script Signatures</h2>
    
    <div class="mb-6 bg-gradient-to-r from-security/10 to-security/5 p-5 rounded-xl border border-security/20 shadow-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0 mr-4">
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-security/10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        </div>
        <div>
          <p class="text-security font-medium">
            This verification tool specializes in scripts signed for Microsoft Intune and other MDM deployments.
            It provides enhanced checks for security systems like Airlock that may block scripts with valid but
            non-compliant signatures.
          </p>
        </div>
      </div>
    </div>
    
    <form @submit.prevent="verifySignature" class="space-y-6">
      <div 
        class="file-upload-container border-3 border-dashed transition-all duration-300 group hover:shadow-lg"
        :class="!selectedFile ? 'border-security/30 bg-security/5' : 'border-green-300/50 bg-green-50/50'"
      >
        <div v-if="!selectedFile">
          <label for="file-upload" class="cursor-pointer block">
            <div class="mb-3">
              <div class="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center border border-security/10 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <span class="block text-lg font-medium text-modernity">Drop your script file here or click to browse</span>
            <span class="block text-sm text-gray-500 mt-1">Supports .ps1, .cmd, .bat, and other script files</span>
          </label>
          <input id="file-upload" type="file" @change="handleFileSelect" class="hidden" />
        </div>
        <div v-else class="text-left">
          <div class="flex items-center">
            <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shadow-sm mr-4 border border-green-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 1h8v10H6V6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-lg font-medium text-modernity">{{ selectedFile.name }}</p>
              <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button 
              @click="clearSelectedFile" 
              type="button"
              class="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="verification-options bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <label class="block font-medium text-modernity mb-3">Verification Mode</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div 
            @click="deploymentMode = 'standard'" 
            :class="[
              'border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center',
              deploymentMode === 'standard' 
                ? 'border-security bg-security/5 shadow-sm' 
                : 'border-gray-200 hover:border-security/30'
            ]"
          >
            <div 
              :class="[
                'w-6 h-6 rounded-full mr-3 flex items-center justify-center border',
                deploymentMode === 'standard'
                  ? 'border-security' 
                  : 'border-gray-300'
              ]"
            >
              <div 
                v-if="deploymentMode === 'standard'" 
                class="w-3 h-3 rounded-full bg-security"
              ></div>
            </div>
            <div>
              <label for="mode-standard" class="font-medium cursor-pointer block text-modernity">Standard</label>
              <span class="text-xs text-gray-500 block mt-0.5">Basic signature verification</span>
            </div>
          </div>
          
          <div 
            @click="deploymentMode = 'deployment'" 
            :class="[
              'border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center',
              deploymentMode === 'deployment' 
                ? 'border-security bg-security/5 shadow-sm' 
                : 'border-gray-200 hover:border-security/30'
            ]"
          >
            <div 
              :class="[
                'w-6 h-6 rounded-full mr-3 flex items-center justify-center border',
                deploymentMode === 'deployment'
                  ? 'border-security' 
                  : 'border-gray-300'
              ]"
            >
              <div 
                v-if="deploymentMode === 'deployment'" 
                class="w-3 h-3 rounded-full bg-security"
              ></div>
            </div>
            <div>
              <label for="mode-deployment" class="font-medium cursor-pointer block text-modernity">Deployment Analysis</label>
              <span class="text-xs text-gray-500 block mt-0.5">Deep scanning for deployment readiness</span>
            </div>
          </div>
        </div>
        
        <!-- Hidden radio buttons for accessibility -->
        <input id="mode-standard" type="radio" v-model="deploymentMode" value="standard" class="hidden" />
        <input id="mode-deployment" type="radio" v-model="deploymentMode" value="deployment" class="hidden" />
      </div>
      
      <div class="mt-6">
        <button 
          type="submit" 
          :disabled="!selectedFile || isVerifying" 
          class="w-full py-4 px-6 bg-gradient-to-r from-security to-security-dark text-white font-medium rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-security focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <div class="flex items-center justify-center">
            <div v-if="isVerifying" class="mr-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div v-else class="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span>{{ isVerifying ? 'Verifying...' : 'Verify Signature' }}</span>
          </div>
        </button>
      </div>
    </form>
    
    <div v-if="verificationResult" class="verification-results mt-8 overflow-hidden">
      <div 
        class="p-5 rounded-t-xl shadow-sm border transition-all duration-500"
        :class="{
          'bg-gradient-to-r from-green-50 to-green-100/50 border-green-200': verificationResult.result.valid && verificationResult.result.intuneCompatibility.compatible,
          'bg-gradient-to-r from-yellow-50 to-yellow-100/50 border-yellow-200': verificationResult.result.valid && !verificationResult.result.intuneCompatibility.compatible,
          'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200': !verificationResult.result.valid
        }"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-4">
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center shadow-sm border"
              :class="{
                'bg-white border-green-200': verificationResult.result.valid && verificationResult.result.intuneCompatibility.compatible,
                'bg-white border-yellow-200': verificationResult.result.valid && !verificationResult.result.intuneCompatibility.compatible,
                'bg-white border-red-200': !verificationResult.result.valid
              }"
            >
              <svg v-if="verificationResult.result.valid && verificationResult.result.intuneCompatibility.compatible" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else-if="verificationResult.result.valid && !verificationResult.result.intuneCompatibility.compatible" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 
              class="text-xl font-bold mb-1"
              :class="{
                'text-green-700': verificationResult.result.valid && verificationResult.result.intuneCompatibility.compatible,
                'text-yellow-700': verificationResult.result.valid && !verificationResult.result.intuneCompatibility.compatible,
                'text-red-700': !verificationResult.result.valid
              }"
            >
              {{ getStatusTitle(verificationResult.result) }}
            </h3>
            <p 
              class="text-sm"
              :class="{
                'text-green-600': verificationResult.result.valid && verificationResult.result.intuneCompatibility.compatible,
                'text-yellow-600': verificationResult.result.valid && !verificationResult.result.intuneCompatibility.compatible,
                'text-red-600': !verificationResult.result.valid
              }"
            >
              {{ verificationResult.result.message }}
            </p>
          </div>
        </div>
      </div>
      
      <div class="p-6 border border-t-0 rounded-b-xl bg-white shadow-sm">
        <!-- Security Score -->
        <div class="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-modernity">Signature Security Score</h4>
            <div 
              class="px-3 py-1 rounded-full text-sm font-semibold shadow-sm"
              :class="getScoreClass(verificationResult.result.securityScore)"
            >
              {{ verificationResult.result.securityScore }}/10
            </div>
          </div>
          
          <div class="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <!-- Score bar background with shine effect -->
            <div 
              class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-1000 ease-out"
              :style="`width: ${verificationResult.result.securityScore * 10}%`" 
              :class="getScoreBarClass(verificationResult.result.securityScore)"
            >
              <!-- Animated shine effect -->
              <div class="absolute top-0 bottom-0 left-0 right-0 shine-effect"></div>
            </div>
          </div>
          
          <!-- Score labels -->
          <div class="flex justify-between mt-1 text-xs text-gray-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
        
        <!-- Signature Type -->
        <div v-if="verificationResult.result.signatureType" class="mb-4">
          <h4 class="font-medium text-gray-900">Signature Type</h4>
          <p class="text-gray-700">{{ verificationResult.result.signatureType }}</p>
        </div>
        
        <!-- Certificate Info -->
        <div v-if="verificationResult.result.certificateInfo" class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-modernity">Certificate Information</h4>
            <button 
              @click="toggleCertificateDetails" 
              class="text-security hover:text-security-dark text-sm font-medium flex items-center transition-colors duration-200"
            >
              <span>{{ showCertificateDetails ? 'Hide details' : 'Show details' }}</span>
              <svg 
                :class="{ 'rotate-180 transform': showCertificateDetails }"
                class="w-4 h-4 ml-1 transition-transform duration-200"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          
          <transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 max-h-0 overflow-hidden"
            enter-to-class="opacity-100 max-h-[500px] overflow-hidden"
            leave-from-class="opacity-100 max-h-[500px] overflow-hidden"
            leave-to-class="opacity-0 max-h-0 overflow-hidden"
          >
            <div v-if="showCertificateDetails" class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div v-if="verificationResult.result.certificateInfo.subject" class="cert-info-item">
                  <dt class="text-sm font-medium text-security mb-1">Subject</dt>
                  <dd class="text-sm text-gray-800 break-all bg-gray-50 p-2 rounded border border-gray-100">
                    {{ verificationResult.result.certificateInfo.subject }}
                  </dd>
                </div>
                <div v-if="verificationResult.result.certificateInfo.issuer" class="cert-info-item">
                  <dt class="text-sm font-medium text-security mb-1">Issuer</dt>
                  <dd class="text-sm text-gray-800 break-all bg-gray-50 p-2 rounded border border-gray-100">
                    {{ verificationResult.result.certificateInfo.issuer }}
                  </dd>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-4 sm:col-span-2">
                  <div v-if="verificationResult.result.certificateInfo.validityPeriod" class="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <dt class="text-sm font-medium text-security mb-1">Valid From</dt>
                    <dd class="text-sm text-gray-800">{{ verificationResult.result.certificateInfo.validityPeriod.notBefore }}</dd>
                  </div>
                  <div v-if="verificationResult.result.certificateInfo.validityPeriod" class="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <dt class="text-sm font-medium text-security mb-1">Valid Until</dt>
                    <dd class="text-sm text-gray-800">{{ verificationResult.result.certificateInfo.validityPeriod.notAfter }}</dd>
                  </div>
                </div>
                
                <div v-if="verificationResult.result.certificateInfo.signatureAlgorithm" class="cert-info-item">
                  <dt class="text-sm font-medium text-security mb-1">Algorithm</dt>
                  <dd class="text-sm text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">
                    {{ verificationResult.result.certificateInfo.signatureAlgorithm }}
                  </dd>
                </div>
                <div v-if="verificationResult.result.certificateInfo.keyStrength" class="cert-info-item">
                  <dt class="text-sm font-medium text-security mb-1">Key Strength</dt>
                  <dd 
                    class="text-sm font-medium p-2 rounded border inline-flex items-center"
                    :class="{
                      'bg-green-50 border-green-200 text-green-700': verificationResult.result.certificateInfo.keyStrength >= 2048,
                      'bg-yellow-50 border-yellow-200 text-yellow-700': verificationResult.result.certificateInfo.keyStrength < 2048
                    }"
                  >
                    <svg v-if="verificationResult.result.certificateInfo.keyStrength >= 2048" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    {{ verificationResult.result.certificateInfo.keyStrength }} bits
                  </dd>
                </div>
                
                <div class="sm:col-span-2" v-if="verificationResult.result.certificateInfo.isSelfSigned !== undefined">
                  <dt class="text-sm font-medium text-security mb-1">Certificate Type</dt>
                  <dd 
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    :class="verificationResult.result.certificateInfo.isSelfSigned 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                      : 'bg-green-100 text-green-800 border border-green-200'"
                  >
                    {{ verificationResult.result.certificateInfo.isSelfSigned ? 'Self-Signed Certificate' : 'CA-Issued Certificate' }}
                  </dd>
                </div>
              </dl>
            </div>
          </transition>
          
          <!-- Certificate summary when collapsed -->
          <div v-if="!showCertificateDetails" class="flex flex-wrap gap-2">
            <div 
              class="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800 flex items-center"
              v-if="verificationResult.result.certificateInfo.subject"
            >
              <span class="truncate max-w-[200px]">{{ extractCN(verificationResult.result.certificateInfo.subject) }}</span>
            </div>
            <div 
              class="px-3 py-1 rounded-full text-xs font-medium flex items-center"
              :class="verificationResult.result.certificateInfo.isSelfSigned 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                : 'bg-green-100 text-green-800 border border-green-200'"
              v-if="verificationResult.result.certificateInfo.isSelfSigned !== undefined"
            >
              {{ verificationResult.result.certificateInfo.isSelfSigned ? 'Self-Signed' : 'CA-Issued' }}
            </div>
            <div 
              class="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800 flex items-center"
              v-if="verificationResult.result.certificateInfo.keyStrength"
            >
              {{ verificationResult.result.certificateInfo.keyStrength }} bits
            </div>
          </div>
        </div>
        
        <!-- Intune Compatibility -->
        <div v-if="verificationResult.result.intuneCompatibility" class="mb-6">
          <h4 class="font-semibold text-modernity mb-3">Intune & Airlock Compatibility</h4>
          
          <!-- Status Card -->
          <div 
            class="p-4 rounded-xl border flex items-center mb-4"
            :class="verificationResult.result.intuneCompatibility.compatible 
              ? 'bg-green-50/70 border-green-200' 
              : 'bg-red-50/70 border-red-200'"
          >
            <div 
              class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mr-4 border shadow-sm"
              :class="verificationResult.result.intuneCompatibility.compatible 
                ? 'bg-white border-green-200 text-green-600' 
                : 'bg-white border-red-200 text-red-600'"
            >
              <svg v-if="verificationResult.result.intuneCompatibility.compatible" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 
                class="font-medium text-lg mb-1"
                :class="verificationResult.result.intuneCompatibility.compatible ? 'text-green-700' : 'text-red-700'"
              >
                {{ verificationResult.result.intuneCompatibility.compatible ? 'Compatible with Intune deployment' : 'Not compatible with Intune deployment' }}
              </h5>
              <p 
                class="text-sm"
                :class="verificationResult.result.intuneCompatibility.compatible ? 'text-green-600' : 'text-red-600'"
              >
                {{ verificationResult.result.intuneCompatibility.compatible 
                  ? 'This file meets the requirements for Microsoft Intune deployment' 
                  : 'This file does not meet the requirements for Microsoft Intune deployment' 
                }}
              </p>
            </div>
          </div>
          
          <!-- Issues Cards -->
          <div class="space-y-4">
            <!-- Blockers -->
            <div 
              v-if="verificationResult.result.intuneCompatibility.blockers && verificationResult.result.intuneCompatibility.blockers.length > 0" 
              class="bg-white p-4 rounded-xl border border-red-200 shadow-sm"
            >
              <h5 class="font-medium text-red-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Blocking Issues
              </h5>
              <ul class="space-y-2">
                <li 
                  v-for="(blocker, index) in verificationResult.result.intuneCompatibility.blockers" 
                  :key="'blocker-'+index" 
                  class="text-sm text-red-700 flex items-start"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  {{ blocker }}
                </li>
              </ul>
            </div>
            
            <!-- Warnings -->
            <div 
              v-if="verificationResult.result.intuneCompatibility.warnings && verificationResult.result.intuneCompatibility.warnings.length > 0"
              class="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm"
            >
              <h5 class="font-medium text-yellow-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Warnings
              </h5>
              <ul class="space-y-2">
                <li 
                  v-for="(warning, index) in verificationResult.result.intuneCompatibility.warnings" 
                  :key="'warning-'+index" 
                  class="text-sm text-yellow-700 flex items-start"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  {{ warning }}
                </li>
              </ul>
            </div>
            
            <!-- Recommendations -->
            <div 
              v-if="verificationResult.result.intuneCompatibility.recommendations && verificationResult.result.intuneCompatibility.recommendations.length > 0"
              class="bg-white p-4 rounded-xl border border-blue-200 shadow-sm"
            >
              <h5 class="font-medium text-blue-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Recommendations
              </h5>
              <ul class="space-y-2">
                <li 
                  v-for="(rec, index) in verificationResult.result.intuneCompatibility.recommendations" 
                  :key="'rec-'+index" 
                  class="text-sm text-blue-700 flex items-start"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  {{ rec }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Deployment Checks -->
        <div v-if="verificationResult.result.deploymentChecks" class="mb-6">
          <h4 class="font-semibold text-modernity mb-3">Deployment Checks</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              class="p-4 rounded-xl border shadow-sm flex flex-col items-center text-center"
              :class="verificationResult.result.deploymentChecks.fileNameValid
                ? 'bg-green-50/70 border-green-200'
                : 'bg-red-50/70 border-red-200'"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                :class="verificationResult.result.deploymentChecks.fileNameValid
                  ? 'bg-white text-green-500 border border-green-200 shadow-sm'
                  : 'bg-white text-red-500 border border-red-200 shadow-sm'"
              >
                <svg v-if="verificationResult.result.deploymentChecks.fileNameValid" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h5 class="font-medium mb-1" :class="verificationResult.result.deploymentChecks.fileNameValid ? 'text-green-700' : 'text-red-700'">
                Filename
              </h5>
              <p class="text-sm" :class="verificationResult.result.deploymentChecks.fileNameValid ? 'text-green-600' : 'text-red-600'">
                {{ verificationResult.result.deploymentChecks.fileNameValid ? 'Valid for deployment' : 'Invalid for deployment' }}
              </p>
            </div>
            
            <div 
              class="p-4 rounded-xl border shadow-sm flex flex-col items-center text-center"
              :class="verificationResult.result.deploymentChecks.sizeAcceptable
                ? 'bg-green-50/70 border-green-200'
                : 'bg-red-50/70 border-red-200'"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                :class="verificationResult.result.deploymentChecks.sizeAcceptable
                  ? 'bg-white text-green-500 border border-green-200 shadow-sm'
                  : 'bg-white text-red-500 border border-red-200 shadow-sm'"
              >
                <svg v-if="verificationResult.result.deploymentChecks.sizeAcceptable" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h5 class="font-medium mb-1" :class="verificationResult.result.deploymentChecks.sizeAcceptable ? 'text-green-700' : 'text-red-700'">
                File Size
              </h5>
              <p class="text-sm" :class="verificationResult.result.deploymentChecks.sizeAcceptable ? 'text-green-600' : 'text-red-600'">
                {{ verificationResult.result.deploymentChecks.sizeAcceptable ? 'Acceptable for deployment' : 'Too large for deployment' }}
              </p>
            </div>
            
            <div 
              v-if="verificationResult.result.deploymentChecks.pathTooLong !== undefined"
              class="p-4 rounded-xl border shadow-sm flex flex-col items-center text-center"
              :class="!verificationResult.result.deploymentChecks.pathTooLong
                ? 'bg-green-50/70 border-green-200'
                : 'bg-red-50/70 border-red-200'"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                :class="!verificationResult.result.deploymentChecks.pathTooLong
                  ? 'bg-white text-green-500 border border-green-200 shadow-sm'
                  : 'bg-white text-red-500 border border-red-200 shadow-sm'"
              >
                <svg v-if="!verificationResult.result.deploymentChecks.pathTooLong" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h5 class="font-medium mb-1" :class="!verificationResult.result.deploymentChecks.pathTooLong ? 'text-green-700' : 'text-red-700'">
                Path Length
              </h5>
              <p class="text-sm" :class="!verificationResult.result.deploymentChecks.pathTooLong ? 'text-green-600' : 'text-red-600'">
                {{ !verificationResult.result.deploymentChecks.pathTooLong ? 'Within acceptable limits' : 'Path too long' }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Technical Details Accordion -->
        <div class="mt-6">
          <div 
            class="border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            :class="{ 'shadow-md': showTechDetails }"
          >
            <button 
              @click="toggleTechDetails"
              type="button"
              class="flex justify-between w-full px-5 py-4 font-medium text-left transition-colors duration-200"
              :class="showTechDetails 
                ? 'text-security bg-security/5 hover:bg-security/10' 
                : 'text-gray-700 bg-gray-50 hover:bg-gray-100'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Technical Verification Details
              </span>
              <svg 
                :class="{ 'rotate-180 transform': showTechDetails }"
                class="w-5 h-5 transition-transform duration-300"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <transition
              enter-active-class="transition-all duration-300 ease-out"
              leave-active-class="transition-all duration-200 ease-in"
              enter-from-class="opacity-0 max-h-0 overflow-hidden"
              enter-to-class="opacity-100 max-h-[1000px] overflow-hidden"
              leave-from-class="opacity-100 max-h-[1000px] overflow-hidden"
              leave-to-class="opacity-0 max-h-0 overflow-hidden"
            >
              <div v-if="showTechDetails" class="px-5 py-4 text-sm text-gray-700 bg-white border-t border-gray-200">
                <!-- Verification Methods -->
                <div v-if="verificationResult.result.methodsAttempted && verificationResult.result.methodsAttempted.length > 0" class="mb-6">
                  <h5 class="font-semibold text-modernity mb-3">Verification Methods Used</h5>
                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div class="grid grid-cols-2 gap-3">
                      <div 
                        v-for="(method, index) in verificationResult.result.methodsAttempted" 
                        :key="'method-'+index" 
                        class="flex items-center p-2 rounded-lg"
                        :class="verificationResult.result.verificationDetails[method]?.valid 
                          ? 'bg-green-50' 
                          : 'bg-gray-100'"
                      >
                        <div 
                          class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                          :class="verificationResult.result.verificationDetails[method]?.valid 
                            ? 'bg-white text-green-600 border border-green-200' 
                            : 'bg-white text-gray-400 border border-gray-300'"
                        >
                          <svg v-if="verificationResult.result.verificationDetails[method]?.valid" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                          </svg>
                        </div>
                        <span class="capitalize font-medium">{{ method }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Content Analysis -->
                <div v-if="verificationResult.result.contentAnalysis" class="mb-6">
                  <h5 class="font-semibold text-modernity mb-3">Content Analysis</h5>
                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(verificationResult.result.contentAnalysis, null, 2) }}</pre>
                  </div>
                </div>
                
                <!-- Raw Verification Result -->
                <div class="mb-4">
                  <h5 class="font-semibold text-modernity mb-3">Raw Verification Result</h5>
                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 overflow-auto max-h-96 code-block">
                    <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(verificationResult.result, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
    
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 transform translate-y-4"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-4"
    >
      <div v-if="error" class="mt-6 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 p-5 rounded-xl shadow-sm">
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-4">
            <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-red-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-red-800 font-bold text-lg mb-1">Verification Error</h3>
            <p class="text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const selectedFile = ref(null);
const isVerifying = ref(false);
const verificationResult = ref(null);
const error = ref(null);
const deploymentMode = ref('standard');
const showTechDetails = ref(false);
const showCertificateDetails = ref(false);

/**
 * Handle file selection from input
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    error.value = null;
  }
}

/**
 * Clear selected file
 */
function clearSelectedFile() {
  selectedFile.value = null;
  verificationResult.value = null;
  error.value = null;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Toggle technical details display
 */
function toggleTechDetails() {
  showTechDetails.value = !showTechDetails.value;
}

/**
 * Toggle certificate details display
 */
function toggleCertificateDetails() {
  showCertificateDetails.value = !showCertificateDetails.value;
}

/**
 * Extract the Common Name (CN) from a certificate subject string
 */
function extractCN(subject) {
  if (!subject) return '';
  
  // Try to extract CN=something
  const cnMatch = subject.match(/CN=([^,]+)/i);
  if (cnMatch && cnMatch[1]) {
    return cnMatch[1];
  }
  
  // If CN not found, return a shortened version of the subject
  return subject.length > 30 ? subject.substring(0, 30) + '...' : subject;
}

/**
 * Submit form to verify signature
 */
async function verifySignature() {
  if (!selectedFile.value) {
    error.value = 'Please select a file to verify';
    return;
  }
  
  try {
    error.value = null;
    isVerifying.value = true;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('deploymentMode', deploymentMode.value);
    
    // Send to API
    const response = await fetch('/api/verify-intune', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      verificationResult.value = data;
    } else {
      error.value = data.message || 'An error occurred during verification';
    }
  } catch (err) {
    error.value = 'Error: ' + (err.message || 'An unknown error occurred');
  } finally {
    isVerifying.value = false;
  }
}

/**
 * Get status title based on result
 */
function getStatusTitle(result) {
  if (result.valid && result.intuneCompatibility.compatible) {
    return 'Valid Signature - Intune Compatible';
  } else if (result.valid && !result.intuneCompatibility.compatible) {
    return 'Valid Signature - Not Intune Compatible';
  } else {
    return 'Invalid Signature';
  }
}

/**
 * Get color class for security score badge
 */
function getScoreClass(score) {
  if (score >= 8) return 'bg-green-100 text-green-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Get color class for security score progress bar
 */
function getScoreBarClass(score) {
  if (score >= 8) return 'bg-green-500';
  if (score >= 5) return 'bg-yellow-500';
  return 'bg-red-500';
}
</script>

<style scoped>
.file-upload-container {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  transition: all 0.3s ease;
  padding: 2rem;
}

.file-upload-container:hover {
  background-color: rgba(var(--color-security-rgb), 0.08);
  box-shadow: 0 4px 12px rgba(var(--color-security-rgb), 0.1);
  transform: translateY(-2px);
}

/* Shine effect for security score bar */
.shine-effect {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

/* Certificate info items */
.cert-info-item {
  transition: transform 0.2s ease;
}

.cert-info-item:hover {
  transform: translateY(-2px);
}

/* Technical details code block */
.code-block {
  position: relative;
}

.code-block::before {
  content: 'JSON';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: rgba(var(--color-security-rgb), 0.1);
  color: var(--color-security);
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>