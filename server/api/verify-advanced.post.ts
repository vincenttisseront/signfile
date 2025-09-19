import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { createError, defineEventHandler, sendError } from 'h3'
import logger from '../utils/logger'

// Import our advanced signature verifier
let AdvancedSignatureVerifier: any;
try {
  // Vérifier si le fichier existe avant de l'importer
  const verifierPath = path.resolve(__dirname, '../utils/advanced-signature-verifier.js');
  fs.access(verifierPath).then(() => {
    console.log(`[verify-advanced] Verifier module found at ${verifierPath}`);
    AdvancedSignatureVerifier = require('../utils/advanced-signature-verifier');
    logger.info('verify-advanced', 'Successfully imported AdvancedSignatureVerifier module');
  }).catch(err => {
    console.error(`[verify-advanced] Cannot access verifier at ${verifierPath}: ${err}`);
    logger.error('verify-advanced', `Cannot access verifier file: ${err}`);
  });
} catch (err) {
  console.error('[verify-advanced] Import error:', err);
  logger.error('verify-advanced', `Failed to import AdvancedSignatureVerifier module: ${err}`);
  // We'll handle this error later
}

// Fallback implementation if the advanced verifier is not available
const fallbackVerifier = {
  verifyComprehensive: async (filePath: string) => {
    console.log(`[FallbackVerifier] Using basic verification for ${filePath}`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const hasSignature = content.includes('# SIG # Begin signature block') || 
                           content.includes(':: SIG # Begin signature block');
      
      return {
        valid: hasSignature,
        message: hasSignature ? 'Signature block found (basic check only)' : 'No signature block found',
        signatureFound: hasSignature,
        securityScore: hasSignature ? 5 : 0,
        verificationDetails: {
          structure: {
            valid: hasSignature,
            method: 'basic-check',
            reason: 'Using fallback verification'
          }
        },
        recommendations: [
          'Install advanced verification module for more comprehensive checks'
        ],
        warnings: [
          'Using simplified verification - limited security assessment available'
        ]
      };
    } catch (err) {
      console.error('[FallbackVerifier] Error:', err);
      return { 
        valid: false, 
        message: `Error reading file: ${err}`,
        securityScore: 0,
        error: String(err)
      };
    }
  }
};

