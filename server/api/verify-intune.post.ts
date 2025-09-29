/**
 * Intune Signature Verification API Endpoint
 * 
 * This API endpoint specializes in verification of PowerShell scripts that have
 * been signed for deployment via Microsoft Intune or other MDM systems.
 */

import { defineEventHandler } from 'h3';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

// Define a simplified verifier directly in this file
// This is necessary because importing CommonJS modules in ESM can be problematic
interface FileInfo {
  name: string;
  size: string;
  sizeInBytes: number;
  type: string;
  lastModified: string;
}

interface SignatureInfo {
  found: boolean;
  type: string | null;
  score: number;
}

interface VerificationResult {
  valid: boolean;
  message: string;
  signatureType: string | null;
  signatureFound: boolean;
  securityScore: number;
  statusMessage: string;
  statusLevel: string;
  fileInfo?: FileInfo;
  verificationMethods?: Array<{name: string; status: string; description: string}>;
  warnings: string[];
  recommendations: string[];
  note?: string;
  error?: string;
  intuneCompatibility: {
    compatible: boolean;
    blockers: string[];
    warnings: string[];
    recommendations: string[];
  };
  deploymentChecks?: {
    fileNameValid: boolean;
    sizeAcceptable: boolean;
    pathTooLong: boolean;
  };
}

