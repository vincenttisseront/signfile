import { spawn, spawnSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import logger from './logger'

/**
 * Helper class for jsign operations
 * This centralizes jsign-related functionality for both signing and verification
 */
export class JsignHelper {
  /**
   * Find the best available jsign executable
   */
  static async findJsignPath(): Promise<{ command: string, args: string[] }> {
    const jsignPaths = [
      { path: '/usr/local/jsign/jsign.jar', isJar: true },
      { path: '/usr/local/bin/jsign', isJar: false },
      { path: 'jsign', isJar: false }
    ];
    
    for (const jsignPath of jsignPaths) {
      try {
        if (jsignPath.isJar) {
          await fs.access(jsignPath.path);
          return { 
            command: 'java', 
            args: ['-jar', jsignPath.path]
          };
        } else {
          // Try running jsign --version to see if it's available
          const result = spawnSync(jsignPath.path, ['--version']);
          if (result.status === 0) {
            return { 
              command: jsignPath.path, 
              args: []
            };
          }
        }
      } catch (err) {
        // Continue to next path if this one fails
        continue;
      }
    }
    
    throw new Error('jsign not found in any of the expected locations');
  }
  
  /**
   * Sign a file using jsign
   */
  static async signFile(
    filePath: string, 
    certPath: string, 
    password: string, 
    options: { 
      name?: string, 
      alg?: string, 
      tsaurl?: string 
    } = {}
  ): Promise<{ success: boolean, output: string }> {
    try {
      // Find jsign
      const { command, args } = await this.findJsignPath();
      
      // Build args for signing
      const signArgs = [
        ...args,
        '--storetype', 'PKCS12',
        '--keystore', certPath,
        '--storepass', password,
        '--tsaurl', options.tsaurl || 'http://timestamp.digicert.com',
        '--alg', options.alg || 'SHA-256',
        '--name', options.name || 'Signed Script',
        '--detached', 'false', // Explicitly use embedded signature
        '--replace', // Replace existing signature if present
        filePath
      ];
      
      // Run jsign
      return new Promise((resolve) => {
        const jsign = spawn(command, signArgs, {
          windowsHide: true,
          env: { 
            ...process.env,
            JAVA_OPTS: '-Xmx512m',
            PATH: '/usr/local/bin:' + (process.env.PATH || '')
          }
        });
        
        let stdout = '';
        let stderr = '';
        
        jsign.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        jsign.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        jsign.on('close', (code) => {
          const output = stdout + stderr;
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            resolve({ success: false, output });
          }
        });
        
        jsign.on('error', (err) => {
          resolve({ success: false, output: err.toString() });
        });
      });
    } catch (err) {
      return { success: false, output: String(err) };
    }
  }
  
  /**
   * Verify a file's signature using jsign
   */
  static async verifyFile(filePath: string): Promise<{ success: boolean, output: string }> {
    try {
      // Find jsign
      const { command, args } = await this.findJsignPath();
      
      // Build args for verification
      const verifyArgs = [...args, '--verify', filePath];
      
      // Run jsign
      return new Promise((resolve) => {
        const jsign = spawn(command, verifyArgs, {
          windowsHide: true,
          env: { 
            ...process.env,
            JAVA_OPTS: '-Xmx512m',
            PATH: '/usr/local/bin:' + (process.env.PATH || '')
          }
        });
        
        let stdout = '';
        let stderr = '';
        
        jsign.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        jsign.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        jsign.on('close', (code) => {
          const output = stdout + stderr;
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            resolve({ success: false, output });
          }
        });
        
        jsign.on('error', (err) => {
          resolve({ success: false, output: err.toString() });
        });
      });
    } catch (err) {
      return { success: false, output: String(err) };
    }
  }
  
  /**
   * Verify a file signature by structure analysis
   */
  static async verifyFileStructure(filePath: string): Promise<{ 
    valid: boolean, 
    signatureType: string | null,
    details: any
  }> {
    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for different signature types
      const hasPS1Signature = content.includes('# SIG # Begin signature block') && content.includes('# SIG # End signature block');
      const hasCMDSignature = content.includes(':: SIG # Begin signature block') && content.includes(':: SIG # End signature block');
      const hasPSVariantSignature = content.includes('# Begin signature block') && content.includes('# End signature block');
      const hasCMDVariantSignature = content.includes(':: Begin signature block') && content.includes(':: End signature block');
      
      // Determine signature type
      let signatureType = null;
      let signatureBlock = '';
      
      if (hasPS1Signature) {
        signatureType = 'PowerShell';
        signatureBlock = this.extractPS1SignatureBlock(content);
      } else if (hasCMDSignature) {
        signatureType = 'CMD';
        signatureBlock = this.extractCMDSignatureBlock(content);
      } else if (hasPSVariantSignature) {
        signatureType = 'PowerShell-Variant';
        signatureBlock = this.extractPS1VariantSignatureBlock(content);
      } else if (hasCMDVariantSignature) {
        signatureType = 'CMD-Variant';
        signatureBlock = this.extractCMDVariantSignatureBlock(content);
      }
      
      // If no signature block found, return invalid
      if (!signatureBlock) {
        return {
          valid: false,
          signatureType: null,
          details: {
            message: 'No signature block found in file'
          }
        };
      }
      
      // Check for certificate and signature markers
      const hasSignatureHeader = signatureBlock.includes('Begin signature block');
      const hasSignatureFooter = signatureBlock.includes('End signature block');
      const hasBase64Content = /[A-Za-z0-9+/=]{20,}/.test(signatureBlock);
      const containsCertificateMarkers = signatureBlock.includes('MII') || 
                                         signatureBlock.includes('CERT') ||
                                         signatureBlock.includes('BEGIN CERTIFICATE');
      
      // Determine validity based on structure
      const valid = hasSignatureHeader && hasSignatureFooter && hasBase64Content;
      const likelyValid = valid && containsCertificateMarkers;
      
      return {
        valid: likelyValid,
        signatureType,
        details: {
          hasSignatureHeader,
          hasSignatureFooter,
          hasBase64Content,
          containsCertificateMarkers,
          signatureBlock
        }
      };
    } catch (err) {
      logger.error('jsign-helper', `Error verifying file structure: ${err}`);
      return {
        valid: false,
        signatureType: null,
        details: {
          error: String(err)
        }
      };
    }
  }
  
  /**
   * Extract PowerShell signature block
   */
  private static extractPS1SignatureBlock(content: string): string {
    const startMarker = '# SIG # Begin signature block';
    const endMarker = '# SIG # End signature block';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return content.substring(startIndex, endIndex + endMarker.length);
    }
    
    return '';
  }
  
  /**
   * Extract CMD signature block
   */
  private static extractCMDSignatureBlock(content: string): string {
    const startMarker = ':: SIG # Begin signature block';
    const endMarker = ':: SIG # End signature block';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return content.substring(startIndex, endIndex + endMarker.length);
    }
    
    return '';
  }
  
  /**
   * Extract PowerShell variant signature block
   */
  private static extractPS1VariantSignatureBlock(content: string): string {
    const startMarker = '# Begin signature block';
    const endMarker = '# End signature block';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return content.substring(startIndex, endIndex + endMarker.length);
    }
    
    return '';
  }
  
  /**
   * Extract CMD variant signature block
   */
  private static extractCMDVariantSignatureBlock(content: string): string {
    const startMarker = ':: Begin signature block';
    const endMarker = ':: End signature block';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return content.substring(startIndex, endIndex + endMarker.length);
    }
    
    return '';
  }
}