<template>
  <div class="max-w-3xl mx-auto">
    <div class="p-6 rounded-xl border border-security/20 bg-white shadow-sm">
      <h2 class="text-xl font-semibold mb-4 text-security flex items-center gap-2 border-b border-security/30 pb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Certificate Management
      </h2>
      
      <!-- Certificate Upload Section -->
      <div class="mb-8 bg-gradient-to-br from-security/5 to-security/10 p-5 rounded-lg border border-security/15">
        <h3 class="text-lg font-medium text-security mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload New Certificate
        </h3>
        
        <form @submit.prevent="uploadCertificate" class="space-y-4">
          <div class="space-y-2">
            <label class="form-label text-security font-medium block" for="newCertFile">
              Upload Certificate (.pfx, .pem)
            </label>
            <div class="file-upload-container">
              <!-- Hidden file input -->
              <input
                id="newCertFile"
                type="file"
                accept=".pfx,.pem"
                @change="handleCertFileChange"
                class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 input-file"
              />
              
              <!-- Visible styled button -->
              <div class="relative border-2 border-dashed border-security/30 rounded-lg p-4 hover:border-security/60 transition-colors duration-200 bg-white/50">
                <div v-if="!newCertFile" class="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-8 w-8 text-security/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p class="mt-2 text-sm text-security/80">
                    Drag and drop a certificate file here or
                    <span class="text-security font-medium underline">browse</span>
                  </p>
                  <p class="mt-1 text-xs text-security/60">Supported formats: .pfx, .pem</p>
                </div>
                <div v-else class="flex items-center p-2">
                  <div class="flex-shrink-0 p-2 bg-security/10 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="ml-4 flex-1 min-w-0">
                    <div class="text-sm font-medium text-security truncate">{{ newCertFile?.name || '' }}</div>
                    <div class="text-xs text-security/70 mt-0.5 flex items-center gap-1.5">
                      <span class="inline-block w-2 h-2 bg-currency rounded-full"></span>
                      Certificate selected
                    </div>
                  </div>
                  <button type="button" @click="clearNewCertForm" class="ml-2 text-energy hover:text-energy/80">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" v-if="newCertFile">
          <div class="space-y-2">
            <label class="form-label text-security font-medium block" for="saveName">
              Save As (Optional)
            </label>
            <input
              id="saveName"
              type="text"
              v-model="saveCertName"
              placeholder="Enter a name or leave empty to use original filename"
              class="form-input w-full rounded-md border-security/20 focus:border-security focus:ring focus:ring-security/20"
            />
            <div class="text-xs text-security/70 mt-1">
              Will be saved as: <span class="font-mono">{{ saveCertName || newCertFile?.name }}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="form-label text-security font-medium block" for="certNotes">
              Certificate Notes (Optional)
            </label>
            <textarea
              id="certNotes"
              v-model="certNotes"
              placeholder="Add optional notes about this certificate"
              class="form-textarea w-full rounded-md border-security/20 focus:border-security focus:ring focus:ring-security/20"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div class="pt-4 flex flex-wrap gap-3">
          <button 
            type="submit" 
            class="btn btn-primary px-6 py-2.5 rounded-md flex items-center gap-2 transition-all"
            :disabled="!newCertFile || uploadingCert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            <span v-if="!uploadingCert">Upload Certificate</span>
            <span v-else class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-3 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Uploading...
            </span>
          </button>
        </div>
        
        <div v-if="certUploadError" class="mt-4 p-3 rounded-md bg-energy/10 border border-energy text-energy text-sm flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ certUploadError }}</span>
        </div>
        
        <div v-if="certUploadSuccess" class="mt-4 p-3 rounded-md bg-currency/10 border border-currency text-currency text-sm flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Certificate uploaded successfully</span>
        </div>
      </form>
    </div>    <!-- Certificates List Section -->
    <div class="bg-gradient-to-br from-care/30 to-care/10 p-5 rounded-lg border border-security/15">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-security flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Stored Certificates
        </h3>
        <button @click="fetchCerts"
          class="btn btn-outline-security rounded-md px-4 py-1.5 flex items-center gap-1.5 text-sm hover:bg-security/10 transition-colors"
          :disabled="loadingCerts">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
          <span v-if="loadingCerts" class="ml-1 animate-spin h-3 w-3 border border-security border-t-transparent rounded-full"></span>
        </button>
      </div>
      
      <!-- Empty state with illustration -->
      <div v-if="certs.length === 0" class="text-center p-8 border border-dashed border-security/20 rounded-lg bg-white/60">
        <div class="w-16 h-16 bg-security/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-security/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p class="text-sm text-security/70 font-medium">No certificates found</p>
        <p class="text-xs text-security/50 mt-1 max-w-md mx-auto">
          Upload a certificate using the form above to get started with signing files.
        </p>
      </div>
      
      <!-- Certificate list -->
      <div v-else class="space-y-3 mt-2">
        <div v-for="cert in certs" :key="cert.id || cert.serialNumber" 
             class="bg-white p-4 rounded-lg border border-security/10 shadow-sm hover:shadow-md transition-all duration-200">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded-full bg-security/10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span class="font-medium text-security truncate max-w-xs">{{ cert.subject || cert.name }}</span>
              </div>
              <div class="mt-2 ml-8 space-y-1">
                <div class="text-xs text-security/70">Root CA: <span class="font-mono">{{ cert.issuer || 'Unknown' }}</span></div>
                <div class="text-xs text-security/70">Expires: <span class="font-mono">{{ formatDate(cert.validTo) }}</span></div>
                <div class="text-xs text-security/70" v-if="cert.metadata && cert.metadata.uploadedBy">
                  Uploader: <span class="font-mono">{{ cert.metadata.uploadedBy }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2 sm:flex-shrink-0 ml-8 sm:ml-0">
              <button class="btn btn-outline-security btn-sm px-3 py-1.5 rounded-md flex items-center gap-1.5" @click="viewCertificateInfo(cert.name)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Details
              </button>
              <button class="btn btn-outline-energy btn-sm px-3 py-1.5 rounded-md flex items-center gap-1.5" @click="$emit('remove-certificate', cert.name)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Password Prompt Modal -->
    <div v-if="promptForPassword" class="fixed inset-0 certificate-modal-backdrop flex items-center justify-center z-[3000]">
      <div class="certificate-password-modal">
        <div class="flex justify-between items-center border-b border-security-20 pb-2 mb-4">
          <h3 class="text-lg font-semibold text-security">Certificate Password</h3>
          <button @click="promptForPassword = false" class="text-modernity-70 hover:text-modernity transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <p class="mb-4 text-sm text-modernity-75">Your certificate is protected by a password. Enter it below to view the certificate information.</p>
        
        <div class="space-y-4">
          <div class="relative">
            <label for="certPasswordField" class="text-security-70 text-sm block mb-1.5">Certificate Password</label>
            <input 
              id="certPasswordField"
              v-model="certPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter certificate password"
              @keydown.enter="submitPasswordAndViewInfo"
            />
            <button 
              @click="togglePasswordVisibility"
              type="button"
              class="absolute right-2 top-[calc(50%_+_4px)] transform -translate-y-1/2 text-modernity-50 hover:text-modernity"
            >
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            </button>
          </div>
          
          <div v-if="certInfoError" class="p-3 rounded-md bg-energy-10 border border-energy text-energy text-sm">
            {{ certInfoError }}
          </div>
          
          <div class="flex justify-end gap-2 pt-2">
            <button 
              @click="promptForPassword = false"
              type="button"
            >
              Cancel
            </button>
            <button 
              @click="submitPasswordAndViewInfo"
              class="btn-primary"
              :disabled="loadingCertInfo"
            >
              <span v-if="!loadingCertInfo">Submit</span>
              <span v-else class="flex items-center gap-2">
                <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
                Loading...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Certificate Info Modal -->
    <div v-if="showCertInfoModal" class="fixed inset-0 certificate-modal-backdrop flex items-center justify-center z-[3000]">
      <div class="certificate-info-modal">
        <div class="flex justify-between items-center border-b border-security-20 pb-2 mb-4">
          <h3 class="text-lg font-semibold text-security">Certificate Information</h3>
          <button @click="closeCertInfoModal" class="text-modernity-70 hover:text-modernity transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-white-60 p-3 rounded-md">
            <h4 class="font-medium text-security mb-1">Certificate Name</h4>
            <p class="font-mono">{{ selectedCertName }}</p>
          </div>
          
          <div v-if="!certInfo && !loadingCertInfo">
            <p class="text-sm text-modernity-75 mb-4">Enter the certificate password to view its information</p>
            
            <div class="flex flex-col space-y-4">
              <div class="relative">
                <label for="certInfoPasswordField" class="text-security-70 text-sm block mb-1.5">Certificate Password</label>
                <input 
                  id="certInfoPasswordField"
                  v-model="certPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter certificate password"
                  @keydown.enter="fetchCertificateInfo()"
                />
                <button 
                  @click="togglePasswordVisibility"
                  type="button"
                  class="absolute right-2 top-[calc(50%_+_4px)] transform -translate-y-1/2 text-modernity-50 hover:text-modernity"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                </button>
              </div>
              
              <div v-if="certInfoError" class="p-3 rounded-md bg-energy-10 border border-energy text-energy text-sm">
                {{ certInfoError }}
              </div>
              
              <div class="flex justify-end gap-2 pt-2">
                <button 
                  @click="closeCertInfoModal"
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  @click="fetchCertificateInfo()"
                  class="btn-primary"
                  :disabled="loadingCertInfo"
                >
                  <span v-if="!loadingCertInfo">View Certificate Details</span>
                  <span v-else class="flex items-center gap-2">
                    <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
                    Loading...
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div v-else-if="loadingCertInfo" class="flex items-center justify-center py-8">
            <div class="flex flex-col items-center">
              <div class="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-security"></div>
              <p class="text-security-70 mt-3 text-sm animate-pulse">Loading certificate data...</p>
            </div>
          </div>
          
          <div v-else-if="certInfo" class="space-y-3">
            <!-- Certificate Status Banner -->
            <div v-if="certificateStatus" 
              :class="[
                'p-3 rounded-md font-medium flex items-center gap-2',
                certificateStatus.color === 'green' ? 'bg-currency-10 text-currency border border-currency' : 
                certificateStatus.color === 'red' ? 'bg-energy-10 text-energy border border-energy' : 
                'bg-warning-10 text-warning border border-warning'
              ]"
            >
              <span v-if="certificateStatus.color === 'green'">✓</span>
              <span v-else-if="certificateStatus.color === 'red'">✗</span>
              <span v-else>⚠️</span>
              {{ certificateStatus.message }}
            </div>
            
            <!-- Certificate Type -->
            <div class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Certificate Type</h4>
              <p class="font-mono break-all text-sm">{{ certInfo.type }}</p>
            </div>
            
            <!-- Subject & Issuer info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Subject</h4>
                <p class="font-mono break-all text-sm">{{ certInfo.subject }}</p>
              </div>
              
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Issuer</h4>
                <p class="font-mono break-all text-sm">{{ certInfo.issuer }}</p>
              </div>
            </div>
            
            <!-- Root CA -->
            <div v-if="certInfo.rootCA" class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Root CA</h4>
              <p class="font-mono break-all text-sm">{{ certInfo.rootCA }}</p>
            </div>
            
            <!-- Validity Period -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Valid From</h4>
                <p class="font-mono text-sm">{{ formatDate(certInfo.validFrom) }}</p>
              </div>
              
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Valid To</h4>
                <p class="font-mono text-sm">{{ formatDate(certInfo.validTo) }}</p>
              </div>
            </div>
            
            <!-- Certificate Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Serial Number</h4>
                <p class="font-mono break-all text-sm">{{ certInfo.serialNumber }}</p>
              </div>
              
              <div class="bg-white-60 p-3 rounded-md">
                <h4 class="font-medium text-security mb-1">Fingerprint</h4>
                <p class="font-mono break-all text-sm">{{ certInfo.fingerprint || 'Not available' }}</p>
              </div>
            </div>
            
            <!-- Certificate Usage -->
            <div v-if="certInfo.keyUsage && certInfo.keyUsage.length > 0" class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Key Usage</h4>
              <div class="flex flex-wrap gap-2">
                <span v-for="(usage, idx) in certInfo.keyUsage" :key="idx" 
                  class="inline-block px-2 py-1 bg-security-5 text-security-80 rounded text-xs font-medium">
                  {{ usage }}
                </span>
              </div>
            </div>
            
            <div v-if="certInfo.extendedKeyUsage && certInfo.extendedKeyUsage.length > 0" class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Extended Key Usage</h4>
              <div class="flex flex-wrap gap-2">
                <span v-for="(usage, idx) in certInfo.extendedKeyUsage" :key="idx" 
                  class="inline-block px-2 py-1 bg-security-5 text-security-80 rounded text-xs font-medium">
                  {{ usage }}
                </span>
              </div>
            </div>
            
            <!-- CA Status -->
            <div class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Certificate Authority</h4>
              <p class="font-mono break-all text-sm">
                <span v-if="certInfo.ca" class="text-currency">✓ This is a CA certificate</span>
                <span v-else>✗ Not a CA certificate</span>
              </p>
            </div>
            
            <!-- Metadata info -->
            <div v-if="certInfo.metadata" class="bg-white-60 p-3 rounded-md">
              <h4 class="font-medium text-security mb-1">Metadata</h4>
              <div class="space-y-1 text-sm">
                <p v-if="certInfo.metadata.uploadedBy"><span class="font-medium">Uploaded by:</span> {{ certInfo.metadata.uploadedBy }}</p>
                <p v-if="certInfo.metadata.uploadedAt"><span class="font-medium">Upload date:</span> {{ formatDate(certInfo.metadata.uploadedAt) }}</p>
                <p v-if="certInfo.metadata.notes"><span class="font-medium">Notes:</span> {{ certInfo.metadata.notes }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button @click="closeCertInfoModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.file-upload-container {
  position: relative;
  cursor: pointer;
}

