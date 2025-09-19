import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawnSync } from 'child_process'
import { createError, defineEventHandler, sendError } from 'h3'
import logger from '../utils/logger'

// Define the type for verification result
interface VerificationResult {
  valid: boolean;
  message: string;
  details?: {
    signatureType?: string;
    signatureBlock?: string;
    jsignResult?: any;
    structureResult?: any;
    macosResult?: any;
    [key: string]: any;
  };
  signatureFound?: boolean;
  error?: string;
}

// Import our enhanced PowerShell signature verifier with error handling
let PSSignatureVerifier: any;
try {
  PSSignatureVerifier = require('../utils/ps-signature-verifier');
  logger.info('verify-signature', 'Successfully imported PSSignatureVerifier module');
} catch (err) {
  logger.error('verify-signature', `Failed to import PSSignatureVerifier module: ${err}`);
  // Create a fallback verifier if the import fails
  PSSignatureVerifier = {
    verify: async (filePath: string) => {
      logger.warn('verify-signature', `Using fallback verifier for ${filePath}`);
      // Basic verification logic
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const hasSignature = content.includes('# SIG # Begin signature block') || 
                            content.includes(':: SIG # Begin signature block');
        return {
          valid: hasSignature,
          message: hasSignature ? 'Found signature block (basic check only)' : 'No signature block found',
          details: { usingFallback: true }
        };
      } catch (err) {
        return { 
          valid: false, 
          message: `Error reading file: ${err}`,
          details: { error: String(err) }
        };
      }
    }
  };
}

export const config = {
  api: {
    bodyParser: false
  }
}

/**
 * Verifies the file with the macOS codesign command
 * This verification will fail for PowerShell scripts, but it's informative
 */
function verifyWithMacOSCodeSign(filePath: string): string {
  try {
    const result = spawnSync('codesign', ['-v', '-d', filePath], { encoding: 'utf8' });
    return result.stdout + result.stderr;
  } catch (error) {
    return `Error executing codesign: ${error}`;
  }
}

