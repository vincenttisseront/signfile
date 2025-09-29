<template>
  <div class="max-w-3xl mx-auto">
    <div class="p-6 rounded-xl border border-security/20 bg-white shadow-sm" isAuthenticated="true" data-cert-management="">
      <h2 class="text-xl font-semibold mb-4 text-security flex items-center gap-2 border-b border-security/30 pb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Certificate Management
      </h2>

      <!-- Upload Certificate Section -->
      <div class="mb-8 bg-gradient-to-br from-security/5 to-security/10 p-5 rounded-lg border border-security/15">
        <h3 class="text-lg font-medium text-security mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload New Certificate
        </h3>

        <form class="space-y-4">
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
                class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 input-file" 
              />
              
              <!-- Visible styled button -->
              <div class="relative border-2 border-dashed border-security/30 rounded-lg p-4 hover:border-security/60 transition-colors duration-200 bg-white/50">
                <div class="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-8 w-8 text-security/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p class="mt-2 text-sm text-security/80">
                    Drag and drop a certificate file here or
                    <span class="text-security font-medium underline">browse</span>
                  </p>
                  <p class="mt-1 text-xs text-security/60">Supported formats: .pfx, .pem</p>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex flex-wrap gap-2">
            <button 
              type="submit" 
              class="btn btn-primary px-6 py-2.5 rounded-md flex items-center gap-2 transition-all"
              disabled
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
              </svg>
              <span>Upload Certificate</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Stored Certificates Section -->
      <div class="bg-gradient-to-br from-care/30 to-care/10 p-5 rounded-lg border border-security/15">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-security flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Stored Certificates
          </h3>
          <button class="btn btn-outline-security rounded-md px-4 py-1.5 flex items-center gap-1.5 text-sm hover:bg-security/10 transition-colors"> 
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        <!-- Empty state with illustration -->
        <div class="text-center p-8 border border-dashed border-security/20 rounded-lg bg-white/60">
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

/* Animation for the upload button when active */
.btn-primary:not([disabled]):active {
  transform: scale(0.98);
}

/* Disabled state styling */
.btn-primary[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>