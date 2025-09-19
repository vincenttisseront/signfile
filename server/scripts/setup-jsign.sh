#!/bin/bash
# Script d'installation pour jsign avec optimisations pour PowerShell

# Définir les paramètres
JSIGN_VERSION="4.2"
JSIGN_URL="https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar"
INSTALL_DIR="/usr/local/jsign"
JSIGN_JAR="${INSTALL_DIR}/jsign.jar"
JSIGN_SCRIPT="/usr/local/bin/jsign"

# Fonctions d'affichage
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
warn() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Vérifier si on est en root
if [ "$(id -u)" -ne 0 ]; then
  error "Ce script doit être exécuté en tant que root (sudo)."
  exit 1
fi

# En-tête
echo "=========================================="
echo "  Installation de jsign pour SignFile"
echo "=========================================="

# Vérifier Java
info "Vérification de Java..."
if ! command -v java &> /dev/null; then
  error "Java n'est pas installé. Veuillez installer Java avant de continuer."
  exit 1
fi
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
success "Java détecté: version $JAVA_VERSION"

# Créer le répertoire d'installation
info "Création du répertoire d'installation ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}" || {
  error "Impossible de créer le répertoire d'installation."
  exit 1
}

# Télécharger jsign
info "Téléchargement de jsign ${JSIGN_VERSION}..."
if command -v curl &> /dev/null; then
  curl -L -o "${JSIGN_JAR}" "${JSIGN_URL}" || {
    error "Échec du téléchargement avec curl."
    exit 1
  }
elif command -v wget &> /dev/null; then
  wget -O "${JSIGN_JAR}" "${JSIGN_URL}" || {
    error "Échec du téléchargement avec wget."
    exit 1
  }
else
  error "Ni curl ni wget ne sont disponibles. Veuillez installer l'un d'eux."
  exit 1
fi
success "jsign téléchargé vers ${JSIGN_JAR}"

# Créer le wrapper script
info "Création du script wrapper jsign..."
cat > "${JSIGN_SCRIPT}" << 'EOF'
#!/bin/bash
# Wrapper script for jsign
# Created by SignFile setup script

# Path to the jsign JAR file
JSIGN_JAR="/usr/local/jsign/jsign.jar"

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
  echo "java -jar ${JSIGN_JAR} ${ARGS[*]}"
  exec java -jar "${JSIGN_JAR}" "${ARGS[@]}"
else
  # For other file types, pass arguments directly
  exec java -jar "${JSIGN_JAR}" "$@"
fi
EOF

# Rendre le script exécutable
chmod +x "${JSIGN_SCRIPT}" || {
  error "Impossible de rendre le script exécutable."
  exit 1
}
success "Script wrapper jsign créé à ${JSIGN_SCRIPT}"

# Tester jsign
info "Test de l'installation de jsign..."
if "${JSIGN_SCRIPT}" --version &> /dev/null; then
  VERSION_OUTPUT=$("${JSIGN_SCRIPT}" --version)
  success "Test réussi: ${VERSION_OUTPUT}"
else
  warn "Le test de jsign a échoué. Vérifiez manuellement l'installation."
fi

# Instructions finales
echo ""
echo "=========================================="
echo "  Installation terminée avec succès"
echo "=========================================="
echo ""
echo "jsign a été installé à ${JSIGN_JAR}"
echo "Le script wrapper a été créé à ${JSIGN_SCRIPT}"
echo ""
echo "Utilisation:"
echo "  jsign --storetype PKCS12 --keystore certificate.pfx --storepass password file.ps1"
echo ""
echo "Pour les scripts PowerShell, le wrapper ajoute automatiquement:"
echo "  --detached false --replace"
echo ""
echo "Ces paramètres garantissent des signatures Authenticode correctes qui seront reconnues par Windows."
echo "=========================================="