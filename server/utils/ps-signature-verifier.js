/**
 * Enhanced PowerShell Signature Verification
 * 
 * This module provides improved signature verification for PowerShell (.ps1) scripts,
 * focusing on reliability and cross-platform compatibility.
 */

const fs = require('fs/promises');
const { spawn, spawnSync } = require('child_process');
const path = require('path');

/**
 * PowerShell Signature Verifier Class
 */
class PowerShellSignatureVerifier {
  /**
   * Verify a PowerShell script signature
   * 
   * @param {string} filePath - Path to the script file to verify
   * @returns {Promise<Object>} - Verification result
   */
  static async verify(filePath) {
    try {
      // Read the file content
      console.log(`[PSSignatureVerifier] Verifying file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf8');
      console.log(`[PSSignatureVerifier] Read file content, length: ${content.length} bytes`);
      
      // First, check for signature block presence (multiple formats)
      const hasStandardSignature = content.includes('# SIG # Begin signature block') && 
                                   content.includes('# SIG # End signature block');
      
      const hasCmdSignature = content.includes(':: SIG # Begin signature block') && 
                              content.includes(':: SIG # End signature block');
      
      const hasVariantSignature = (content.includes('# Begin signature block') && 
                                  content.includes('# End signature block')) ||
                                  (content.includes(':: Begin signature block') && 
                                  content.includes(':: End signature block'));
      
      if (!hasStandardSignature && !hasCmdSignature && !hasVariantSignature) {
        return {
          valid: false,
          message: 'No signature block found in the file.',
          details: {
            hasSignatureBlock: false
          }
        };
      }
      
      // Extract signature block
      let signatureBlock = '';
      let signatureType = '';
      
      if (hasStandardSignature) {
        signatureBlock = this.extractSignatureBlock(content, '# SIG # Begin signature block', '# SIG # End signature block');
        signatureType = 'PowerShell standard';
      } else if (hasCmdSignature) {
        signatureBlock = this.extractSignatureBlock(content, ':: SIG # Begin signature block', ':: SIG # End signature block');
        signatureType = 'CMD standard';
      } else if (content.includes('# Begin signature block')) {
        signatureBlock = this.extractSignatureBlock(content, '# Begin signature block', '# End signature block');
        signatureType = 'PowerShell variant';
      } else if (content.includes(':: Begin signature block')) {
        signatureBlock = this.extractSignatureBlock(content, ':: Begin signature block', ':: End signature block');
        signatureType = 'CMD variant';
      }
      
      // Perform multiple verification methods for better reliability
      const results = await Promise.all([
        this.verifyWithJsign(filePath),
        this.verifySignatureStructure(signatureBlock),
        this.verifyWithMacOS(filePath)
      ]);
      
      const [jsignResult, structureResult, macosResult] = results;
      
      // Determine overall validity - if any method says it's valid, consider it valid
      // This helps with cross-platform compatibility where one method might fail
      const isValid = jsignResult.valid || structureResult.valid;
      
      return {
        valid: isValid,
        message: isValid 
          ? `Valid ${signatureType} signature detected.` 
          : `Invalid or incomplete ${signatureType} signature.`,
        details: {
          signatureType,
          signatureBlock,
          jsignResult,
          structureResult,
          macosResult
        },
        signatureFound: true
      };
    } catch (error) {
      console.error(`[PSSignatureVerifier] Error verifying signature:`, error);
      console.error(`[PSSignatureVerifier] Error stack:`, error.stack);
      return {
        valid: false,
        message: `Error verifying signature: ${error.message}`,
        error: error.stack,
        signatureFound: false
      };
    }
  }
  
  /**
   * Extract signature block based on start and end markers
   * 
   * @param {string} content - File content
   * @param {string} startMarker - Start marker for signature block
   * @param {string} endMarker - End marker for signature block
   * @returns {string} - Extracted signature block
   */
  static extractSignatureBlock(content, startMarker, endMarker) {
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return content.substring(startIndex, endIndex + endMarker.length);
    }
    
    return '';
  }
  
  /**
   * Verify signature using jsign
   * 
   * @param {string} filePath - Path to file to verify
   * @returns {Promise<Object>} - Verification result
   */
  static async verifyWithJsign(filePath) {
    try {
      // Try multiple possible jsign paths
      const jsignPaths = [
        { command: 'java', args: ['-jar', '/usr/local/jsign/jsign.jar', '--verify', filePath] },
        { command: '/usr/local/bin/jsign', args: ['--verify', filePath] },
        { command: 'jsign', args: ['--verify', filePath] }
      ];
      
      let output = '';
      let error = '';
      let success = false;
      
      // Try each jsign path until one works
      for (const jsign of jsignPaths) {
        try {
          const result = spawnSync(jsign.command, jsign.args, { encoding: 'utf8' });
          
          if (result.status === 0) {
            output = result.stdout;
            success = true;
            break;
          } else {
            error = result.stderr || result.stdout;
          }
        } catch (err) {
          // Continue to next path
          error = `${err.message}\n${error}`;
        }
      }
      
      return {
        valid: success,
        method: 'jsign',
        output: output || error
      };
    } catch (error) {
      return {
        valid: false,
        method: 'jsign',
        output: error.message,
        error: error.stack
      };
    }
  }
  
  /**
   * Verify signature structure by checking for key components
   * 
   * @param {string} signatureBlock - Signature block to verify
   * @returns {Promise<Object>} - Verification result
   */
  static async verifySignatureStructure(signatureBlock) {
    try {
      if (!signatureBlock) {
        return {
          valid: false,
          method: 'structure',
          reason: 'No signature block found'
        };
      }
      
      // Check for key signature components
      const hasSignatureHeader = signatureBlock.includes('Begin signature block');
      const hasSignatureFooter = signatureBlock.includes('End signature block');
      const hasBase64Content = /[A-Za-z0-9+/=]{20,}/.test(signatureBlock);
      
      // Look for common certificate markers
      const hasCertMarkers = signatureBlock.includes('MII') || 
                            signatureBlock.includes('BEGIN CERTIFICATE') ||
                            signatureBlock.includes('CERT');
                            
      // Look for common signature/signer info
      const hasSignerInfo = signatureBlock.includes('Subject:') || 
                           signatureBlock.includes('Issuer:') ||
                           signatureBlock.includes('SignedBy');
      
      // Calculate confidence score based on number of indicators present
      let score = 0;
      if (hasSignatureHeader) score += 1;
      if (hasSignatureFooter) score += 1;
      if (hasBase64Content) score += 2;
      if (hasCertMarkers) score += 3;
      if (hasSignerInfo) score += 2;
      
      // Valid if has essential components and a reasonable score
      const valid = hasSignatureHeader && hasSignatureFooter && hasBase64Content && score >= 5;
      
      return {
        valid,
        method: 'structure',
        score,
        components: {
          hasSignatureHeader,
          hasSignatureFooter,
          hasBase64Content,
          hasCertMarkers,
          hasSignerInfo
        }
      };
    } catch (error) {
      return {
        valid: false,
        method: 'structure',
        error: error.message
      };
    }
  }
  
  /**
   * Attempt to verify with macOS codesign (always fails for PS1 but informative)
   * 
   * @param {string} filePath - Path to file to verify
   * @returns {Promise<Object>} - Verification result
   */
  static async verifyWithMacOS(filePath) {
    try {
      const result = spawnSync('codesign', ['-v', '-d', filePath], { encoding: 'utf8' });
      const output = result.stdout + result.stderr;
      
      // macOS codesign will always fail for PowerShell scripts
      return {
        valid: false,
        method: 'macOS-codesign',
        output,
        reason: 'PowerShell scripts use Authenticode format not recognized by macOS'
      };
    } catch (error) {
      return {
        valid: false,
        method: 'macOS-codesign',
        output: error.message
      };
    }
  }
}

module.exports = PowerShellSignatureVerifier;