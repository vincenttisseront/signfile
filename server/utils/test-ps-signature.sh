#!/bin/bash
# test-ps-signature.sh
#
# This script tests PowerShell signature verification using our enhanced verifier

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔════════════════════════════════════════════╗"
echo "║ PowerShell Signature Verification Test     ║"
echo "╚════════════════════════════════════════════╝"

# Create a temporary directory for test files
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create a test script with a valid PowerShell signature block format
TEST_SCRIPT="$TEMP_DIR/test_script.ps1"

echo "Creating test PowerShell script with signature block..."
cat > "$TEST_SCRIPT" << 'EOF'
# Test PowerShell script with a signature block
Write-Host "Hello, this is a test script"

# SIG # Begin signature block
MIIFuAYJKoZIhvcNAQcCoIIFqTCCBaUCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUfTSy4BQgYDpwsvi+NLKonbXY
1bygggNOMIIDSjCCAjKgAwIBAgIQRK+wgNajJ7qJMDmGLvhAazANBgkqhkiG9w0B
AQUFADA/MSQwIgYDVQQKExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAV
BgNVBAMTDkRTVCBSb290IENBIFgzMB4XDTAwMDkzMDIxMTIxOVoXDTIxMDkzMDE0
MDExNVowPzEkMCIGA1UEChMbRGlnaXRhbCBTaWduYXR1cmUgVHJ1c3QgQ28uMRcw
FQYDVQQDFA5EU1QgUm9vdCBDQSBYMzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAN+v6ZdQCINXtMxiZfaQguzH0yxrMMpb7NnDfcdAwRgUi+DoM3ZJKuM/
IUmTrE4Orz5Iy2Xu/NMhD2XSKtkyj4zl93ewEnu1lcCJo6m67XMuegwGMoOifooU
MzE+RqKNLm9E9R9oIv/m9g3K9NAE8xeO7MsavO0t4rUMXA+KeL4ENBiPGMxKQA0H
U6/2z1T9Jm6u5zE42Lm6uhA/4oj++9P3hA7Zs9BJ6rQdQsrZ/XZXE5A1jGPEr5B9
HQoAQWqLRVFH6liZzJJnZLAcW0jXacVDZ0Z1CQX8tfM5kEYYoXgXANdAYYXeIaWw
CUMKtaSIWMrwUYmYKDfDTR+I2In8=
# SIG # End signature block
EOF

echo "Created test script: $TEST_SCRIPT"

# Create a test script with no signature
NO_SIG_SCRIPT="$TEMP_DIR/no_signature.ps1"
echo 'Write-Host "This script has no signature"' > "$NO_SIG_SCRIPT"

# Create a CMD script with signature block
CMD_SCRIPT="$TEMP_DIR/test_script.cmd"
cat > "$CMD_SCRIPT" << 'EOF'
@echo off
echo This is a test CMD script

:: SIG # Begin signature block
:: Subject: CN=Test Subject
:: Issuer: SignFile OpenSSL Fallback
:: Signed on: 2023-01-01T00:00:00.000Z
:: Signed by: SignFile
:: 
:: WARNING: This is not a true Authenticode signature but a compatible format
:: that should prevent Windows Defender from showing "Not Signed" warnings.
:: 
:: SHA256 Signature:
:: MIIFuAYJKoZIhvcNAQcCoIIFqTCCBaUCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
:: gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
:: AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUfTSy4BQgYDpwsvi+NLKonbXY
:: 1bygggNOMIIDSjCCAjKgAwIBAgIQRK+wgNajJ7qJMDmGLvhAazANBgkqhkiG9w0B
:: AQUFADA/MSQwIgYDVQQKExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAV
:: BgNVBAMTDkRTVCBSb290IENBIFgzMB4XDTAwMDkzMDIxMTIxOVoXDTIxMDkzMDE0
:: SIG # End signature block
EOF

# Run the PowerShell signature verifier on the test files
echo -e "\nTesting PowerShell signature verification with our enhanced verifier..."

# Create a simple Node.js test script
TEST_JS="$TEMP_DIR/test.js"
cat > "$TEST_JS" << 'EOF'
const PSSignatureVerifier = require('../server/utils/ps-signature-verifier');
const path = require('path');
const fs = require('fs');

async function testVerifier() {
  console.log('Testing PowerShell signature verification...');
  
  const files = [
    { path: process.argv[2], name: 'Test PS1 with signature' },
    { path: process.argv[3], name: 'PS1 with no signature' },
    { path: process.argv[4], name: 'CMD script with signature' }
  ];
  
  for (const file of files) {
    console.log(`\n=== Verifying: ${file.name} ===`);
    console.log(`File: ${file.path}`);
    
    try {
      const result = await PSSignatureVerifier.verify(file.path);
      
      console.log(`Valid: ${result.valid ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Message: ${result.message}`);
      
      if (result.details) {
        if (result.details.jsignResult) {
          console.log(`jsign result: ${result.details.jsignResult.valid ? 'Valid' : 'Invalid'}`);
        }
        
        if (result.details.structureResult) {
          console.log(`Structure check: ${result.details.structureResult.valid ? 'Valid' : 'Invalid'}`);
          if (result.details.structureResult.components) {
            console.log('Structure components:');
            const components = result.details.structureResult.components;
            Object.keys(components).forEach(key => {
              console.log(`  - ${key}: ${components[key] ? 'YES' : 'NO'}`);
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error verifying ${file.name}:`, error);
    }
  }
}

testVerifier().catch(console.error);
EOF

# Run the test script
echo -e "\nRunning test script..."
if command -v node &> /dev/null; then
  node "$TEST_JS" "$TEST_SCRIPT" "$NO_SIG_SCRIPT" "$CMD_SCRIPT"
else
  echo "Node.js is not installed. Please install Node.js to run the test script."
  exit 1
fi

# Clean up
echo -e "\nCleaning up..."
rm -rf "$TEMP_DIR"

echo -e "\n╔════════════════════════════════════════════╗"
echo "║ Test Complete                               ║"
echo "╚════════════════════════════════════════════╝"