<template>
  <div class="p-2.5 rounded-md border border-security-20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-2.5 text-security border-b border-security-30 pb-1.5">Certificate Management</h2>
    
    <!-- Certificate Upload Section -->
    <div class="mb-4">
      <h3 class="text-lg font-medium text-security mb-1.5">Upload New Certificate</h3>
      
      <form @submit.prevent="uploadCertificate" class="space-y-2.5">
        <div class="space-y-1.5">
          <label class="form-label text-security font-medium block" for="newCertFile">
            Upload Certificate (.pfx, .pem)
          </label>
          <div class="relative">
            <input
              id="newCertFile"
              type="file"
              accept=".pfx,.pem"
              @change="handleCertFileChange"
              class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 input-file"
            />
            <button
              type="button"
              class="btn btn-primary w-full md:w-auto text-left"
              tabindex="-1"
            >
              Select Certificate File
            </button>
          </div>
          <div v-if="newCertFile" class="text-xs text-security-70 mt-0.5 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 bg-currency rounded-full"></span>
            Certificate selected: {{ newCertFile?.name || '' }}
          </div>
        </div>
        
        <div class="space-y-1.5" v-if="newCertFile">
          <label class="form-label text-security font-medium block" for="saveName">
            Save As (Optional)
          </label>
          <input
            id="saveName"
            type="text"
            v-model="saveCertName"
            placeholder="Enter a name or leave empty to use original filename"
            class="form-input w-full md:w-1/2"
          />
          <div class="text-xs text-security-70">
            Will be saved as: <span class="font-mono">{{ saveCertName || newCertFile?.name }}</span>
          </div>
        </div>
        
        <div class="space-y-1.5" v-if="newCertFile">
          <label class="form-label text-security font-medium block" for="certNotes">
            Certificate Notes (Optional)
          </label>
          <textarea
            id="certNotes"
            v-model="certNotes"
            placeholder="Add optional notes about this certificate"
            class="form-textarea w-full md:w-1/2 h-16"
          ></textarea>
        </div>
        
        <div class="pt-1.5 flex flex-wrap gap-1.5">
          <button 
            type="submit" 
            class="btn-primary"
            :disabled="!newCertFile || uploadingCert"
          >
            <span v-if="!uploadingCert">Upload Certificate</span>
            <span v-else class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-3 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Uploading...
            </span>
          </button>
          <button 
            type="button" 
            @click="clearNewCertForm" 
            v-if="newCertFile"
          >
            Clear
          </button>
        </div>
        
        <div v-if="certUploadError" class="p-2 rounded-md bg-energy-10 border border-energy text-energy text-xs">
          ❌ {{ certUploadError }}
        </div>
        <div v-if="certUploadSuccess" class="p-2 rounded-md bg-currency-10 border border-currency text-currency text-xs">
          ✅ Certificate uploaded successfully
        </div>
      </form>
    </div>
    
    <!-- Certificates List Section -->
    <div>
      <div class="flex items-center justify-between mb-2.5">
        <h3 class="text-lg font-medium text-security">Stored Certificates</h3>
        <button @click="fetchCerts"
          class="btn-secondary"
          :disabled="loadingCerts">
          Refresh
        </button>
      </div>
      <div v-if="certs.length === 0" class="text-xs text-modernity-60 p-2 border border-dashed border-security-20 rounded-md bg-care/50">
        No certificates found. Upload a certificate to get started.
      </div>
      <div v-else class="space-y-2">
        <div v-for="cert in certs" :key="cert.id || cert.serialNumber" class="flex items-center justify-between p-2 rounded-md border border-security-10 bg-white/60">
          <div>
            <div class="font-mono text-xs text-security">{{ cert.subject || cert.name }}</div>
            <div class="text-[0.7rem] text-modernity-60">Root CA: <span class="font-mono">{{ cert.issuer || 'Unknown' }}</span></div>
            <div class="text-[0.7rem] text-modernity-60">Expires: <span class="font-mono">{{ formatDate(cert.validTo) }}</span></div>
            <div class="text-[0.7rem] text-modernity-60" v-if="cert.metadata && cert.metadata.uploadedBy">Uploader: <span class="font-mono">{{ cert.metadata.uploadedBy }}</span></div>
          </div>
          <div class="flex gap-1">
            <button class="btn-secondary btn-sm" @click="viewCertificateInfo(cert.name)">Details</button>
            <button class="btn-danger btn-sm" @click="$emit('remove-certificate', cert.name)">Remove</button>
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
</template>

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
