// Script pour installer et configurer jsign correctement
// Ce script installe jsign et assure qu'il est configuré correctement pour signer les scripts PowerShell

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Définir les paramètres
const JSIGN_VERSION = '4.2';
const JSIGN_URL = `https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar`;
const INSTALL_DIR = '/usr/local/jsign';
const JSIGN_JAR = path.join(INSTALL_DIR, 'jsign.jar');
const JSIGN_SCRIPT = '/usr/local/bin/jsign';

// Fonction pour créer un wrapper script pour jsign
function createJsignWrapper() {
  const script = `#!/bin/bash
# Wrapper script for jsign
# Created by SignFile setup script

# Ensure proper parameters for PowerShell scripts
if [[ "$*" == *".ps1"* ]] && [[ "$*" != *"--detached"* ]]; then
  # When signing PS1 files, always add these parameters unless explicitly overridden
  ARGS=()
  DETACHED_SET=false
  REPLACE_SET=false
  
  # Parse arguments to see if detached or replace is already set
  for ARG in "$@"; do
    if [[ "$ARG" == "--detached"* ]]; then
      DETACHED_SET=true
    fi
    if [[ "$ARG" == "--replace"* ]]; then
      REPLACE_SET=true
    fi
    ARGS+=("$ARG")
  done
  
  # Add --detached false if not explicitly set
  if [ "$DETACHED_SET" = false ]; then
    ARGS+=("--detached" "false")
  fi
  
  # Add --replace if not explicitly set
  if [ "$REPLACE_SET" = false ]; then
    ARGS+=("--replace")
  fi
  
  echo "Executing jsign with Authenticode optimizations for PowerShell:"
  echo "java -jar ${JSIGN_JAR} \${ARGS[@]}"
  exec java -jar ${JSIGN_JAR} "\${ARGS[@]}"
else
  # For other file types, pass arguments directly
  exec java -jar ${JSIGN_JAR} "$@"
fi
`;

  try {
    fs.writeFileSync(JSIGN_SCRIPT, script, { mode: 0o755 });
    console.log(`Created jsign wrapper script at ${JSIGN_SCRIPT}`);
  } catch (err) {
    console.error(`Error creating jsign wrapper script: ${err.message}`);
    process.exit(1);
  }
}

// Fonction principale
async function main() {
  console.log('=== SignFile jsign Setup ===');
  
  // Vérifier si on est sur macOS ou Linux
  if (os.platform() !== 'darwin' && os.platform() !== 'linux') {
    console.error('This script is designed for macOS or Linux only.');
    process.exit(1);
  }
  
  // Vérifier les prérequis
  try {
    const javaVersion = execSync('java -version 2>&1').toString();
    console.log(`Java detected: ${javaVersion.split('\n')[0]}`);
  } catch (err) {
    console.error('Java is not installed. Please install Java before continuing.');
    process.exit(1);
  }
  
  // Créer le répertoire d'installation si nécessaire
  try {
    if (!fs.existsSync(INSTALL_DIR)) {
      fs.mkdirSync(INSTALL_DIR, { recursive: true });
      console.log(`Created installation directory: ${INSTALL_DIR}`);
    }
  } catch (err) {
    console.error(`Error creating installation directory: ${err.message}`);
    process.exit(1);
  }
  
  // Télécharger jsign
  console.log(`Downloading jsign ${JSIGN_VERSION}...`);
  try {
    execSync(`curl -L -o ${JSIGN_JAR} ${JSIGN_URL}`);
    console.log(`Downloaded jsign to ${JSIGN_JAR}`);
  } catch (err) {
    console.error(`Error downloading jsign: ${err.message}`);
    process.exit(1);
  }
  
  // Créer le wrapper script
  console.log('Creating jsign wrapper script...');
  createJsignWrapper();
  
  // Rendre le script exécutable
  try {
    fs.chmodSync(JSIGN_SCRIPT, 0o755);
    console.log(`Made jsign wrapper script executable`);
  } catch (err) {
    console.error(`Error setting permissions: ${err.message}`);
    process.exit(1);
  }
  
  // Tester jsign
  console.log('Testing jsign installation...');
  try {
    const output = execSync(`${JSIGN_SCRIPT} --version`).toString();
    console.log(`jsign test successful: ${output.trim()}`);
  } catch (err) {
    console.error(`Error testing jsign: ${err.message}`);
    process.exit(1);
  }
  
  console.log('\n=== Installation Complete ===');
  console.log(`jsign has been installed to ${JSIGN_JAR}`);
  console.log(`jsign wrapper script has been created at ${JSIGN_SCRIPT}`);
  console.log('\nUsage:');
  console.log('  jsign --storetype PKCS12 --keystore certificate.pfx --storepass password file.ps1');
  console.log('\nFor PowerShell scripts, the wrapper automatically adds:');
  console.log('  --detached false --replace');
  console.log('\nThese parameters ensure proper Authenticode signatures that will be recognized by Windows.');
}

// Exécuter la fonction principale
main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});