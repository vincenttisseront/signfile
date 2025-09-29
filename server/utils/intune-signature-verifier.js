/**
 * Intune Signature Verification Module
 * 
 * This module specializes in verification of PowerShell scripts that have been signed
 * for use with Microsoft Intune and similar MDM systems. It addresses the specific
 * signature format and requirements for these deployment scenarios.
 */

const fs = require('fs/promises');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const AdvancedSignatureVerifier = require('./advanced-signature-verifier');

/**
 * IntuneSignatureVerifier Class
 * 
 * Specialized verification for Intune-style signatures which may have specific
 * characteristics or requirements.
 */
class IntuneSignatureVerifier {
  /**
   * Verify a script specifically for Intune/MDM deployment compatibility
   * 
   * @param {string} filePath - Path to the script file to verify
   * @returns {Promise<Object>} - Detailed verification result
   */
  static async verifyIntuneSignature(filePath) {
    console.log(`[IntuneVerifier] Starting verification for Intune compatibility: ${filePath}`);
    
    try {
      // First perform a comprehensive verification
      const baseResult = await AdvancedSignatureVerifier.verifyComprehensive(filePath);
      
      // Create a new result object extending the base result
      const result = {
        ...baseResult,
        intuneCompatibility: {
          compatible: false,
          blockers: [],
          warnings: [],
          recommendations: []
        }
      };
      
      // Read file content for Intune-specific checks
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check 1: Verify if it's a PowerShell script
      const isPowerShellScript = path.extname(filePath).toLowerCase() === '.ps1' || 
                               content.includes('#!') && content.includes('powershell');
      
      if (!isPowerShellScript) {
        result.intuneCompatibility.blockers.push('File is not recognized as a PowerShell script');
      }
      
      // Check 2: Check for signature block with specific characteristics
      // (Intune may have specific requirements for signature placement and format)
      const signatureInfo = await AdvancedSignatureVerifier.detectSignatureBlock(content);
      
      if (!signatureInfo.found) {
        result.intuneCompatibility.blockers.push('No signature block found');
      } else {
        // Additional check for Intune-specific signature patterns
        const hasIntuneCompatibleSignature = this.checkIntuneSignatureCompatibility(signatureInfo.block);
        
        if (!hasIntuneCompatibleSignature) {
          result.intuneCompatibility.warnings.push('Signature format may not be fully compatible with Intune');
        }
      }
      
      // Check 3: Check execution policy requirements
      const executionPolicyIssues = this.checkExecutionPolicyRequirements(content);
      if (executionPolicyIssues.length > 0) {
        result.intuneCompatibility.warnings.push(...executionPolicyIssues);
      }
      
      // Check 4: Look for Intune-specific script issues
      const intuneIssues = await this.checkIntuneSpecificIssues(content, filePath);
      
      if (intuneIssues.blockers.length > 0) {
        result.intuneCompatibility.blockers.push(...intuneIssues.blockers);
      }
      
      if (intuneIssues.warnings.length > 0) {
        result.intuneCompatibility.warnings.push(...intuneIssues.warnings);
      }
      
      // Check 5: Airlock compatibility
      const airlockIssues = this.checkAirlockCompatibility(content, signatureInfo, baseResult);
      
      if (airlockIssues.blockers.length > 0) {
        result.intuneCompatibility.blockers.push(...airlockIssues.blockers);
      }
      
      if (airlockIssues.warnings.length > 0) {
        result.intuneCompatibility.warnings.push(...airlockIssues.warnings);
      }
      
      // Check if the script is compatible overall
      result.intuneCompatibility.compatible = 
        result.valid && // Base signature is valid
        result.intuneCompatibility.blockers.length === 0; // No Intune-specific blockers
      
      // Add recommendations based on findings
      if (!result.intuneCompatibility.compatible) {
        if (!result.valid) {
          result.intuneCompatibility.recommendations.push(
            'Re-sign the script with a trusted certificate using standard PowerShell signing tools'
          );
        }
        
        if (result.intuneCompatibility.blockers.length > 0) {
          result.intuneCompatibility.recommendations.push(
            'Address all blocking issues before deploying to Intune'
          );
        }
      }
      
      // Add Intune-specific recommendations for warnings
      if (result.intuneCompatibility.warnings.length > 0) {
        result.intuneCompatibility.recommendations.push(
          'Consider addressing compatibility warnings to ensure reliable deployment'
        );
      }
      
      return result;
    } catch (error) {
      console.error(`[IntuneVerifier] Error during verification:`, error);
      return {
        valid: false,
        intuneCompatible: false,
        message: `Error during Intune verification: ${error.message}`,
        error: error.stack
      };
    }
  }
  
