<template>
  <div class="mt-4">
    <h3 class="mb-2 text-lg font-semibold">Alternative Download Method</h3>
    <p class="mb-3 text-sm text-security-70">
      If the normal file download doesn't work, use this alternative method.
    </p>
    <button 
      @click="triggerDirectDownload" 
      class="btn btn-outline-primary"
      :disabled="!fileInput || !fileInput.files || fileInput.files.length === 0"
    >
      Download Signed File (Direct Method)
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { createDirectDownloadForm } from '../utils/file-download';

const props = defineProps({
  fileInputId: {
    type: String,
    default: 'scriptFile'
  },
  certName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const fileInput = ref(null);

function triggerDirectDownload() {
  // Create a form in a hidden iframe and submit it
  const iframe = document.createElement('iframe');
  iframe.name = 'download_frame';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Create a form that will be submitted to the iframe
  const form = document.createElement('form');
  form.action = '/api/sign';
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.target = 'download_frame';
  form.style.display = 'none';
  document.body.appendChild(form);
  
  // Add certificate and password fields
  const certInput = document.createElement('input');
  certInput.type = 'hidden';
  certInput.name = 'storedCert';
  certInput.value = props.certName;
  form.appendChild(certInput);
  
  const passwordInput = document.createElement('input');
  passwordInput.type = 'hidden';
  passwordInput.name = 'password';
  passwordInput.value = props.password;
  form.appendChild(passwordInput);
  
  // Clone the file input if it exists
  if (fileInput.value && fileInput.value.files && fileInput.value.files.length > 0) {
    const fileClone = document.createElement('input');
    fileClone.type = 'file';
    fileClone.name = 'script';
    fileClone.style.display = 'none';
    
    // Create a new FileList with the selected file
    try {
      const dt = new DataTransfer();
      dt.items.add(fileInput.value.files[0]);
      fileClone.files = dt.files;
      form.appendChild(fileClone);
    } catch (err) {
      console.error('Could not clone file:', err);
      
      // Alternative approach: create a FormData and append all data from there
      const formData = new FormData();
      formData.append('script', fileInput.value.files[0]);
      formData.append('storedCert', props.certName);
      formData.append('password', props.password);
      
      // Open in a new window/tab instead
      form.target = '_blank';
    }
  }
  
  // Submit the form
  form.submit();
  console.log('Form submitted for direct download');
  
  // Clean up after a delay
  setTimeout(() => {
    document.body.removeChild(form);
    document.body.removeChild(iframe);
  }, 5000);
}

onMounted(() => {
  // Get a reference to the file input element
  fileInput.value = document.getElementById(props.fileInputId);
});
</script>