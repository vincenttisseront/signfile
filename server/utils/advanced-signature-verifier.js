/**
 * Advanced PowerShell Signature Verification
 * 
 * This module provides comprehensive signature verification for PowerShell scripts
 * with enhanced security checks and detailed certificate validation.
 */

const fs = require('fs/promises');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * Advanced Signature Verifier Class
 */
class AdvancedSignatureVerifier {
  /**
   * Perform comprehensive verification of a PowerShell script
   * 
   * @param {string} filePath - Path to the script file to verify
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} - Detailed verification result
   */
  static async verifyComprehensive(filePath, options = {}) {
    console.log(`[AdvancedVerifier] Starting comprehensive verification of: ${filePath}`);
    
    try {
      // Read the file content
      const content = await fs.readFile(filePath, 'utf8');
      console.log(`[AdvancedVerifier] Read file content, length: ${content.length} bytes`);
      
      // Initialize result structure
      const result = {
        valid: false,
        signatureFound: false,
        securityScore: 0,
        certificateInfo: null,
        signatureType: null,
        contentAnalysis: {},
        methodsAttempted: [],
        verificationDetails: {},
        warnings: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // Step 1: Check for signature block presence (multiple formats)
      const signatureInfo = await this.detectSignatureBlock(content);
      result.signatureFound = signatureInfo.found;
      result.signatureType = signatureInfo.type;
      result.contentAnalysis.signatureBlockPresent = signatureInfo.found;
      
      if (!signatureInfo.found) {
        result.message = 'No signature block found in the file.';
        return result;
      }
      
      // Step 2: Extract and analyze the signature block
      const signatureBlock = signatureInfo.block;
      const signatureAnalysis = this.analyzeSignatureBlock(signatureBlock);
      result.contentAnalysis.signatureBlockAnalysis = signatureAnalysis;
      
      if (signatureAnalysis.score < 3) {
        result.warnings.push('Signature block appears malformed or incomplete');
      }
      
      // Step 3: Perform multiple verification methods
      const verificationResults = await Promise.allSettled([
        this.verifyWithJsign(filePath),
        this.verifyWithOpenSSL(filePath, signatureBlock),
        this.verifySignatureStructure(signatureBlock),
        this.verifyContentIntegrity(filePath, content, signatureBlock),
        this.extractCertificateInfo(filePath, signatureBlock)
      ]);
      
      // Extract results
      const [jsignResult, opensslResult, structureResult, integrityResult, certificateInfo] = 
        verificationResults.map(r => r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason });
      
      // Store all verification method results
      result.methodsAttempted = ['jsign', 'openssl', 'structure', 'integrity', 'certificate'];
      result.verificationDetails = {
        jsign: jsignResult,
        openssl: opensslResult,
        structure: structureResult,
        integrity: integrityResult,
        certificate: certificateInfo
      };
      
      // Extract certificate information if available
      if (certificateInfo && certificateInfo.extracted) {
        result.certificateInfo = certificateInfo.data;
      }
      
      // Step 4: Calculate a comprehensive security score (0-10)
      let securityScore = 0;
      
      // Add points for each verification method that passed
      if (jsignResult.valid) securityScore += 3;
      if (opensslResult.valid) securityScore += 2;
      if (structureResult.valid) securityScore += 1;
      if (integrityResult.valid) securityScore += 2;
      
      // Add points for certificate quality
      if (certificateInfo && certificateInfo.extracted) {
        // Points for strong certificate
        if (certificateInfo.data.keyStrength >= 2048) securityScore += 1;
        if (certificateInfo.data.validityPeriod && 
            certificateInfo.data.validityPeriod.isValid) securityScore += 1;
        
        // Reduce score for issues
        if (certificateInfo.data.isSelfSigned) {
          securityScore -= 1;
          result.warnings.push('Certificate is self-signed, reducing trust level');
        }
        
        // Reduce score for expired certificates
        if (certificateInfo.data.validityPeriod && 
            !certificateInfo.data.validityPeriod.isValid) {
          securityScore -= 2;
          result.warnings.push('Certificate appears to be expired or not yet valid');
        }
      }
      
      // Cap the score between 0-10
      result.securityScore = Math.max(0, Math.min(10, securityScore));
      
      // Step 5: Determine overall validity with high standards
      // We require at least one cryptographic verification method to pass
      // plus a reasonable security score
      result.valid = (jsignResult.valid || opensslResult.valid) && result.securityScore >= 5;
      
      // Generate overall message
      if (result.valid) {
        result.message = `Valid ${signatureInfo.type} signature with security score ${result.securityScore}/10.`;
      } else if (jsignResult.valid || opensslResult.valid) {
        result.message = `Signature verified but with security concerns (score: ${result.securityScore}/10).`;
        result.recommendations.push('Consider updating certificate or signing method.');
      } else {
        result.message = `Invalid or unverifiable ${signatureInfo.type} signature.`;
        if (signatureInfo.found) {
          result.recommendations.push('File contains a signature block but verification failed. The file may have been tampered with.');
        }
      }
      
      // Step 6: Add remediation recommendations if applicable
      if (!result.valid && result.signatureFound) {
        result.recommendations.push('Re-sign the file with a trusted certificate');
      }
      
      return result;
    } catch (error) {
      console.error(`[AdvancedVerifier] Error during verification:`, error);
      return {
        valid: false,
        message: `Error during verification: ${error.message}`,
        error: error.stack,
        signatureFound: false,
        securityScore: 0
      };
    }
  }
  