export default defineEventHandler(async (event) => {
  logger.info('verify-signature', 'Received signature verification request');
  
  let tempDir = '';
  
  try {
    // Create a temporary directory for this process
    const requestId = randomUUID().slice(0, 8);
    tempDir = path.join(tmpdir(), `verify-signature-${requestId}`);
    logger.debug('verify-signature', `Creating temp directory: ${tempDir}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Configure formidable to process the form
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      uploadDir: tempDir
    });
    
    logger.debug('verify-signature', 'Parsing form data...');
    
    // Parse the form with detailed error handling
    let fields: formidable.Fields;
    let files: formidable.Files;
    
    try {
      ({ fields, files } = await new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
        form.parse(event.node.req, (err, fields, files) => {
          if (err) {
            logger.error('verify-signature', `Form parse error: ${err}`);
            reject(err);
          } else {
            logger.info('verify-signature', `Form parsed successfully: fields=${Object.keys(fields).length}, files=${Object.keys(files).length}`);
            resolve({ fields, files });
          }
        });
      }));
    } catch (formErr) {
      logger.error('verify-signature', `Failed to parse form: ${formErr}`);
      return sendError(event, createError({ 
        statusCode: 400, 
        message: `Invalid form data: ${formErr}` 
      }));
    }
    
    // Check if a file was submitted
    const scriptFile = files.script?.[0];
    if (!scriptFile || !scriptFile.filepath) {
      logger.warn('verify-signature', 'No file submitted for verification');
      return { valid: false, message: 'No file submitted for verification' };
    }
    
    logger.info('verify-signature', `Received file: ${scriptFile.originalFilename || 'unnamed'} (${scriptFile.filepath})`);
    
    // Check if the file exists and is readable
    try {
      await fs.access(scriptFile.filepath, fs.constants.R_OK);
      const stats = await fs.stat(scriptFile.filepath);
      logger.debug('verify-signature', `File exists and is readable. Size: ${stats.size} bytes`);
    } catch (accessErr) {
      logger.error('verify-signature', `File access error: ${accessErr}`);
      return sendError(event, createError({ 
        statusCode: 500, 
        message: `Cannot access uploaded file: ${accessErr}` 
      }));
    }
    
    // Check if it's a PS1 file
    const ext = path.extname(scriptFile.originalFilename || '').toLowerCase();
    
    // Collect detailed file information
    const fileStats = await fs.stat(scriptFile.filepath);
    const fileInfo = {
      name: scriptFile.originalFilename,
      size: fileStats.size,
      type: ext,
      lastModified: fileStats.mtime
    };
    
    // Use our enhanced PowerShell signature verifier for .ps1 and .cmd files
    if (ext === '.ps1' || ext === '.cmd') {
      logger.info('verify-signature', `Using enhanced verifier for ${ext} file`);
      
      let verificationResult: VerificationResult;
      
      try {
        // Verify the signature using our enhanced verifier
        logger.debug('verify-signature', `Calling PSSignatureVerifier.verify on ${scriptFile.filepath}`);
        verificationResult = await PSSignatureVerifier.verify(scriptFile.filepath) as VerificationResult;
        logger.info('verify-signature', `Verification result: ${verificationResult.valid ? 'Valid' : 'Invalid'} - ${verificationResult.message}`);
      } catch (verifyErr) {
        logger.error('verify-signature', `Verification threw an exception: ${verifyErr}`);
        
        // Fallback to a basic check if verification fails
        try {
          const content = await fs.readFile(scriptFile.filepath, 'utf8');
          const hasSignature = content.includes('# SIG # Begin signature block') || 
                              content.includes(':: SIG # Begin signature block');
          
          verificationResult = {
            valid: hasSignature,
            message: `Verification error, using basic check: ${hasSignature ? 'Found signature block' : 'No signature block found'}`,
            details: { 
              error: String(verifyErr),
              fallbackUsed: true 
            }
          };
          
          logger.warn('verify-signature', `Using fallback verification: ${verificationResult.message}`);
        } catch (readErr) {
          logger.error('verify-signature', `Even fallback verification failed: ${readErr}`);
          return sendError(event, createError({ 
            statusCode: 500, 
            message: `Verification failed: ${verifyErr}. Fallback also failed: ${readErr}` 
          }));
        }
      }
      
      // Check also with macOS codesign for informational purposes
      const macosVerifyResult = verifyWithMacOSCodeSign(scriptFile.filepath);
      
      // Prepare explanations for the user about the difference between signatures
      const explanation = {
        title: "Why doesn't macOS detect PowerShell signatures?",
        content: [
          "PowerShell script signatures use Microsoft's Authenticode format, which is embedded directly in the text file's content.",
          "The macOS 'codesign' command only looks for Apple format signatures, which are stored differently.",
          "These two signature systems are incompatible because they use different formats and storage locations.",
          "To verify a PowerShell signature, you must use PowerShell itself or specific tools (like we do here)."
        ]
      };
      
      // Build the response
      return {
        valid: verificationResult.valid,
        message: verificationResult.message,
        details: {
          ...verificationResult.details,
          macosCodeSignResult: macosVerifyResult
        },
        file: fileInfo,
        explanation: explanation,
        macosCompatible: false,
        timestamp: new Date().toISOString()
      };
    } else {
      // For non-PowerShell files, check with macOS codesign
      const macosVerifyResult = verifyWithMacOSCodeSign(scriptFile.filepath);
      const hasMacOSSignature = !macosVerifyResult.includes('code object is not signed at all');
      
      return { 
        valid: hasMacOSSignature, 
        message: hasMacOSSignature 
          ? `The file has a valid macOS signature.`
          : 'No signature detected.',
        details: {
          macosCodeSignResult: macosVerifyResult
        },
        file: fileInfo,
        macosCompatible: hasMacOSSignature,
        timestamp: new Date().toISOString()
      };
    }
  } catch (err) {
    logger.error('verify-signature', `Error during verification: ${err}`);
    logger.error('verify-signature', `Error stack: ${(err as Error).stack}`);
    console.error('[verify-signature] Error:', err);
    
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
        logger.warn('verify-signature', `Error cleaning up temporary directory: ${cleanupErr}`);
      }
    }
  }
});