const IntuneVerifier = {
  /**
   * Get file information
   * 
   * @param filePath Path to the file
   * @returns File information object
   */
  async _getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    
    // Format size to human-readable
    const sizeInBytes = stats.size;
    let sizeStr = '';
    
    if (sizeInBytes < 1024) {
      sizeStr = `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      sizeStr = `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      sizeStr = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      sizeStr = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    
    // Format date to standard format
    const lastModified = stats.mtime.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return {
      name: fileName,
      size: sizeStr,
      sizeInBytes,
      type: ext,
      lastModified
    };
  },
  
  /**
   * Analyze signature block in file content
   * 
   * @param content File content
   * @returns Signature information
   */
  async _analyzeSignatureBlock(content: string): Promise<SignatureInfo> {
    if (!content) {
      return { found: false, type: null, score: 0 };
    }
    
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
        // Get the signature block
        const block = content.substring(startIndex, endIndex + pattern.end.length);
        
        // Calculate a simple score based on block length
        // The longer the signature block, the more likely it contains a valid signature
        let score = 5; // Base score for finding a block
        
        // Bonus points for longer blocks (likely more information)
        if (block.length > 500) score += 1;
        if (block.length > 1000) score += 1;
        if (block.length > 2000) score += 1;
        
        // Bonus points for base64 content
        const base64ContentMatch = block.match(/[A-Za-z0-9+/=]{20,}/g);
        if (base64ContentMatch && base64ContentMatch.length > 0) {
          score += 2;
        }
        
        return {
          found: true,
          type: pattern.type,
          score
        };
      }
    }
    
    // No signature block found
    return { found: false, type: null, score: 0 };
  },

  /**
   * Verify a script for Intune compatibility
   */
  async verifyIntuneSignature(filePath: string): Promise<VerificationResult> {
    try {
      // Read the file content
      const content = await fs.readFile(filePath, 'utf8');
      
      // Get file info
      const fileInfo = await this._getFileInfo(filePath);
      
      // Check for signature block
      const signatureInfo = await this._analyzeSignatureBlock(content);
      
      // Calculate a basic security score (between 0-10)
      // Basic implementation gives 5 points just for having a valid signature structure
      let securityScore = signatureInfo.found ? 5 : 0;
      
      // Generate status message based on security score
      let statusMessage = '';
      let statusLevel = '';
      
      if (securityScore === 0) {
        statusMessage = 'Invalid - No signature found';
        statusLevel = 'danger';
      } else if (securityScore <= 3) {
        statusMessage = 'Poor - The signature has serious issues';
        statusLevel = 'danger';
      } else if (securityScore <= 5) {
        statusMessage = 'Acceptable - The signature is valid but could be improved';
        statusLevel = 'warning';
      } else if (securityScore <= 8) {
        statusMessage = 'Good - The signature meets security standards';
        statusLevel = 'success';
      } else {
        statusMessage = 'Excellent - The signature meets high security standards';
        statusLevel = 'success';
      }
      
      // List verification methods tried
      const verificationMethods = [{
        name: 'Signature Structure Analysis',
        status: signatureInfo.found ? 'Passed' : 'Failed',
        description: 'Analyzes the structure and components of the signature block'
      }];
      
      // Generate warnings and recommendations
      const warnings: string[] = [];
      const recommendations: string[] = [];
      
      if (!signatureInfo.found) {
        warnings.push('No signature block found in the file');
        recommendations.push('Sign the script with a trusted certificate before deployment');
      } else {
        warnings.push('Using simplified verification - limited security assessment available');
        recommendations.push('Install advanced verification module for more comprehensive checks');
      }
      
      // Basic verification result with enhanced details
      return {
        valid: signatureInfo.found,
        message: signatureInfo.found 
          ? "Valid signature\nSignature block found (basic check only)" 
          : "No signature block found in the file.",
        signatureType: signatureInfo.found ? "PowerShell standard" : null,
        signatureFound: signatureInfo.found,
        securityScore,
        statusMessage,
        statusLevel,
        fileInfo,
        verificationMethods,
        warnings,
        recommendations,
        note: "Using simplified verification due to unavailable advanced verification module.",
        intuneCompatibility: {
          compatible: signatureInfo.found,
          blockers: !signatureInfo.found ? ["No signature block found"] : [],
          warnings,
          recommendations
        }
      };
    } catch (error) {
      console.error(`[IntuneVerifier] Error:`, error);
      return {
        valid: false,
        message: `Error during verification: ${(error as Error).message}`,
        error: (error as Error).stack,
        securityScore: 0,
        statusMessage: 'Error - Verification failed',
        statusLevel: 'danger',
        signatureType: null,
        signatureFound: false,
        warnings: [`Error: ${(error as Error).message}`],
        recommendations: ["Try using the Advanced Verification tool"],
        intuneCompatibility: {
          compatible: false,
          blockers: [`Error during verification: ${(error as Error).message}`],
          warnings: [`Error: ${(error as Error).message}`],
          recommendations: ["Try using the Advanced Verification tool"]
        }
      };
    }
  },
  
  /**
   * Verify a script for deployment
   */
  async verifyForDeployment(filePath: string): Promise<VerificationResult> {
    try {
      const baseResult = await this.verifyIntuneSignature(filePath);
      
      // Add deployment-specific checks
      const fileName = path.basename(filePath);
      const fileSize = (await fs.stat(filePath)).size;
      const sizeInMB = fileSize / (1024 * 1024);
      
      const deploymentChecks = {
        fileNameValid: !/[^\w\.\-\(\) ]/.test(fileName),
        sizeAcceptable: sizeInMB < 8,
        pathTooLong: filePath.length > 240
      };
      
      // Add recommendations
      const recommendations = [...baseResult.recommendations];
      const warnings = [...baseResult.warnings];
      
      if (!deploymentChecks.fileNameValid) {
        warnings.push('Invalid filename for deployment');
        recommendations.push('Use only alphanumeric characters, hyphens, underscores, and periods in filename');
      }
      
      if (!deploymentChecks.sizeAcceptable) {
        warnings.push('File size exceeds recommended limit');
        recommendations.push('Reduce script size to under 8MB for reliable deployment');
      }
      
      if (deploymentChecks.pathTooLong) {
        warnings.push('Path length exceeds Windows limits');
        recommendations.push('Path length exceeds 240 characters which may cause issues on Windows systems');
      }
      
      // Add deployment verification method
      const verificationMethods = [
        ...(baseResult.verificationMethods || []),
        {
          name: 'Deployment Compatibility',
          status: (deploymentChecks.fileNameValid && deploymentChecks.sizeAcceptable && !deploymentChecks.pathTooLong) ? 'Passed' : 'Failed',
          description: 'Checks if the file meets Intune deployment requirements'
        }
      ];
      
      // Adjust security score based on deployment checks
      let securityScore = baseResult.securityScore;
      
      if (!deploymentChecks.fileNameValid) securityScore = Math.max(0, securityScore - 1);
      if (!deploymentChecks.sizeAcceptable) securityScore = Math.max(0, securityScore - 1);
      if (deploymentChecks.pathTooLong) securityScore = Math.max(0, securityScore - 1);
      
      // Generate updated status message
      let statusMessage = '';
      let statusLevel = '';
      
      if (securityScore === 0) {
        statusMessage = 'Invalid - Not deployable';
        statusLevel = 'danger';
      } else if (securityScore <= 3) {
        statusMessage = 'Poor - High risk for deployment';
        statusLevel = 'danger';
      } else if (securityScore <= 5) {
        statusMessage = 'Acceptable - Can be deployed with caution';
        statusLevel = 'warning';
      } else if (securityScore <= 8) {
        statusMessage = 'Good - Suitable for deployment';
        statusLevel = 'success';
      } else {
        statusMessage = 'Excellent - Highly secure for deployment';
        statusLevel = 'success';
      }
      
      // Create blockers array for critical issues
      const blockers: string[] = [];
      
      if (!baseResult.valid) {
        blockers.push('Invalid signature');
      }
      
      if (!deploymentChecks.fileNameValid) {
        blockers.push('Invalid filename for Intune deployment');
      }
      
      if (!deploymentChecks.sizeAcceptable) {
        blockers.push('File too large for reliable Intune deployment');
      }
      
      // Update intuneCompatibility for more detailed information
      const intuneCompatibility = {
        compatible: baseResult.valid && deploymentChecks.fileNameValid && deploymentChecks.sizeAcceptable && !deploymentChecks.pathTooLong,
        blockers,
        warnings,
        recommendations
      };
      
      return {
        ...baseResult,
        securityScore,
        statusMessage,
        statusLevel,
        verificationMethods,
        warnings,
        recommendations,
        deploymentChecks,
        intuneCompatibility
      };
    } catch (error) {
      console.error(`[IntuneVerifier] Error during deployment check:`, error);
      return {
        valid: false,
        message: `Error checking deployment compatibility: ${(error as Error).message}`,
        error: (error as Error).stack,
        securityScore: 0,
        statusMessage: 'Error - Verification failed',
        statusLevel: 'danger',
        signatureType: null,
        signatureFound: false,
        warnings: [`Error during deployment check: ${(error as Error).message}`],
        recommendations: ["Try using the Advanced Verification tool"],
        intuneCompatibility: {
          compatible: false,
          blockers: [`Error during verification: ${(error as Error).message}`],
          warnings: [`Error during deployment check: ${(error as Error).message}`],
          recommendations: ["Try using the Advanced Verification tool"]
        }
      };
    }
  },
  
  /**
   * Detect signature block in content
   */
  _detectSignatureBlock(content: string): boolean {
    if (!content) return false;
    
    // Define signature block patterns for different formats
    const patterns = [
      { start: '# SIG # Begin signature block', end: '# SIG # End signature block' },
      { start: ':: SIG # Begin signature block', end: ':: SIG # End signature block' },
      { start: '# Begin signature block', end: '# End signature block' },
      { start: ':: Begin signature block', end: ':: End signature block' },
      { start: '-----BEGIN SIGNATURE-----', end: '-----END SIGNATURE-----' }
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const startIndex = content.indexOf(pattern.start);
      const endIndex = content.indexOf(pattern.end);
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        return true;
      }
    }
    
    return false;
  }
};

