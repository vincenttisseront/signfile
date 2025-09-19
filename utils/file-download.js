// This is a small helper module to fix file downloading issues
// in the SignFile application

// Create a function to download files using multiple browser-compatible approaches
export function downloadFile(blob, filename) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading file: ${filename} (${blob.size} bytes, ${blob.type})`);
    
    // Create an object URL from the blob
    const url = URL.createObjectURL(blob);
    
    // Method 1: Traditional anchor approach
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      resolve(true);
    } catch (err) {
      console.error('Traditional download failed:', err);
      
      // Method 2: Try iframe approach
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Write content to iframe
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body><a id="download" download="' + filename + 
                  '" href="' + url + '">Download</a></body></html>');
        doc.close();
        
        const downloadLink = doc.getElementById('download');
        downloadLink.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 100);
        
        resolve(true);
      } catch (iframeErr) {
        console.error('Iframe download failed:', iframeErr);
        reject(iframeErr);
      }
    }
    
    // Always clean up the URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30000);
  });
}

// Create a function to handle form submission with file download response
export function submitFormWithDownload(url, formData, filename) {
  return new Promise((resolve, reject) => {
    // Create a hidden iframe to handle the download
    const iframe = document.createElement('iframe');
    iframe.name = 'download_iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Create a form that targets the iframe
    const form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    form.target = 'download_iframe';
    form.style.display = 'none';
    document.body.appendChild(form);
    
    // Add form data fields
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // For files, we need to clone the file input
        const input = document.createElement('input');
        input.type = 'file';
        input.name = key;
        
        // Create a DataTransfer to set the file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(value);
        input.files = dataTransfer.files;
        
        form.appendChild(input);
      } else {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
    }
    
    // Set up a timeout for the download
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Download timeout after 30 seconds'));
    }, 30000);
    
    // Set up iframe load handler
    iframe.onload = () => {
      clearTimeout(timeoutId);
      console.log('Iframe loaded - download should have started');
      
      // Clean up
      setTimeout(() => {
        cleanup();
        resolve(true);
      }, 1000);
    };
    
    // Function to clean up elements
    function cleanup() {
      document.body.removeChild(form);
      document.body.removeChild(iframe);
    }
    
    // Submit the form
    form.submit();
    console.log('Form submitted to iframe for download');
  });
}

// Function to directly create a form with proper download handling
export function createDirectDownloadForm(targetElement, url, fileInputId, certName, password) {
  // Create a form with the target="_blank" attribute to open in a new tab/window
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.target = '_blank'; // Open in new tab
  form.style.display = 'none';
  
  // Add the file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = 'script';
  fileInput.id = 'direct-file-input';
  fileInput.style.display = 'none';
  
  // Add certificate name
  const certInput = document.createElement('input');
  certInput.type = 'hidden';
  certInput.name = 'storedCert';
  certInput.value = certName;
  
  // Add password input
  const passwordInput = document.createElement('input');
  passwordInput.type = 'hidden';
  passwordInput.name = 'password';
  passwordInput.value = password;
  
  // Add submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = 'Download Signed File';
  submitButton.className = 'btn btn-primary btn-md mt-2';
  
  // Append elements to form
  form.appendChild(fileInput);
  form.appendChild(certInput);
  form.appendChild(passwordInput);
  
  // Create a container div
  const container = document.createElement('div');
  container.className = 'mt-4 direct-download-container';
  container.appendChild(form);
  
  // Add a visible button that will copy the file from the main input and trigger the form
  const triggerButton = document.createElement('button');
  triggerButton.type = 'button';
  triggerButton.textContent = 'Download Signed File (Alternative Method)';
  triggerButton.className = 'btn btn-outline-primary btn-md';
  
  triggerButton.onclick = () => {
    // Get the file from the main file input
    const mainFileInput = document.getElementById(fileInputId);
    if (mainFileInput && mainFileInput.files && mainFileInput.files.length > 0) {
      // Create a new FileList with the selected file
      const dt = new DataTransfer();
      dt.items.add(mainFileInput.files[0]);
      fileInput.files = dt.files;
      
      // Submit the form
      form.submit();
    } else {
      alert('Please select a file first');
    }
  };
  
  container.appendChild(triggerButton);
  
  // Append to target element
  targetElement.appendChild(container);
  
  return {
    form,
    triggerButton,
    updateCert: (newCertName) => {
      certInput.value = newCertName;
    },
    updatePassword: (newPassword) => {
      passwordInput.value = newPassword;
    }
  };
}