  /**
   * Check if signature block is compatible with Intune requirements
   * 
   * @param {string} signatureBlock - Signature block content
   * @returns {boolean} - True if compatible
   */
  static checkIntuneSignatureCompatibility(signatureBlock) {
    if (!signatureBlock) return false;
    
    // Check for specific patterns that indicate Intune compatibility
    const isStandardFormat = signatureBlock.includes('# SIG # Begin signature block') && 
                            signatureBlock.includes('# SIG # End signature block');
                            
    // Check for minimum certificate information
    const hasCertInfo = signatureBlock.includes('Subject') || 
                       signatureBlock.includes('Issuer') || 
                       signatureBlock.includes('Serial');
    
    // Check if signature block has expected structure
    const blockLines = signatureBlock.split('\n');
    const hasExpectedStructure = blockLines.length >= 5; // Minimum lines for a proper signature block
    
    // Check for Base64 content
    const base64Regex = /[A-Za-z0-9+/=]{20,}/g;
    const hasBase64Content = base64Regex.test(signatureBlock);
    
    // Intune typically requires standard PowerShell signatures
    return isStandardFormat && hasCertInfo && hasExpectedStructure && hasBase64Content;
  }
  
  /**
   * Check for issues with execution policy requirements
   * 
   * @param {string} content - Script content
   * @returns {string[]} - List of warnings
   */
  static checkExecutionPolicyRequirements(content) {
    const warnings = [];
    
    // Check for execution policy bypass attempts (may cause issues with Intune)
    if (content.includes('-ExecutionPolicy Bypass') || 
        content.includes('-ExecutionPolicy Unrestricted') ||
        content.includes('-EP Bypass')) {
      warnings.push('Script contains execution policy bypass commands which may be blocked by Intune security settings');
    }
    
    // Check for PowerShell command execution
    if (content.includes('Invoke-Expression') || content.includes('iex ')) {
      warnings.push('Script uses dynamic command execution (Invoke-Expression) which may trigger security warnings');
    }
    
    // Check for unsafe download commands
    if ((content.includes('Invoke-WebRequest') || content.includes('iwr ') ||
         content.includes('WebClient') || content.includes('DownloadFile')) &&
        !content.includes('https://')) {
      warnings.push('Script contains non-HTTPS download commands which may be blocked by Intune security settings');
    }
    
    return warnings;
  }
  
  /**
   * Check for Intune-specific deployment issues
   * 
   * @param {string} content - Script content
   * @param {string} filePath - Path to the script file
   * @returns {Promise<Object>} - Blockers and warnings
   */
  static async checkIntuneSpecificIssues(content, filePath) {
    const result = {
      blockers: [],
      warnings: []
    };
    
    // Check file encoding - Intune prefers UTF8 without BOM
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Check for UTF-8 BOM
      if (fileBuffer.length >= 3 && 
          fileBuffer[0] === 0xEF && 
          fileBuffer[1] === 0xBB && 
          fileBuffer[2] === 0xBF) {
        result.warnings.push('File has UTF-8 BOM which may cause issues with some Intune deployments');
      }
      
      // Check for UTF-16 encoding
      if (fileBuffer.length >= 2 && 
          (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xFE) || 
          (fileBuffer[0] === 0xFE && fileBuffer[1] === 0xFF)) {
        result.warnings.push('File appears to be UTF-16 encoded which may cause issues with Intune');
      }
    } catch (err) {
      result.warnings.push(`Could not check file encoding: ${err.message}`);
    }
    