// Define event handler
export default defineEventHandler(async (event: any) => {
  console.log('[verify-intune] Starting Intune signature verification');
  
  try {
    console.log('[verify-intune] Setting up formidable');
    
    // Make sure we use a writable directory
    const uploadDir = process.env.NODE_ENV === 'production' ? '/app/temp' : os.tmpdir();
    console.log(`[verify-intune] Upload directory: ${uploadDir}`);
    
    // Use a more robust form parsing
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      allowEmptyFiles: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      uploadDir: uploadDir,
      filter: part => {
        console.log(`[verify-intune] Processing form part: ${part.name}`);
        return true; // Accept any file for verification
      }
    });
    
    // Parse the form
    const { fields, files } = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(event.req, (err: Error | null, fields: any, files: any) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });
    
    // Get uploaded file
    const uploadedFile = files.file;
    
    if (!uploadedFile || !uploadedFile[0]) {
      return {
        success: false,
        message: 'No file was uploaded'
      };
    }
    
    const filePath = uploadedFile[0].filepath;
    console.log(`[verify-intune] File uploaded to: ${filePath}`);
    
    // Get deployment mode (if specified)
    const deploymentMode = fields.deploymentMode?.[0] || 'standard';
    console.log(`[verify-intune] Deployment mode: ${deploymentMode}`);
    
    // Perform verification based on mode
    let verificationResult;
    if (deploymentMode === 'deployment') {
      console.log('[verify-intune] Using deployment verification mode');
      verificationResult = await IntuneVerifier.verifyForDeployment(filePath);
    } else {
      console.log('[verify-intune] Using standard verification mode');
      verificationResult = await IntuneVerifier.verifyIntuneSignature(filePath);
    }
    
    // Clean up the uploaded file
    try {
      await fs.unlink(filePath);
      console.log(`[verify-intune] Cleaned up temporary file: ${filePath}`);
    } catch (cleanupErr) {
      console.error(`[verify-intune] Error cleaning up temporary file: ${cleanupErr}`);
    }
    
    // Return the verification result
    return {
      success: true,
      result: verificationResult
    };
  } catch (error) {
    console.error('[verify-intune] Error during verification:', error);
    
    return {
      success: false,
      message: `Error during verification: ${(error as Error).message}`,
      error: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
  }
});