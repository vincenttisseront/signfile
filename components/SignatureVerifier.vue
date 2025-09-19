<template>
  <div class="mt-2 mb-4">
    <div class="bg-care p-4 rounded-lg border border-security/20 shadow-sm">
      <h2 class="text-lg font-semibold text-security mb-3 border-b border-security/20 pb-1">
        PowerShell Signature Verification
      </h2>
      
      <div class="space-y-4">
        <div>
          <label class="block mb-1 font-medium text-security" for="verifyScriptFile">
            Select a PowerShell script (.ps1) to verify
          </label>
          <input
            id="verifyScriptFile"
            type="file"
            accept=".ps1"
            @change="handleFileSelect"
            class="form-input input-file"
          />
        </div>
        
        <div class="text-xs text-modernity mb-2">
          <span>Or use an example: </span>
          <a 
            v-for="example in examples" 
            :key="example.path"
            :href="example.path" 
            @click.prevent="loadExample(example.path)"
            class="inline-block ml-2 text-security underline"
          >
            {{ example.name }}
          </a>
        </div>
        
        <button
          type="button"
          @click="verifySignature"
          :disabled="!selectedFile || loading"
          class="btn btn-primary btn-md relative"
        >
          <span :class="{'opacity-0': loading}" class="transition-opacity">Verify Signature</span>
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-care border-t-transparent"></div>
              <span>Verifying...</span>
            </div>
          </div>
        </button>
        
        <div v-if="result" class="p-4 rounded-lg border mt-4"
          :class="result.valid ? 'border-currency bg-currency/5' : 'border-energy bg-energy/5'">
          <h3 class="text-lg font-semibold mb-2"
            :class="result.valid ? 'text-currency' : 'text-energy'">
            {{ result.valid ? 'Valid signature' : 'Invalid signature' }}
          </h3>
          
          <div class="text-sm text-modernity space-y-2">
            <p>{{ result.message }}</p>
            
            <div v-if="result.file" class="border-t border-security/10 pt-2 mt-2">
              <p><strong>File:</strong> {{ result.file.name }}</p>
              <p><strong>Size:</strong> {{ formatSize(result.file.size) }}</p>
              <p><strong>Type:</strong> {{ result.file.type }}</p>
            </div>
            
            <div v-if="result.details?.signatureBlock" class="mt-3">
              <details>
                <summary class="cursor-pointer text-security font-medium">Show signature block</summary>
                <pre class="mt-2 p-2 bg-security/5 rounded text-xs overflow-auto max-h-40">{{ result.details.signatureBlock }}</pre>
              </details>
            </div>
          </div>
        </div>
        
        <div v-if="error" class="text-energy text-sm p-2 bg-energy/10 rounded-lg">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const selectedFile = ref(null);
const loading = ref(false);
const result = ref(null);
const error = ref('');
const examples = ref([]);

onMounted(async () => {
  try {
    const examplesModule = await import('/examples/index.js');
    examples.value = examplesModule.examples || [];
  } catch (err) {
    console.error('Failed to load examples:', err);
  }
});

async function loadExample(path) {
  try {
    loading.value = true;
    error.value = '';
    result.value = null;
    
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load example: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const fileName = path.split('/').pop();
    
    // Create a File object from the blob
    selectedFile.value = new File([blob], fileName, { type: 'application/octet-stream' });
    
    // Automatically verify after loading
    await verifySignature();
  } catch (err) {
    error.value = `Error loading example: ${err.message}`;
    loading.value = false;
  }
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) {
    if (file.name.toLowerCase().endsWith('.ps1')) {
      selectedFile.value = file;
      error.value = '';
    } else {
      error.value = 'Please select a PowerShell (.ps1) file';
      selectedFile.value = null;
    }
  } else {
    selectedFile.value = null;
  }
}

async function verifySignature() {
  if (!selectedFile.value) {
    error.value = 'Please select a file to verify';
    return;
  }
  
  loading.value = true;
  result.value = null;
  error.value = '';
  
  try {
    const formData = new FormData();
    formData.append('script', selectedFile.value);
    
    const response = await fetch('/api/verify-signature', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      result.value = await response.json();
    } else {
      const errorText = await response.text();
      error.value = `Error verifying: ${response.status} ${response.statusText}. ${errorText}`;
    }
  } catch (err) {
    error.value = `Error verifying: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>