import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { defineEventHandler } from 'h3'
import logger from '../utils/logger'

/**
 * This diagnostic endpoint tests CMD file signing capabilities.
 * It creates a sample CMD file, signs it, and returns details about the signing process.
 * Use this to verify how Windows recognizes signed CMD files.
 */
export default defineEventHandler(async (event) => {
  logger.info('cmd-sign-test', 'Running CMD file signing diagnostic test');
  
  // Create test directories
  const testDir = path.join(tmpdir(), `cmd-test-${randomUUID()}`);
  await fs.mkdir(testDir, { recursive: true });
  
  // Create a sample CMD script
  const testCmdFile = path.join(testDir, 'test.cmd');
  const testCmdContent = `@echo off
echo This is a test CMD file for signature testing
echo Current date: %date%
echo Current time: %time%
exit /b 0
`;
  
  await fs.writeFile(testCmdFile, testCmdContent);
  logger.info('cmd-sign-test', `Created test CMD file at ${testCmdFile}`);
  
  // Create the dual-format PS1 file
  const testPs1File = path.join(testDir, 'test.ps1');
  const ps1Content = `<# 
:: ---- Windows Script Signature Format ----
:: This format allows proper Authenticode signature recognition in CMD files
@echo off
goto :BatchSection
#>

# PowerShell section for Authenticode signature
# The actual batch code starts after the :BatchSection label
Write-Host "This script contains a dual-format PowerShell/CMD script with Authenticode signature"
exit

<# 
:BatchSection
${testCmdContent}
exit /b
#>`;
  
  await fs.writeFile(testPs1File, ps1Content);
  logger.info('cmd-sign-test', `Created test PS1 file at ${testPs1File}`);
  
  // Check if we have a test certificate for signing
  const testResults = {
    testDir,
    testCmdFile,
    testPs1File,
    cmdContent: testCmdContent,
    ps1Content: ps1Content,
    jsignAvailable: false,
    jsignVersion: '',
    signingAttempted: false,
    signingResult: false,
    signingOutput: '',
    signingError: '',
    finalFileSize: 0,
    containsSignatureBlock: false
  };
  
  // Check jsign availability
  try {
    const jsignVersionProc = spawn('jsign', ['--version']);
    let jsignVersion = '';
    
    jsignVersionProc.stdout.on('data', (data) => {
      jsignVersion += data.toString();
    });
    
    await new Promise<void>((resolve) => {
      jsignVersionProc.on('close', (code) => {
        testResults.jsignAvailable = code === 0;
        testResults.jsignVersion = jsignVersion.trim();
        logger.info('cmd-sign-test', `jsign version: ${jsignVersion.trim()}`);
        resolve();
      });
    });
  } catch (jsignErr) {
    logger.error('cmd-sign-test', `Error checking jsign: ${jsignErr}`);
    testResults.jsignAvailable = false;
    testResults.signingError = `Failed to check jsign: ${jsignErr}`;
  }
  
  // Look for a test certificate in the certs directory
  const certsDir = process.env.CERTS_DIR || '/certs';
  let testCertPath = '';
  
  try {
    const certFiles = await fs.readdir(certsDir);
    const pfxFiles = certFiles.filter(f => f.toLowerCase().endsWith('.pfx') || f.toLowerCase().endsWith('.p12'));
    
    if (pfxFiles.length > 0) {
      testCertPath = path.join(certsDir, pfxFiles[0]);
      logger.info('cmd-sign-test', `Found test certificate: ${testCertPath}`);
    }
  } catch (certErr) {
    logger.error('cmd-sign-test', `Error finding certificates: ${certErr}`);
  }
  
  // Attempt signing if we have jsign and a certificate
  if (testResults.jsignAvailable && testCertPath) {
    testResults.signingAttempted = true;
    
    // Try with a default test password (this is just for diagnostic purposes)
    const testPassword = 'password';
    
    try {
      const jsignArgs = [
        '--storetype', 'PKCS12',
        '--keystore', testCertPath,
        '--storepass', testPassword,
        '--tsaurl', 'http://timestamp.digicert.com',
        '--alg', 'SHA-256',
        '--name', 'Test Script',
        testPs1File
      ];
      
      const jsignProc = spawn('jsign', jsignArgs);
      let stdout = '';
      let stderr = '';
      
      jsignProc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      jsignProc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      await new Promise<void>((resolve) => {
        jsignProc.on('close', (code) => {
          testResults.signingResult = code === 0;
          testResults.signingOutput = stdout;
          testResults.signingError = stderr;
          logger.info('cmd-sign-test', `Signing result: ${code === 0 ? 'Success' : 'Failed'}`);
          resolve();
        });
      });
      
      // If signing succeeded, check if the file contains a signature block
      if (testResults.signingResult) {
        const signedContent = await fs.readFile(testPs1File, 'utf8');
        testResults.containsSignatureBlock = signedContent.includes('SIG # Begin signature block');
        testResults.finalFileSize = signedContent.length;
      }
    } catch (signErr) {
      logger.error('cmd-sign-test', `Error during signing test: ${signErr}`);
      testResults.signingError = `Error during signing: ${signErr}`;
    }
  }
  
  // Clean up test files
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (cleanErr) {
    logger.error('cmd-sign-test', `Error cleaning up: ${cleanErr}`);
  }
  
  return {
    timestamp: new Date().toISOString(),
    diagnosticType: 'cmd-sign-test',
    jsignVersion: testResults.jsignVersion,
    jsignAvailable: testResults.jsignAvailable,
    testResults
  };
});