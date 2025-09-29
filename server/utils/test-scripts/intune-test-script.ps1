#!/usr/bin/env powershell
<#
.SYNOPSIS
    Script de test pour la vérification de signature Authenticode par Intune et Airlock
.DESCRIPTION
    Ce script contient des caractéristiques spécifiques pour tester le système de vérification de signatures
    de SignFile, notamment pour les scénarios Intune et Airlock.
.NOTES
    Version:        1.0
    Author:         SignFile Test
    Creation Date:  2023-12-07
    Purpose:        Tests de signatures
#>

# Paramètres
param (
    [Parameter(Mandatory=$false)]
    [string]$Action = "Test",
    
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "$env:TEMP\SignFileTest.log"
)

# Fonction de journalisation
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("INFO", "WARNING", "ERROR")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Écrire dans le fichier journal
    Add-Content -Path $LogPath -Value $logMessage
    
    # Afficher à l'écran avec couleur appropriée
    switch ($Level) {
        "INFO"    { Write-Host $logMessage -ForegroundColor Cyan }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR"   { Write-Host $logMessage -ForegroundColor Red }
    }
}

# Fonction pour vérifier la signature du script actuel
function Test-CurrentScriptSignature {
    $scriptPath = $MyInvocation.ScriptName
    
    Write-Log "Vérification de la signature du script: $scriptPath"
    
    try {
        $signature = Get-AuthenticodeSignature -FilePath $scriptPath
        
        Write-Log "Statut de la signature: $($signature.Status)"
        Write-Log "Signataire: $($signature.SignerCertificate.Subject)"
        Write-Log "Émetteur: $($signature.SignerCertificate.Issuer)"
        Write-Log "Validité: $($signature.SignerCertificate.NotBefore) au $($signature.SignerCertificate.NotAfter)"
        
        if ($signature.Status -eq "Valid") {
            Write-Log "La signature est valide" -Level "INFO"
            return $true
        }
        else {
            Write-Log "La signature n'est pas valide: $($signature.StatusMessage)" -Level "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Erreur lors de la vérification de la signature: $_" -Level "ERROR"
        return $false
    }
}

# Fonction pour effectuer une action système inoffensive
function Perform-SystemAction {
    param (
        [string]$Action
    )
    
    Write-Log "Exécution de l'action: $Action"
    
    switch ($Action) {
        "Test" {
            # Action inoffensive - récupérer l'heure système
            $currentTime = Get-Date
            Write-Log "Action test exécutée. Heure actuelle: $currentTime"
        }
        "Info" {
            # Récupérer des informations système basiques
            $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
            $computerInfo = Get-CimInstance -ClassName Win32_ComputerSystem
            
            Write-Log "Informations système:"
            Write-Log "OS: $($osInfo.Caption) $($osInfo.Version)"
            Write-Log "Nom de l'ordinateur: $($computerInfo.Name)"
            Write-Log "Fabricant: $($computerInfo.Manufacturer)"
            Write-Log "Modèle: $($computerInfo.Model)"
        }
        default {
            Write-Log "Action non reconnue: $Action" -Level "WARNING"
        }
    }
}

# Initialisation
Write-Log "Démarrage du script de test SignFile"
Write-Log "Action spécifiée: $Action"

# Vérifier la signature
$isSignatureValid = Test-CurrentScriptSignature

if ($isSignatureValid) {
    Write-Log "Signature valide - Exécution de l'action demandée"
    Perform-SystemAction -Action $Action
}
else {
    Write-Log "Impossible de poursuivre - La signature du script n'est pas valide" -Level "ERROR"
    exit 1
}

Write-Log "Fin du script de test SignFile"