.file-upload-container:hover {
  opacity: 0.9;
}

/* Animation for buttons when active */
.btn:not([disabled]):active {
  transform: scale(0.98);
}

/* Certificate modal styles */
.certificate-modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.certificate-password-modal,
.certificate-info-modal {
  background-color: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.certificate-info-modal {
  max-width: 700px;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Types
interface CertificateStatus {
  color: string;
  message: string;
}

interface CertificateMetadata {
  uploadedBy?: string;
  uploadedAt?: string;
  notes?: string;
}

interface Certificate {
  name: string;
  metadata?: CertificateMetadata;
}

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  ca: boolean;
  type: string;
  rootCA?: string;
  keyUsage?: string[];
  extendedKeyUsage?: string[];
  fingerprint?: string;
  metadata?: CertificateMetadata;
}

// State variables
const newCertFile = ref<File | null>(null);
const saveCertName = ref('');
const certNotes = ref('');
const certUploadError = ref<string | null>(null);
const certUploadSuccess = ref(false);
const uploadingCert = ref(false);
const certs = ref<any[]>([]);
const loadingCerts = ref(false);
const selectedCertName = ref('');
const showCertInfoModal = ref(false);
const promptForPassword = ref(false);
const showPassword = ref(false);
const certPassword = ref('');
const certInfo = ref<CertificateInfo | null>(null);
const certInfoError = ref<string | null>(null);
const loadingCertInfo = ref(false);
const certificateStatus = ref<CertificateStatus | null>(null);

// Get user from global context (Nuxt)
const user = (window as any).$user;

// Lifecycle hooks
onMounted(() => {
  fetchCerts();
});

// Helper functions
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const handleCertFileChange = (event: Event): void => {
  certUploadError.value = null;
  certUploadSuccess.value = false;
  const inputElement = event.target as HTMLInputElement;
  newCertFile.value = inputElement.files?.[0] || null;
  if (newCertFile.value) {
    // Use the file name as default but remove any file extension
    saveCertName.value = newCertFile.value.name.replace(/\.[^/.]+$/, "");
  } else {
    saveCertName.value = '';
    certNotes.value = '';
  }
};

const clearNewCertForm = () => {
  newCertFile.value = null;
  saveCertName.value = '';
  certNotes.value = '';
  certUploadError.value = null;
  certUploadSuccess.value = false;
};

const uploadCertificate = async (): Promise<void> => {
  if (!newCertFile.value) return;
  
  uploadingCert.value = true;
  certUploadError.value = null;
  certUploadSuccess.value = false;
  
  try {
    const formData = new FormData();
    formData.append('certificate', newCertFile.value);
    
    // Add metadata
    const metadata = {
      uploadedBy: user?.email || 'Local Admin',
      uploadedAt: new Date().toISOString(),
      notes: certNotes.value || ''
    };
    
    // Use the custom name if provided, otherwise use the file name
    const certificateName = saveCertName.value || newCertFile.value.name;
    formData.append('saveName', certificateName);
    formData.append('username', metadata.uploadedBy);
    formData.append('notes', metadata.notes || '');
    
    const response = await fetch('/api/certs', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error uploading certificate: ${response.status}`);
    }
    
    const data = await response.json();
    certUploadSuccess.value = true;
    
    // After successful upload, check if we need to get certificate info
    // If it's a PFX file, prompt for password to view cert info
    if (data.fileName && data.fileName.toLowerCase().endsWith('.pfx')) {
      selectedCertName.value = data.fileName;
      promptForPassword.value = true;
    } else if (data.fileName) {
      // For PEM files we can try to get info directly
      selectedCertName.value = data.fileName;
      await fetchCertificateInfo(''); // Empty password for PEM files
      showCertInfoModal.value = true;
    }
    
    clearNewCertForm();
    await fetchCerts();
  } catch (error: any) {
    certUploadError.value = error.message || 'Failed to upload certificate';
  } finally {
    uploadingCert.value = false;
  }
};

const fetchCerts = async () => {
  loadingCerts.value = true;
  try {
    const response = await fetch('/api/certs');
    if (!response.ok) {
      throw new Error(`Error fetching certificates: ${response.status}`);
    }
    const data = await response.json();
    certs.value = data.certificates || [];
  } catch (error) {
    console.error('Error fetching certificates:', error);
  } finally {
    loadingCerts.value = false;
  }
};

const deleteCert = async (certName: string): Promise<void> => {
  if (!confirm(`Are you sure you want to delete the certificate "${certName}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/certs?name=${encodeURIComponent(certName)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting certificate: ${response.status}`);
    }
    
    await fetchCerts();
  } catch (error: any) {
    console.error('Error deleting certificate:', error);
    alert(`Failed to delete certificate: ${error.message}`);
  }
};

const viewCertificateInfo = (certName: string): void => {
  selectedCertName.value = certName;
  certPassword.value = '';
  certInfo.value = null;
  certInfoError.value = null;
  certificateStatus.value = null;
  
  // Check if it's a PFX file that needs a password
  if (certName.toLowerCase().endsWith('.pfx')) {
    // Show the cert info modal with password field
    showCertInfoModal.value = true;
  } else {
    // For PEM files, we can try to fetch info directly
    showCertInfoModal.value = true;
    fetchCertificateInfo(''); // Empty password for PEM files
  }
};

const closeCertInfoModal = () => {
  showCertInfoModal.value = false;
  certInfo.value = null;
  certInfoError.value = null;
  certPassword.value = '';
  certificateStatus.value = null;
  showPassword.value = false;
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const submitPasswordAndViewInfo = () => {
  // Close password prompt and open cert info modal
  promptForPassword.value = false;
  showCertInfoModal.value = true;
  
  // Fetch certificate info with the provided password
  fetchCertificateInfo();
};

const fetchCertificateInfo = async (passwordOverride?: string): Promise<void> => {
  // Allow passing a password directly (used when certificate is not password-protected)
  const password = passwordOverride !== undefined ? passwordOverride : certPassword.value;
  
  if (!selectedCertName.value) {
    certInfoError.value = 'No certificate selected';
    return;
  }
  
  // Only require password for PFX files
  const isPfx = selectedCertName.value.toLowerCase().endsWith('.pfx');
  if (isPfx && !password) {
    certInfoError.value = 'Please enter the certificate password';
    return;
  }
  
  loadingCertInfo.value = true;
  certInfoError.value = null;
  certificateStatus.value = null;
  
  try {
    const response = await fetch('/api/certinfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certName: selectedCertName.value,
        password: password
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get certificate info');
    }
    
    const data = await response.json();
    
    // If there's an error in the response
    if (data.error) {
      throw new Error(data.error);
    }
    
    certInfo.value = data;
    
    // Check certificate validity and set status
    checkCertificateValidity();
  } catch (error: any) {
    certInfoError.value = error.message || 'Failed to get certificate info';
    certInfo.value = null;
  } finally {
    loadingCertInfo.value = false;
  }
};

const checkCertificateValidity = (): void => {
  if (!certInfo.value || !certInfo.value.validTo) {
    return;
  }
  
  // Check if certificate is expired or about to expire
  const now = new Date();
  const expiryDate = new Date(certInfo.value.validTo);
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (now > expiryDate) {
    certificateStatus.value = {
      color: 'red',
      message: 'Certificate has expired!'
    };
  } else if (daysRemaining <= 30) {
    certificateStatus.value = {
      color: 'yellow',
      message: `Certificate will expire in ${daysRemaining} days`
    };
  } else {
    certificateStatus.value = {
      color: 'green',
      message: `Certificate is valid (expires in ${daysRemaining} days)`
    };
  }
};
</script>