    // Check script size (Intune has size limits)
    try {
      const stats = await fs.stat(filePath);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB > 8) {
        result.blockers.push(`Script size (${sizeInMB.toFixed(2)} MB) exceeds Intune's recommended maximum size`);
      } else if (sizeInMB > 5) {
        result.warnings.push(`Script size (${sizeInMB.toFixed(2)} MB) is approaching Intune's recommended maximum size`);
      }
    } catch (err) {
      result.warnings.push(`Could not check file size: ${err.message}`);
    }
    
    // Check for problematic script patterns for Intune
    if (content.includes('$env:TEMP') || content.includes('$env:TMP')) {
      result.warnings.push('Script uses temp directories which may behave differently under Intune system context');
    }
    
    if (content.includes('$env:USERPROFILE') || content.includes('%USERPROFILE%')) {
      result.warnings.push('Script references user profile which may not be available in Intune system context');
    }
    
    // Check for interactive commands that would fail in Intune
    if (content.includes('Read-Host') || content.includes('Get-Credential')) {
      result.blockers.push('Script contains interactive commands that will fail in Intune non-interactive context');
    }
    
    return result;
  }
  
  /**
   * Check for compatibility with Airlock security requirements
   * 
   * @param {string} content - Script content
   * @param {Object} signatureInfo - Signature information from detection
   * @param {Object} baseResult - Base verification result
   * @returns {Object} - Blockers and warnings
   */
  static checkAirlockCompatibility(content, signatureInfo, baseResult) {
    const result = {
      blockers: [],
      warnings: []
    };
    
    // Check 1: Airlock often requires signature with strong digest algorithm
    const certInfo = baseResult.verificationDetails?.certificate?.data || {};
    
    if (certInfo.signatureAlgorithm && 
        (certInfo.signatureAlgorithm.includes('MD5') || 
         certInfo.signatureAlgorithm.includes('SHA1'))) {
      result.blockers.push(`Signature uses weak algorithm (${certInfo.signatureAlgorithm}) which is likely blocked by Airlock`);
    }
    
    // Check 2: Self-signed certificates are often blocked
    if (certInfo.isSelfSigned) {
      result.warnings.push('Self-signed certificates are often blocked by security systems like Airlock');
    }
    
    // Check 3: Expired certificates
    if (certInfo.validityPeriod && !certInfo.validityPeriod.isValid) {
      result.blockers.push('Certificate is expired or not yet valid, which will be blocked by Airlock');
    }
    
    // Check 4: Look for potential signature timestamp issues
    if (!content.includes('TimeStampServer') && signatureInfo.block) {
      result.warnings.push('No timestamp information found in signature, which may cause issues when certificate expires');
    }
    
    // Check 5: Look for code that modifies system security settings
    const securityRiskPatterns = [
      'Set-ExecutionPolicy',
      'Add-MpPreference',
      'Set-MpPreference',
      'Disable-WindowsOptionalFeature',
      'reg add.*SOFTWARE\\\\Policies\\\\Microsoft\\\\Windows Defender',
      'sc stop WinDefend',
      'sc config'
    ];
    
    for (const pattern of securityRiskPatterns) {
      if (new RegExp(pattern, 'i').test(content)) {
        result.warnings.push(`Script contains commands (${pattern}) that modify system security and may be blocked`);
      }
    }
    
    // Check 6: Scripts with registry modifications may be blocked
    if ((content.match(/reg add/g) || []).length > 2 || content.includes('HKLM:\\SOFTWARE\\Policies')) {
      result.warnings.push('Script contains multiple registry modifications which may trigger Airlock security');
    }
    
    // Check for embedded scripts or executables (common Airlock block reason)
    if (content.includes('MZ') || // EXE header
        content.includes('[Convert]::FromBase64String') || // Embedded base64 binary
        content.includes('TVqQAA')) { // Base64 encoded MZ header
      result.blockers.push('Script appears to contain embedded binaries which are typically blocked by security systems');
    }
    
    return result;
  }
  
  /**
   * Perform enhanced verification specifically for common Intune deployment blockers
   * 
   * @param {string} filePath - Path to the script file
   * @returns {Promise<Object>} - Enhanced verification result
   */
  static async verifyForDeployment(filePath) {
    try {
      // Get base Intune verification
      const intuneResult = await this.verifyIntuneSignature(filePath);
      
      // Additional deployment-specific checks
      const fileSize = (await fs.stat(filePath)).size;
      const fileName = path.basename(filePath);
      
      // Additional deployment checks
      const deploymentChecks = {
        fileNameValid: !/[^\w\.\-\(\) ]/.test(fileName), // No special characters in filename
        sizeAcceptable: fileSize < 8 * 1024 * 1024, // Under 8MB
        pathTooLong: filePath.length > 240, // Windows path length issues
      };
      
      // Check for script options that might help with Airlock
      const content = await fs.readFile(filePath, 'utf8');
      
      // Look for Language Mode restrictions
      const languageModeIssue = content.includes('LanguageMode') && content.includes('ConstrainedLanguage');
      
      // Check PowerShell version compatibility
      const versionCompatibility = this.checkPowerShellVersionCompatibility(content);
      
      // Add more deployment-focused recommendations
      const deploymentRecommendations = [];
      
      if (!deploymentChecks.fileNameValid) {
        deploymentRecommendations.push('Use only alphanumeric characters, hyphens, underscores, and periods in filename');
      }
      
      if (!deploymentChecks.sizeAcceptable) {
        deploymentRecommendations.push('Reduce script size to under 8MB for reliable deployment');
      }
      
      if (deploymentChecks.pathTooLong) {
        deploymentRecommendations.push('Path length exceeds 240 characters which may cause issues on Windows systems');
      }
      
      if (languageModeIssue) {
        deploymentRecommendations.push('Script contains LanguageMode restrictions which may conflict with security policies');
      }
      
      if (versionCompatibility.issues) {
        deploymentRecommendations.push(`PowerShell version compatibility issue: ${versionCompatibility.message}`);
      }
      
      // Merge deployment recommendations
      intuneResult.deploymentChecks = deploymentChecks;
      intuneResult.intuneCompatibility.recommendations = [
        ...intuneResult.intuneCompatibility.recommendations,
        ...deploymentRecommendations
      ];
      
      return intuneResult;
    } catch (error) {
      console.error(`[IntuneVerifier] Error during deployment verification:`, error);
      return {
        valid: false,
        deploymentReady: false,
        message: `Error checking deployment compatibility: ${error.message}`,
        error: error.stack
      };
    }
  }
  
  /**
   * Check PowerShell version compatibility issues
   * 
   * @param {string} content - Script content
   * @returns {Object} - Compatibility information
   */
  static checkPowerShellVersionCompatibility(content) {
    const result = {
      issues: false,
      message: 'No PowerShell version compatibility issues detected',
      requiredVersion: null,
      usingPs5Features: false,
      usingPs7Features: false
    };
    
    // Check for explicit version requirements
    const versionMatch = content.match(/#requires\s+-version\s+(\d+(\.\d+)?)/i);
    if (versionMatch) {
      result.requiredVersion = versionMatch[1];
      const versionNum = parseFloat(versionMatch[1]);
      
      if (versionNum >= 6.0) {
        result.issues = true;
        result.message = `Script requires PowerShell ${versionNum}+ which may not be available in all Intune deployment scenarios`;
      }
    }
    
    // Check for PowerShell 7+ features
    const ps7Features = [
      'ForEach-Object -Parallel',
      'ThrottleLimit',
      '??=',
      'using namespace',
      'Out-GridView -PassThru',
      'Get-Error'
    ];
    
    // Check for PowerShell 5+ features that might not work in older environments
    const ps5Features = [
      'class ',
      'enum ',
      'Get-FileHash',
      'ConvertFrom-Json',
      'ConvertTo-Json',
      'foreach -parallel'
    ];
    
    // Check for PS7 features
    for (const feature of ps7Features) {
      if (content.includes(feature)) {
        result.issues = true;
        result.usingPs7Features = true;
        result.message = `Script uses PowerShell 7+ features (${feature}) which won't work in standard Windows PowerShell`;
        break;
      }
    }
    
    // Check for PS5 features if no PS7 features found
    if (!result.issues) {
      for (const feature of ps5Features) {
        if (content.includes(feature)) {
          result.usingPs5Features = true;
          // Not marking as an issue but noting it
          break;
        }
      }
    }
    
    return result;
  }
}

module.exports = IntuneSignatureVerifier;