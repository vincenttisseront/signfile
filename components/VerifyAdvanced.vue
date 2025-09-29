<template>
  <div class="bg-white p-6 rounded-xl border border-security/20 shadow-sm">
    <h2 class="text-xl font-bold text-security mb-6 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Advanced Signature Verification
    </h2>
    
    <form ref="uploadForm" @submit.prevent="verifyFile" class="space-y-6">
      <div class="file-upload-wrapper">
        <label class="block font-medium text-gray-700 mb-2" for="fileUpload">Select a file to verify</label>
        <div class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-security/40 transition-colors duration-300 bg-gray-50">
          <input
            id="fileUpload"
            type="file"
            accept=".ps1,.cmd,.bat,.exe,.dll,.msi,.appx,.app"
            @change="onFileSelected"
            required
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            ref="fileInput"
          />
          
          <div class="text-center" v-if="!selectedFile">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="mt-1 text-sm text-gray-600">Drag and drop a file here or click to browse</p>
            <p class="mt-1 text-xs text-gray-500">Supported files: PowerShell scripts (.ps1), CMD scripts (.cmd, .bat), executables (.exe), etc.</p>
          </div>
          
          <div v-else class="flex items-center">
            <div class="flex-shrink-0 p-2 bg-security/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-4 flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</div>
              <div class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</div>
            </div>
            <button 
              type="button" 
              @click="clearSelectedFile"
              class="flex-shrink-0 ml-4 text-sm font-medium text-energy hover:text-energy/70 focus:outline-none focus:underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-security/5 to-security/10 p-5 rounded-xl border border-security/20">
        <h3 class="text-lg font-medium text-security mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Advanced Verification Options
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white rounded-lg p-3 shadow-sm border border-security/10">
            <div class="flex items-center">
              <input 
                class="h-4 w-4 text-security focus:ring-security border-gray-300 rounded transition-colors" 
                type="checkbox" 
                v-model="options.deepScan" 
                id="deepScan"
              >
              <label class="ml-2 text-sm text-gray-700 font-medium" for="deepScan">
                Deep Scan
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-6">Performs thorough analysis of the file and signature (slower but more accurate)</p>
          </div>
          
          <div class="bg-white rounded-lg p-3 shadow-sm border border-security/10">
            <div class="flex items-center">
              <input 
                class="h-4 w-4 text-security focus:ring-security border-gray-300 rounded transition-colors" 
                type="checkbox" 
                v-model="options.checkCertificateRevocation" 
                id="checkRevocation"
              >
              <label class="ml-2 text-sm text-gray-700 font-medium" for="checkRevocation">
                Certificate Revocation
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-6">Checks if the certificate has been revoked by its issuer</p>
          </div>
          
          <div class="bg-white rounded-lg p-3 shadow-sm border border-security/10">
            <div class="flex items-center">
              <input 
                class="h-4 w-4 text-security focus:ring-security border-gray-300 rounded transition-colors" 
                type="checkbox" 
                v-model="options.checkTrustedRoots" 
                id="checkTrustedRoots"
              >
              <label class="ml-2 text-sm text-gray-700 font-medium" for="checkTrustedRoots">
                Trusted Root Certificates
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-6">Verifies the certificate chain up to a trusted root authority</p>
          </div>
        </div>
      </div>
      
      <button 
        type="submit" 
        class="w-full py-3 px-4 bg-security hover:bg-security/90 focus:ring-2 focus:ring-offset-2 focus:ring-security/50 text-white font-medium rounded-lg shadow-sm focus:outline-none transition-all duration-200 relative"
        :disabled="!selectedFile || isVerifying"
        :class="{'opacity-80': !selectedFile || isVerifying}"
      >
        <span :class="{'opacity-0': isVerifying}" class="transition-opacity flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Perform Advanced Verification
        </span>
        <div v-if="isVerifying" class="absolute inset-0 flex items-center justify-center">
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Verifying...</span>
          </div>
        </div>
      </button>
    </form>
    
    <div v-if="error" class="mt-6 p-4 bg-energy/10 rounded-lg border border-energy/20 text-energy flex items-start">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <transition 
      name="fade"
      mode="out-in"
      appear
    >
      <div v-if="result !== null && !isVerifying" 
          class="p-6 rounded-xl border mt-8 shadow-sm" 
          :class="result.valid ? 'border-currency bg-gradient-to-br from-currency/5 to-currency/10' : 'border-energy bg-gradient-to-br from-energy/5 to-energy/10'">
        
        <div class="flex items-center mb-5">
          <div class="rounded-full p-2" :class="result.valid ? 'bg-currency/20' : 'bg-energy/20'">
            <svg v-if="result.valid" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-currency" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-energy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-bold" :class="result.valid ? 'text-currency' : 'text-energy'">
              {{ result.valid ? 'Valid Signature' : 'Invalid or Missing Signature' }}
            </h3>
            <p class="text-gray-700">{{ result.message }}</p>
          </div>
        </div>
        
        <!-- Security Score -->
        <div v-if="result.securityScore !== undefined" class="mb-6 bg-white/60 p-5 rounded-lg border border-security/20 shadow-sm">
          <h3 class="text-lg font-medium text-security mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Security Score
          </h3>
          
          <div class="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div class="absolute top-0 left-0 h-full transition-all duration-1000 ease-out flex items-center justify-center text-white text-sm font-medium"
                :style="`width: ${result.securityScore * 10}%`"
                :class="scoreProgressClass">
                {{ result.securityScore }}/10
            </div>
          </div>
          
          <div class="flex justify-between text-xs text-gray-500 mb-2">
            <span>Low Security</span>
            <span>High Security</span>
          </div>
          
          <p v-if="result.explanation?.securityScore?.interpretation" 
             class="text-sm text-gray-700 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {{ result.explanation.securityScore.interpretation }}
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- File Info Card -->
          <div v-if="result.file" class="bg-white/60 rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 class="font-medium text-gray-900 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              File Details
            </h4>
            <dl class="grid grid-cols-3 gap-y-2 text-sm">
              <dt class="col-span-1 font-medium text-gray-600">Name</dt>
              <dd class="col-span-2 text-gray-900 truncate">{{ result.file.name }}</dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Size</dt>
              <dd class="col-span-2 text-gray-900">{{ formatFileSize(result.file.size) }}</dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Type</dt>
              <dd class="col-span-2 text-gray-900">{{ result.file.type || 'Unknown' }}</dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Modified</dt>
              <dd class="col-span-2 text-gray-900">{{ formatDate(result.file.lastModified) }}</dd>
            </dl>
          </div>
          
          <!-- Certificate Summary Card -->
          <div v-if="result.certificateInfo" class="bg-white/60 rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 class="font-medium text-gray-900 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              Certificate
            </h4>
            <dl class="grid grid-cols-3 gap-y-2 text-sm">
              <dt class="col-span-1 font-medium text-gray-600">Issued To</dt>
              <dd class="col-span-2 text-gray-900 truncate" :title="result.certificateInfo.subject">
                {{ truncateText(result.certificateInfo.subject, 30) }}
              </dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Issued By</dt>
              <dd class="col-span-2 text-gray-900 truncate" :title="result.certificateInfo.issuer">
                {{ truncateText(result.certificateInfo.issuer, 30) }}
              </dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Valid Until</dt>
              <dd class="col-span-2" :class="result.certificateInfo.validityPeriod?.isValid ? 'text-gray-900' : 'text-energy'">
                {{ formatDate(result.certificateInfo.validityPeriod?.notAfter) }}
                <span v-if="!result.certificateInfo.validityPeriod?.isValid" class="text-xs bg-energy/10 text-energy px-1 py-0.5 rounded ml-1">
                  Expired
                </span>
              </dd>
              
              <dt class="col-span-1 font-medium text-gray-600">Key Strength</dt>
              <dd class="col-span-2">
                <span :class="result.certificateInfo.keyStrength >= 2048 ? 'text-gray-900' : 'text-energy'">
                  {{ result.certificateInfo.keyStrength }} bits
                </span>
                <span v-if="result.certificateInfo.keyStrength < 2048" class="text-xs bg-energy/10 text-energy px-1 py-0.5 rounded ml-1">
                  Weak
                </span>
              </dd>
            </dl>
            <div class="mt-2">
              <button 
                @click="showCertDetails = !showCertDetails" 
                class="text-security hover:text-security/80 text-xs flex items-center font-medium focus:outline-none"
              >
                {{ showCertDetails ? 'Hide Details' : 'View Full Certificate Details' }}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  class="h-4 w-4 ml-1 transition-transform"
                  :class="{'rotate-180': showCertDetails}"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Certificate Details Expanded -->
        <div v-if="showCertDetails && result.certificateInfo" class="mb-6 bg-white/60 p-4 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-medium text-gray-900 mb-3">Full Certificate Details</h4>
          
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Subject</div>
            <div class="px-4 py-2 text-sm text-gray-700 break-words border-b border-gray-200">
              {{ result.certificateInfo.subject }}
            </div>
            
            <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Issuer</div>
            <div class="px-4 py-2 text-sm text-gray-700 break-words border-b border-gray-200">
              {{ result.certificateInfo.issuer }}
            </div>
            
            <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Validity Period</div>
            <div class="px-4 py-2 text-sm border-b border-gray-200">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="text-gray-600">Not Before:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(result.certificateInfo.validityPeriod?.notBefore) }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Not After:</span>
                  <span 
                    class="ml-2" 
                    :class="result.certificateInfo.validityPeriod?.isValid ? 'text-gray-900' : 'text-energy'"
                  >
                    {{ formatDate(result.certificateInfo.validityPeriod?.notAfter) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Fingerprints</div>
            <div class="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              <div v-if="result.certificateInfo.fingerprints?.sha1" class="mb-1">
                <span class="text-gray-600">SHA-1:</span>
                <span class="ml-2 font-mono text-xs">{{ result.certificateInfo.fingerprints.sha1 }}</span>
              </div>
              <div v-if="result.certificateInfo.fingerprints?.sha256">
                <span class="text-gray-600">SHA-256:</span>
                <span class="ml-2 font-mono text-xs">{{ result.certificateInfo.fingerprints.sha256 }}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-2">
              <div>
                <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Key Strength</div>
                <div class="px-4 py-2 text-sm border-b border-gray-200 md:border-b-0 md:border-r">
                  <span :class="result.certificateInfo.keyStrength >= 2048 ? 'text-gray-900' : 'text-energy'">
                    {{ result.certificateInfo.keyStrength }} bits
                  </span>
                  <span v-if="result.certificateInfo.keyStrength < 2048" class="text-xs bg-energy/10 text-energy px-1 py-0.5 rounded ml-1">
                    Weak
                  </span>
                </div>
              </div>
              <div>
                <div class="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Self-Signed</div>
                <div class="px-4 py-2 text-sm">
                  <span :class="!result.certificateInfo.isSelfSigned ? 'text-gray-900' : 'text-energy'">
                    {{ result.certificateInfo.isSelfSigned ? 'Yes' : 'No' }}
                  </span>
                  <span v-if="result.certificateInfo.isSelfSigned" class="text-xs bg-energy/10 text-energy px-1 py-0.5 rounded ml-1">
                    Less secure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tabs for additional information -->
        <div class="mb-6">
          <div class="border-b border-gray-200">
            <nav class="flex -mb-px space-x-8">
              <button 
                @click="activeTab = 'verification'"
                class="py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap"
                :class="activeTab === 'verification' 
                  ? 'border-security text-security' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Verification Methods
              </button>
              <button 
                @click="activeTab = 'issues'"
                class="py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap"
                :class="activeTab === 'issues' 
                  ? 'border-security text-security' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Issues & Warnings
              </button>
              <button 
                @click="activeTab = 'recommendations'"
                class="py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap"
                :class="activeTab === 'recommendations' 
                  ? 'border-security text-security' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Recommendations
              </button>
            </nav>
          </div>
          
          <div class="pt-4">
            <!-- Verification Methods Tab -->
            <div v-if="activeTab === 'verification'" class="space-y-3">
              <div v-if="result.explanation?.verificationMethods" class="text-sm">
                <div v-for="(method, key) in result.explanation.verificationMethods" :key="key"
                     class="p-3 rounded-lg mb-3 border"
                     :class="method.result === 'Passed' ? 'bg-currency/5 border-currency/20' : 'bg-energy/5 border-energy/20'">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-gray-900">{{ method.name }}</span>
                    <span 
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="method.result === 'Passed' 
                        ? 'bg-currency/20 text-currency' 
                        : 'bg-energy/20 text-energy'"
                    >
                      {{ method.result }}
                    </span>
                  </div>
                  <p class="text-gray-700">{{ method.description }}</p>
                </div>
              </div>
              <div v-else class="text-gray-500 text-center py-4">
                No detailed verification method information available
              </div>
            </div>
            
            <!-- Issues Tab -->
            <div v-if="activeTab === 'issues'" class="space-y-3">
              <div v-if="result.warnings && result.warnings.length" class="bg-energy/5 border border-energy/20 rounded-lg p-4">
                <h5 class="flex items-center font-medium text-energy mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warnings
                </h5>
                <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
                  <li v-for="(warning, index) in result.warnings" :key="index">
                    {{ warning }}
                  </li>
                </ul>
              </div>
              
              <div v-if="result.usingFallback" class="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
                <div class="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="font-medium">Using Fallback Verification</span>
                </div>
                <p>Using simplified verification due to unavailable advanced verification module.</p>
              </div>
              
              <div v-if="!result.warnings?.length && !result.usingFallback" class="text-center py-4 text-gray-500">
                No warnings or issues detected
              </div>
            </div>
            
            <!-- Recommendations Tab -->
            <div v-if="activeTab === 'recommendations'" class="space-y-3">
              <div v-if="result.recommendations && result.recommendations.length" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 class="flex items-center font-medium text-blue-800 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recommendations
                </h5>
                <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
                  <li v-for="(recommendation, index) in result.recommendations" :key="index">
                    {{ recommendation }}
                  </li>
                </ul>
              </div>
              
              <div v-else class="text-center py-4 text-gray-500">
                No recommendations available
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// File handling
const fileInput = ref(null)
const uploadForm = ref(null)
const isVerifying = ref(false)
const selectedFile = ref(null)
const error = ref(null)
const result = ref(null)

// UI state
const activeTab = ref('verification')
const showCertDetails = ref(false)

// Verification options
const options = ref({
  deepScan: false,
  checkCertificateRevocation: false,
  checkTrustedRoots: false
})

// Event handlers
const onFileSelected = (event) => {
  selectedFile.value = event.target.files[0]
  result.value = null
  error.value = null
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  result.value = null
  error.value = null
}

const verifyFile = async () => {
  if (!selectedFile.value) {
    error.value = "Please select a file to verify."
    return
  }
  
  try {
    isVerifying.value = true
    error.value = null
    result.value = null
    
    const formData = new FormData()
    formData.append('script', selectedFile.value)
    
    // Add options
    if (options.value.deepScan) {
      formData.append('deepScan', 'true')
    }
    
    if (options.value.checkCertificateRevocation) {
      formData.append('checkCertificateRevocation', 'true')
    }
    
    if (options.value.checkTrustedRoots) {
      formData.append('checkTrustedRoots', 'true')
    }
    
    const response = await fetch('/api/verify-advanced', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    result.value = await response.json()
    // Set the default active tab
    activeTab.value = 'verification'
    
    console.log('Verification result:', result.value)
  } catch (err) {
    console.error('Verification error:', err)
    error.value = err.message || "An error occurred during verification"
  } finally {
    isVerifying.value = false
  }
}

// Formatting helpers
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// Helper functions
const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? `${text.substring(0, length)}...` : text
}

// Computed properties for styling
const scoreProgressClass = computed(() => {
  if (!result.value?.securityScore) return 'bg-gray-400'
  
  const score = result.value.securityScore
  if (score >= 8) return 'bg-gradient-to-r from-emerald-500 to-green-400'
  if (score >= 6) return 'bg-gradient-to-r from-lime-500 to-yellow-400'
  if (score >= 4) return 'bg-gradient-to-r from-amber-500 to-orange-400'
  return 'bg-gradient-to-r from-orange-500 to-red-400'
})
</script>

<style scoped>
.text-2xs {
  font-size: 0.65rem;
}
</style>