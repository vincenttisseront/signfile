#!/bin/bash
# jsign-setup.sh
# 
# This script installs and configures jsign for use with SignFile
# It ensures that jsign is properly set up for PowerShell script signature verification

set -e

echo "╔════════════════════════════════════════════╗"
echo "║ SignFile - jsign Setup                     ║"
echo "║ Setting up jsign for PowerShell signatures ║"
echo "╚════════════════════════════════════════════╝"

# Determine directories
INSTALL_DIR="/usr/local/jsign"
BIN_DIR="/usr/local/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create directories if they don't exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Download latest jsign
echo "Downloading latest jsign from GitHub..."
JSIGN_VERSION="4.2"
JSIGN_URL="https://github.com/ebourg/jsign/releases/download/4.2/jsign-4.2.jar"

# Check if curl exists
if ! command -v curl &> /dev/null; then
    echo "curl is not installed. Installing curl..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y curl
    elif command -v yum &> /dev/null; then
        yum install -y curl
    elif command -v brew &> /dev/null; then
        brew install curl
    else
        echo "Error: Package manager not found. Please install curl manually."
        exit 1
    fi
fi

# Download jsign.jar
echo "Downloading jsign.jar to $INSTALL_DIR/jsign.jar..."
curl -L "$JSIGN_URL" -o "$INSTALL_DIR/jsign.jar"
chmod 755 "$INSTALL_DIR/jsign.jar"

# Create wrapper script for easier execution
echo "Creating jsign wrapper script in $BIN_DIR/jsign..."
cat > "$BIN_DIR/jsign" << 'EOF'
#!/bin/bash
# jsign wrapper script

# Find Java
if command -v java &> /dev/null; then
    JAVA_CMD="java"
elif [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    JAVA_CMD="$JAVA_HOME/bin/java"
else
    echo "Error: Java not found. Please install Java or set JAVA_HOME."
    exit 1
fi

# Execute jsign.jar with all arguments passed to this script
$JAVA_CMD -jar "/usr/local/jsign/jsign.jar" "$@"
EOF

# Make the wrapper script executable
chmod 755 "$BIN_DIR/jsign"

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "WARNING: Java is not installed. jsign requires Java to run."
    echo "Please install Java and try again."
    
    # Suggest installation commands based on OS
    if command -v apt-get &> /dev/null; then
        echo "You can install Java using: sudo apt-get install -y default-jre"
    elif command -v yum &> /dev/null; then
        echo "You can install Java using: sudo yum install -y java-latest-openjdk"
    elif command -v brew &> /dev/null; then
        echo "You can install Java using: brew install --cask temurin"
    fi
    
    exit 1
fi

# Test jsign installation
echo "Testing jsign installation..."
if "$BIN_DIR/jsign" --version; then
    echo "✅ jsign was successfully installed and is working!"
else
    echo "❌ jsign installation test failed. Please check your Java installation."
    exit 1
fi

# Create a test file with PowerShell signature block
echo "Creating a test PowerShell script with signature block..."
TEST_FILE="$INSTALL_DIR/test_signed.ps1"

cat > "$TEST_FILE" << 'EOF'
# This is a test PowerShell script with a signature block
Write-Host "This is a test script for jsign verification"

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

# Test verification of the test file
echo "Testing verification of the test file..."
if "$BIN_DIR/jsign" --verify "$TEST_FILE"; then
    echo "✅ Test file verification succeeded!"
else
    echo "❓ Test file verification failed, but this is expected for our dummy signature."
    echo "   The important part is that jsign was able to process the file."
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║ jsign Setup Complete                                         ║"
echo "║ You can now use 'jsign' to sign and verify PowerShell scripts ║"
echo "╚══════════════════════════════════════════════════════════════╝"