export default defineEventHandler(async (event) => {
  logger.info('verify-advanced', 'Received advanced signature verification request');
  
  let tempDir = '';
  
  try {
    // Check if the advanced verifier is available
    if (!AdvancedSignatureVerifier) {
      logger.warn('verify-advanced', 'AdvancedSignatureVerifier module is not available, using fallback');
      // Ne pas échouer immédiatement, nous utiliserons le fallback plus tard
    }
    
    // Create a temporary directory for this process
    const requestId = randomUUID().slice(0, 8);
    tempDir = path.join(tmpdir(), `verify-advanced-${requestId}`);
    logger.debug('verify-advanced', `Creating temp directory: ${tempDir}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Configure formidable to process the form
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      uploadDir: tempDir
    });
    
    logger.debug('verify-advanced', 'Parsing form data...');
    
    // Parse the form with detailed error handling
    let fields: formidable.Fields;
    let files: formidable.Files;
    
    try {
      ({ fields, files } = await new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
        form.parse(event.node.req, (err, fields, files) => {
          if (err) {
            logger.error('verify-advanced', `Form parse error: ${err}`);
            reject(err);
          } else {
            logger.info('verify-advanced', `Form parsed successfully: fields=${Object.keys(fields).length}, files=${Object.keys(files).length}`);
            resolve({ fields, files });
          }
        });
      }));
    } catch (formErr) {
      logger.error('verify-advanced', `Failed to parse form: ${formErr}`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: `Invalid form data: ${formErr}` 
      }));
    }
    
    // Check if a file was submitted
    const scriptFile = files.script?.[0];
    if (!scriptFile || !scriptFile.filepath) {
      logger.warn('verify-advanced', 'No file submitted for verification');
      return { valid: false, message: 'No file submitted for verification' };
    }
    
    logger.info('verify-advanced', `Received file: ${scriptFile.originalFilename || 'unnamed'} (${scriptFile.filepath})`);
    
    // Get verification options from form data
    const options = {
      deepScan: fields.deepScan?.[0] === 'true',
      checkCertificateRevocation: fields.checkCertificateRevocation?.[0] === 'true',
      checkTrustedRoots: fields.checkTrustedRoots?.[0] === 'true'
    };
    
    logger.info('verify-advanced', `Verification options: ${JSON.stringify(options)}`);
    
    // Collect file information
    const fileStats = await fs.stat(scriptFile.filepath);
    const fileInfo = {
      name: scriptFile.originalFilename,
      size: fileStats.size,
      type: path.extname(scriptFile.originalFilename || '').toLowerCase(),
      lastModified: fileStats.mtime
    };
    
    // Perform comprehensive verification using either the advanced or fallback verifier
    logger.info('verify-advanced', `Starting verification of ${scriptFile.filepath}`);
    
    const verifier = AdvancedSignatureVerifier || fallbackVerifier;
    const verificationResult = await verifier.verifyComprehensive(
      scriptFile.filepath, 
      options
    );
    
    logger.info('verify-advanced', `Verification complete: valid=${verificationResult.valid}, score=${verificationResult.securityScore || 'n/a'}`);
    
    // Add file info to the result
    const result = {
      ...verificationResult,
      file: fileInfo,
      verificationTimestamp: new Date().toISOString(),
      usingFallback: !AdvancedSignatureVerifier
    };
    
    // Add explanation based on the results
    result.explanation = {
      title: "Understanding the Security Score",
      securityScore: {
        score: verificationResult.securityScore || 0,
        maxScore: 10,
        interpretation: interpretSecurityScore(verificationResult.securityScore || 0)
      },
      verificationMethods: explainVerificationMethods(verificationResult),
      recommendations: verificationResult.recommendations || []
    };
    
    return result;
    
  } catch (err) {
    logger.error('verify-advanced', `Error during verification: ${err}`);
    logger.error('verify-advanced', `Error stack: ${(err as Error).stack}`);
    console.error('[verify-advanced] Error:', err);
    
    return sendError(event, createError({ 
      statusCode: 500, 
      message: `Error during verification: ${err}` 
    }));
  } finally {
    // Clean up the temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn('verify-advanced', `Error cleaning up temporary directory: ${cleanupErr}`);
      }
    }
  }
});

/**
 * Interpret the security score in human-readable terms
 */
function interpretSecurityScore(score: number): string {
  if (score >= 9) {
    return "Excellent - The signature meets the highest security standards";
  } else if (score >= 7) {
    return "Good - The signature is trustworthy with minor improvements possible";
  } else if (score >= 5) {
    return "Acceptable - The signature is valid but could be improved";
  } else if (score >= 3) {
    return "Questionable - The signature has significant security issues";
  } else {
    return "Poor - The signature does not meet basic security requirements";
  }
}

/**
 * Provide explanations for the verification methods used
 */
function explainVerificationMethods(result: any): any {
  const explanations: any = {};
  
  if (result.verificationDetails?.jsign) {
    explanations.jsign = {
      name: "Authenticode Validation (jsign)",
      description: "Validates the Authenticode signature used in Windows executables and scripts",
      result: result.verificationDetails.jsign.valid 
        ? "Passed" 
        : "Failed",
      details: result.verificationDetails.jsign.output
    };
  }
  
  if (result.verificationDetails?.openssl) {
    explanations.openssl = {
      name: "Cryptographic Verification (OpenSSL)",
      description: "Verifies the cryptographic signature using industry-standard OpenSSL",
      result: result.verificationDetails.openssl.valid 
        ? "Passed" 
        : "Failed"
    };
  }
  
  if (result.verificationDetails?.structure) {
    explanations.structure = {
      name: "Signature Structure Analysis",
      description: "Analyzes the structure and components of the signature block",
      result: result.verificationDetails.structure.valid 
        ? "Passed" 
        : "Failed",
      score: result.verificationDetails.structure.score
    };
  }
  
  if (result.verificationDetails?.integrity) {
    explanations.integrity = {
      name: "Content Integrity Check",
      description: "Verifies that the file hasn't been tampered with after signing",
      result: result.verificationDetails.integrity.valid 
        ? "Passed" 
        : "Failed",
      score: result.verificationDetails.integrity.score
    };
  }
  
  return explanations;
}