  /**
   * Detect and extract signature block from various formats
   * 
   * @param {string} content - File content
   * @returns {Object} - Signature block detection result
   */
  static async detectSignatureBlock(content) {
    // Define signature block patterns for different formats
    const patterns = [
      { start: '# SIG # Begin signature block', end: '# SIG # End signature block', type: 'PowerShell standard' },
      { start: ':: SIG # Begin signature block', end: ':: SIG # End signature block', type: 'CMD standard' },
      { start: '# Begin signature block', end: '# End signature block', type: 'PowerShell variant' },
      { start: ':: Begin signature block', end: ':: End signature block', type: 'CMD variant' },
      { start: '-----BEGIN SIGNATURE-----', end: '-----END SIGNATURE-----', type: 'PEM-style' }
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const startIndex = content.indexOf(pattern.start);
      const endIndex = content.indexOf(pattern.end);
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        return {
          found: true,
          type: pattern.type,
          block: content.substring(startIndex, endIndex + pattern.end.length),
          range: {
            start: startIndex,
            end: endIndex + pattern.end.length
          }
        };
      }
    }
    
    // No signature block found
    return {
      found: false,
      type: null,
      block: '',
      range: null
    };
  }
  
  /**
   * Analyze signature block structure and components
   * 
   * @param {string} signatureBlock - Signature block content
   * @returns {Object} - Analysis results
   */
  static analyzeSignatureBlock(signatureBlock) {
    // Check for key signature components
    const hasSignatureHeader = signatureBlock.includes('Begin signature block');
    const hasSignatureFooter = signatureBlock.includes('End signature block');
    
    // Check for base64 content with more precise regex
    const base64Regex = /[A-Za-z0-9+/=]{20,}/g;
    const base64Matches = signatureBlock.match(base64Regex) || [];
    const hasBase64Content = base64Matches.length > 0;
    const base64ContentLength = base64Matches.reduce((sum, match) => sum + match.length, 0);
    
    // Look for common certificate markers
    const hasCertMarkers = signatureBlock.includes('MII') || 
                          signatureBlock.includes('BEGIN CERTIFICATE') ||
                          signatureBlock.includes('CERT');
                          
    // Look for common signature/signer info
    const hasSignerInfo = signatureBlock.includes('Subject:') || 
                         signatureBlock.includes('Issuer:') ||
                         signatureBlock.includes('SignedBy');
    
    // Check for timestamp info
    const hasTimestampInfo = signatureBlock.includes('TimeStamp') || 
                            signatureBlock.includes('timestamp') ||
                            signatureBlock.includes('Date');
                            
    // Look for algorithm information
    const hasAlgorithmInfo = signatureBlock.includes('SHA') || 
                            signatureBlock.includes('RSA') ||
                            signatureBlock.includes('algorithm');
    
    // Calculate score based on number of indicators present
    let score = 0;
    if (hasSignatureHeader) score += 1;
    if (hasSignatureFooter) score += 1;
    if (hasBase64Content) score += 2;
    if (base64ContentLength > 100) score += 1; // Longer signature is better
    if (hasCertMarkers) score += 2;
    if (hasSignerInfo) score += 1;
    if (hasTimestampInfo) score += 1;
    if (hasAlgorithmInfo) score += 1;
    
    return {
      score,
      components: {
        hasSignatureHeader,
        hasSignatureFooter,
        hasBase64Content,
        base64ContentLength,
        hasCertMarkers,
        hasSignerInfo,
        hasTimestampInfo,
        hasAlgorithmInfo
      }
    };
  }
  
  /**
   * Verify with jsign tool
   * 
   * @param {string} filePath - Path to file to verify
   * @returns {Promise<Object>} - Verification result
   */
  static async verifyWithJsign(filePath) {
    try {
      // Try multiple possible jsign paths with more sophisticated approach
      const jsignPaths = [
        { command: 'java', args: ['-jar', '/usr/local/bin/jsign.jar', '--verify', filePath] },
        { command: '/usr/local/bin/jsign', args: ['--verify', filePath] },
        { command: 'jsign', args: ['--verify', filePath] }
      ];
      
      // Special options for deep validation
      const deepValidationPaths = [
        { command: 'java', args: ['-jar', '/usr/local/bin/jsign.jar', '--verify', '--deep', filePath] },
        { command: '/usr/local/bin/jsign', args: ['--verify', '--deep', filePath] },
        { command: 'jsign', args: ['--verify', '--deep', filePath] }
      ];
      
      // Try standard verification first
      for (const jsignConfig of jsignPaths) {
        try {
          console.log(`[AdvancedVerifier] Trying jsign with: ${jsignConfig.command} ${jsignConfig.args.join(' ')}`);
          
          const result = spawnSync(jsignConfig.command, jsignConfig.args, { 
            encoding: 'utf8',
            timeout: 10000 // 10 second timeout
          });
          
          // Process the output
          const output = result.stdout || '';
          const error = result.stderr || '';
          const combinedOutput = output + error;
          
          // Check for successful verification
          const isValid = result.status === 0 && 
                        !combinedOutput.includes('is not signed') &&
                        !combinedOutput.includes('Invalid') &&
                        !combinedOutput.includes('Error');
          
          // Extract certificate information if available
          const certInfo = this.extractJsignCertInfo(combinedOutput);
          
          // If standard verification fails, try deep validation
          if (!isValid) {
            console.log(`[AdvancedVerifier] Standard jsign verification failed, trying deep validation...`);
            
            // Try deep validation which might handle special cases better
            for (const deepConfig of deepValidationPaths) {
              try {
                console.log(`[AdvancedVerifier] Trying jsign deep validation with: ${deepConfig.command} ${deepConfig.args.join(' ')}`);
                
                const deepResult = spawnSync(deepConfig.command, deepConfig.args, { 
                  encoding: 'utf8',
                  timeout: 15000 // Longer timeout for deep validation
                });
                
                const deepOutput = deepResult.stdout || '';
                const deepError = deepResult.stderr || '';
                const deepCombinedOutput = deepOutput + deepError;
                
                // Check for successful deep verification
                const isDeepValid = deepResult.status === 0 && 
                                  !deepCombinedOutput.includes('is not signed') &&
                                  !deepCombinedOutput.includes('Invalid') &&
                                  !deepCombinedOutput.includes('Error');
                
                if (isDeepValid) {
                  console.log(`[AdvancedVerifier] Deep validation succeeded where standard verification failed`);
                  return {
                    valid: true,
                    method: 'jsign-deep',
                    output: deepCombinedOutput,
                    exitCode: deepResult.status,
                    certificateInfo: this.extractJsignCertInfo(deepCombinedOutput),
                    note: "Signature verified with deep validation, may have non-standard characteristics"
                  };
                }
              } catch (deepErr) {
                console.log(`[AdvancedVerifier] jsign deep validation attempt failed: ${deepErr.message}`);
              }
            }
          }
          
          // Return standard result if we got here
          return {
            valid: isValid,
            method: 'jsign',
            output: combinedOutput,
            exitCode: result.status,
            certificateInfo: certInfo
          };
        } catch (err) {
          console.log(`[AdvancedVerifier] jsign attempt failed: ${err.message}`);
          // Continue to next path
        }
      }
      
      return {
        valid: false,
        method: 'jsign',
        output: 'All jsign verification attempts failed',
        reason: 'Could not execute jsign verification tool'
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
   * Extract certificate information from jsign output
   * 
   * @param {string} output - jsign command output
   * @returns {Object|null} - Extracted certificate info or null
   */
  static extractJsignCertInfo(output) {
    if (!output) return null;
    
    try {
      const certInfo = {};
      
      // Extract subject
      const subjectMatch = output.match(/Subject:\s*([^\n]+)/);
      if (subjectMatch) certInfo.subject = subjectMatch[1].trim();
      
      // Extract issuer
      const issuerMatch = output.match(/Issuer:\s*([^\n]+)/);
      if (issuerMatch) certInfo.issuer = issuerMatch[1].trim();
      
      // Extract validity period
      const validityMatch = output.match(/Valid from:\s*([^\n]+)\s*until:\s*([^\n]+)/);
      if (validityMatch) {
        certInfo.validity = {
          from: validityMatch[1].trim(),
          until: validityMatch[2].trim()
        };
      }
      
      // Extract signature algorithm
      const algoMatch = output.match(/Signature algorithm:\s*([^\n]+)/);
      if (algoMatch) certInfo.algorithm = algoMatch[1].trim();
      
      return Object.keys(certInfo).length > 0 ? certInfo : null;
    } catch (err) {
      console.error('[AdvancedVerifier] Error extracting cert info:', err);
      return null;
    }
  }
  
  /**
   * Verify with OpenSSL for deeper certificate analysis
   * 
   * @param {string} filePath - Path to the file
   * @param {string} signatureBlock - Extracted signature block
   * @returns {Promise<Object>} - Verification result
   */
  static async verifyWithOpenSSL(filePath, signatureBlock) {
    try {
      // Create temporary files for certificate and signature
      const tempDir = path.join(os.tmpdir(), `sig-verify-${crypto.randomUUID().slice(0, 8)}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Extract Base64 content from signature block
      const base64Content = this.extractBase64FromSignatureBlock(signatureBlock);
      
      if (!base64Content) {
        return {
          valid: false,
          method: 'openssl',
          reason: 'Could not extract Base64 content from signature block'
        };
      }
      
      // Write base64 content to temporary files
      const signaturePath = path.join(tempDir, 'signature.bin');
      const certificatePath = path.join(tempDir, 'certificate.pem');
      
      // Try to decode and split the Base64 content into signature and certificate
      // This is a simplified approach - in a real implementation, you'd need more
      // sophisticated parsing based on the specific format
      await fs.writeFile(signaturePath, Buffer.from(base64Content, 'base64'));
      
      // Try to extract PEM certificate from the file content
      const pemCert = this.extractPEMCertificate(signatureBlock);
      if (pemCert) {
        await fs.writeFile(certificatePath, pemCert);
        
        // Try to verify with OpenSSL
        try {
          // Get file content without signature block for verification
          const fileContent = await fs.readFile(filePath, 'utf8');
          const contentWithoutSignature = this.removeSignatureBlock(fileContent, signatureBlock);
          
          // Write content without signature to temp file
          const contentPath = path.join(tempDir, 'content.txt');
          await fs.writeFile(contentPath, contentWithoutSignature);
          
          // Run OpenSSL verification
          const { stdout, stderr } = await exec(
            `openssl dgst -sha256 -verify ${certificatePath} -signature ${signaturePath} ${contentPath}`
          );
          
          const isValid = stdout.includes('Verified OK');
          
          return {
            valid: isValid,
            method: 'openssl',
            output: stdout + stderr,
            certificateExtracted: true
          };
        } catch (opensslErr) {
          return {
            valid: false,
            method: 'openssl',
            output: opensslErr.message,
            certificateExtracted: true,
            error: 'OpenSSL verification failed'
          };
        }
      }
      
      // Clean up temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore cleanup errors
      }
      
      return {
        valid: false,
        method: 'openssl',
        reason: 'Could not extract certificate in PEM format'
      };
    } catch (error) {
      return {
        valid: false,
        method: 'openssl',
        output: error.message,
        error: error.stack
      };
    }
  }
  
  /**
   * Extract Base64 content from signature block
   * 
   * @param {string} signatureBlock - Signature block content
   * @returns {string|null} - Extracted Base64 content or null
   */
  static extractBase64FromSignatureBlock(signatureBlock) {
    if (!signatureBlock) return null;
    
    // Remove comment markers and whitespace
    let lines = signatureBlock.split('\n');
    let base64Lines = [];
    
    for (const line of lines) {
      // Remove comment markers and whitespace
      let cleaned = line
        .replace(/^# SIG #/, '')
        .replace(/^::/, '')
        .replace(/^#/, '')
        .trim();
      
      // Keep only lines that look like Base64
      if (/^[A-Za-z0-9+/=]+$/.test(cleaned) && cleaned.length > 0) {
        base64Lines.push(cleaned);
      }
    }
    
    return base64Lines.join('');
  }
  
  /**
   * Extract PEM certificate from signature block
   * 
   * @param {string} content - Content to search for PEM certificate
   * @returns {string|null} - PEM certificate or null
   */
  static extractPEMCertificate(content) {
    const pemMatch = content.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    return pemMatch ? pemMatch[0] : null;
  }
  
  /**
   * Remove signature block from file content
   * 
   * @param {string} fileContent - Original file content
   * @param {string} signatureBlock - Signature block to remove
   * @returns {string} - Content without signature block
   */
  static removeSignatureBlock(fileContent, signatureBlock) {
    if (!signatureBlock) return fileContent;
    
    // Simple string replacement
    return fileContent.replace(signatureBlock, '').trim();
  }
  
  /**
   * Verify signature structure with detailed analysis
   * 
   * @param {string} signatureBlock - Signature block to analyze
   * @returns {Promise<Object>} - Structure verification result
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
      
      // Parse and analyze the structure
      const analysis = this.analyzeSignatureBlock(signatureBlock);
      
      // Check for minimum structural requirements
      const hasEssentials = analysis.components.hasSignatureHeader && 
                           analysis.components.hasSignatureFooter && 
                           analysis.components.hasBase64Content;
                           
      // Check for evidence of cryptographic content
      const hasCryptoContent = analysis.components.hasCertMarkers || 
                              (analysis.components.base64ContentLength > 100);
      
      // Check overall quality score
      const hasQualityScore = analysis.score >= 5;
      
      // A valid signature block needs essentials + crypto content + quality score
      const isValid = hasEssentials && hasCryptoContent && hasQualityScore;
      
      return {
        valid: isValid,
        method: 'structure',
        score: analysis.score,
        components: analysis.components,
        minimumRequirements: {
          hasEssentials,
          hasCryptoContent,
          hasQualityScore
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
   * Verify content integrity by checking if the signature covers the whole file
   * 
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @param {string} signatureBlock - Signature block
   * @returns {Promise<Object>} - Integrity verification result
   */
  static async verifyContentIntegrity(filePath, content, signatureBlock) {
    try {
      if (!content || !signatureBlock) {
        return {
          valid: false,
          method: 'integrity',
          reason: 'Missing content or signature block'
        };
      }
      
      // Check if signature block is at the end of the file (good practice)
      const signatureAtEnd = content.endsWith(signatureBlock);
      
      // Check if file has been tampered with by looking for unusual patterns
      const suspiciousPatterns = [
        'eval(',            // Dynamic code execution
        'Invoke-Expression', // PowerShell dynamic execution
        'iex ',             // PowerShell alias for Invoke-Expression
        'hidden',           // Hidden attributes
        'bypass',           // Security bypass
        'encoded',          // Encoded commands
        '-enc',             // Encoded command shorthand
        '-w hidden',        // Hidden window
        'frombase64'        // Base64 decoding
      ];
      
      // Content without signature block (what should be signed)
      const contentWithoutSignature = this.removeSignatureBlock(content, signatureBlock);
      
      // Check for suspicious patterns
      const suspiciousFound = suspiciousPatterns.some(pattern => 
        contentWithoutSignature.toLowerCase().includes(pattern.toLowerCase())
      );
      
      // Calculate content integrity score
      let integrityScore = 10; // Start with perfect score
      
      if (!signatureAtEnd) integrityScore -= 2;
      if (suspiciousFound) integrityScore -= 5;
      
      // Additional checks for obfuscation
      const hasObfuscation = this.checkForObfuscation(contentWithoutSignature);
      if (hasObfuscation) integrityScore -= 3;
      
      // Check for script content after signature block (possible tampering)
      const hasContentAfterSignature = !signatureAtEnd && 
                                     content.indexOf(signatureBlock) + signatureBlock.length < content.length;
      if (hasContentAfterSignature) integrityScore -= 8; // Major integrity issue
      
      // Cap score between 0-10
      integrityScore = Math.max(0, Math.min(10, integrityScore));
      
      return {
        valid: integrityScore >= 7, // High standard for integrity
        method: 'integrity',
        score: integrityScore,
        details: {
          signatureAtEnd,
          suspiciousFound,
          hasObfuscation,
          hasContentAfterSignature
        }
      };
    } catch (error) {
      return {
        valid: false,
        method: 'integrity',
        error: error.message
      };
    }
  }
  
  /**
   * Check for signs of code obfuscation
   * 
   * @param {string} content - Content to analyze
   * @returns {boolean} - True if obfuscation detected
   */
  static checkForObfuscation(content) {
    if (!content) return false;
    
    // Signs of obfuscation
    const obfuscationIndicators = [
      // Excessive string concatenation
      (content.match(/'\s*\+\s*'/g) || []).length > 10,
      
      // Unusually long lines
      content.split('\n').some(line => line.length > 500),
      
      // Excessive character codes
      (content.match(/\[char\]/g) || []).length > 5,
      
      // Excessive hex/octal encoding
      (content.match(/0x[0-9A-Fa-f]{2,}/g) || []).length > 10,
      
      // Base64 encoded scripts
      content.includes('ToBase64String') && content.includes('FromBase64String'),
      
      // Compressed scripts
      content.includes('Decompress') && content.includes('MemoryStream'),
      
      // Excessive variable name obfuscation (single letter variables)
      (content.match(/\$[a-z]\s*=/gi) || []).length > 15
    ];
    
    return obfuscationIndicators.some(indicator => indicator === true);
  }
  
  /**
   * Extract detailed certificate information
   * 
   * @param {string} filePath - Path to file
   * @param {string} signatureBlock - Signature block
   * @returns {Promise<Object>} - Certificate extraction result
   */
  static async extractCertificateInfo(filePath, signatureBlock) {
    try {
      // Extract PEM certificate if present
      const pemCert = this.extractPEMCertificate(signatureBlock);
      
      if (!pemCert) {
        return {
          extracted: false,
          method: 'certificate',
          reason: 'Could not extract certificate'
        };
      }
      
      // Create a temporary file for the certificate
      const tempDir = path.join(os.tmpdir(), `cert-extract-${crypto.randomUUID().slice(0, 8)}`);
      await fs.mkdir(tempDir, { recursive: true });
      const certPath = path.join(tempDir, 'cert.pem');
      await fs.writeFile(certPath, pemCert);
      
      // Use OpenSSL to extract detailed certificate info
      try {
        const certInfo = {};
        
        // Get subject
        const { stdout: subject } = await exec(`openssl x509 -in ${certPath} -noout -subject`);
        certInfo.subject = subject.replace('subject=', '').trim();
        
        // Get issuer
        const { stdout: issuer } = await exec(`openssl x509 -in ${certPath} -noout -issuer`);
        certInfo.issuer = issuer.replace('issuer=', '').trim();
        
        // Check if self-signed
        certInfo.isSelfSigned = certInfo.subject === certInfo.issuer;
        
        // Get validity dates
        const { stdout: dates } = await exec(`openssl x509 -in ${certPath} -noout -dates`);
        const notBefore = dates.match(/notBefore=(.+)/)?.[1].trim();
        const notAfter = dates.match(/notAfter=(.+)/)?.[1].trim();
        
        if (notBefore && notAfter) {
          const now = new Date();
          const validFrom = new Date(notBefore);
          const validTo = new Date(notAfter);
          
          certInfo.validityPeriod = {
            notBefore,
            notAfter,
            isValid: now >= validFrom && now <= validTo
          };
        }
        
        // Get fingerprints
        const { stdout: sha1 } = await exec(`openssl x509 -in ${certPath} -noout -fingerprint -sha1`);
        const { stdout: sha256 } = await exec(`openssl x509 -in ${certPath} -noout -fingerprint -sha256`);
        
        certInfo.fingerprints = {
          sha1: sha1.replace('SHA1 Fingerprint=', '').trim(),
          sha256: sha256.replace('SHA256 Fingerprint=', '').trim()
        };
        
        // Get key strength
        const { stdout: text } = await exec(`openssl x509 -in ${certPath} -noout -text`);
        const keyStrengthMatch = text.match(/(\d+) bit/);
        certInfo.keyStrength = keyStrengthMatch ? parseInt(keyStrengthMatch[1]) : null;
        
        // Get signature algorithm
        const algoMatch = text.match(/Signature Algorithm: (.+?)\n/);
        certInfo.signatureAlgorithm = algoMatch ? algoMatch[1].trim() : null;
        
        // Check if certificate is in a trusted root store
        // This is simplified - would need more complex logic in production
        certInfo.isTrusted = false; // Default to untrusted
        
        // Clean up temp files
        await fs.rm(tempDir, { recursive: true, force: true });
        
        return {
          extracted: true,
          method: 'certificate',
          data: certInfo
        };
      } catch (opensslErr) {
        return {
          extracted: false,
          method: 'certificate',
          error: opensslErr.message
        };
      }
    } catch (error) {
      return {
        extracted: false,
        method: 'certificate',
        error: error.message
      };
    }
  }
}

module.exports = AdvancedSignatureVerifier;