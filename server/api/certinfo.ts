import { readFile } from 'fs/promises'
import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { defineEventHandler, readBody } from 'h3'

// Define the structure of the certificate info response
interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  ca: boolean;
  type: string;
  rootCA?: string;
  keyUsage?: string[];
  extendedKeyUsage?: string[];
  fingerprint?: string;
  metadata?: {
    uploadedBy: string;
    uploadedAt: string;
    notes: string;
  };
  error?: string;
}

export default defineEventHandler(async (event): Promise<CertificateInfo | { error: string }> => {
  try {
    // Handle both GET and POST methods
    let name: string | null = null;
    let password: string | null = null;
    
    if (event.req.method === 'GET') {
      const url = new URL(event.req.url || '', 'http://localhost');
      name = url.searchParams.get('name');
      password = url.searchParams.get('password');
    } else if (event.req.method === 'POST') {
      const body = await readBody(event);
      name = body.certName;
      password = body.password;
    }

    // Validate inputs
    if (!name || !/^[\w.\-]+$/.test(name)) {
      return { error: 'Invalid certificate name.' };
    }
    
    // Get certificate path
    const certDir = process.env.CERTS_DIR || '/certs';
    const certPath = path.join(certDir, name);
    
    // Check if file exists
    try {
      await fs.access(certPath);
    } catch (err) {
      return { error: `Certificate file not found: ${name}` };
    }
    
    // Determine certificate type based on extension
    const certType = name.toLowerCase().endsWith('.pfx') ? 'pfx' : 'pem';
    const isPfx = certType === 'pfx';
    
    // If it's a PFX file, we need a password
    if (isPfx && !password) {
      return { error: 'Password is required for PFX certificates.' };
    }
    
    // Create temp file for operations
    const baseTempDir = process.env.TEMP_DIR || tmpdir();
    const tmpPemPath = path.join(baseTempDir, `cert-${randomUUID()}.pem`);
    
    try {
      // Extract PEM from PFX if needed
      if (isPfx) {
        await new Promise((resolve, reject) => {
          const args = [
            'pkcs12',
            '-in', certPath,
            '-clcerts',
            '-nokeys',
            '-passin', `pass:${password}`,
            '-out', tmpPemPath
          ];
          const proc = spawn('openssl', args);
          
          let errorOutput = '';
          proc.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });
          
          proc.on('close', code => {
            if (code === 0) {
              resolve(null);
            } else {
              if (errorOutput.includes('mac verify error')) {
                reject(new Error('Invalid password for certificate'));
              } else {
                reject(new Error(`openssl pkcs12 failed: ${errorOutput.trim() || 'Unknown error'}`));
              }
            }
          });
          proc.on('error', reject);
        });
      } else {
        // For PEM files, just copy to temp location
        await fs.copyFile(certPath, tmpPemPath);
      }
      
      // Extract certificate info
      const info = await new Promise<CertificateInfo>((resolve, reject) => {
        const proc = spawn('openssl', [
          'x509', '-in', tmpPemPath,
          '-noout', '-subject', '-issuer', '-dates', '-serial', '-fingerprint', '-text'
        ]);
        
        let out = '';
        proc.stdout.on('data', chunk => (out += chunk.toString()));
        
        proc.on('close', () => {
          console.log('[certinfo] openssl x509 output received');
          
          // Extract certificate fields
          let subject = out.match(/subject=([^\n]+)/)?.[1]?.trim() || '';
          let issuer = out.match(/issuer=([^\n]+)/)?.[1]?.trim() || '';
          const validFrom = out.match(/notBefore=([^\n]+)/)?.[1]?.trim() || '';
          const validTo = out.match(/notAfter=([^\n]+)/)?.[1]?.trim() || '';
          const serialNumber = out.match(/serial=([^\n]+)/)?.[1]?.trim() || '';
          const fingerprint = out.match(/SHA1 Fingerprint=([^\n]+)/)?.[1]?.trim() || '';
          const ca = /CA:TRUE/i.test(out);
          
          // Extract CN for easier display
          let subjectCN = '';
          const cnMatch = subject.match(/CN\s*=\s*([^,/]+)/);
          if (cnMatch) {
            subjectCN = cnMatch[1].trim();
          }
          
          // Extract root CA info (issuer CN)
          let rootCA = '';
          const issuerCNMatch = issuer.match(/CN\s*=\s*([^,/]+)/);
          if (issuerCNMatch) {
            rootCA = issuerCNMatch[1].trim();
          }
          
          // Extract key usage if available
          const keyUsageMatch = out.match(/X509v3 Key Usage:[\s\n]+(.*?)(?:\n\n|\n[^\s])/s);
          const keyUsage = keyUsageMatch ? 
            keyUsageMatch[1].split(',').map(u => u.trim()).filter(Boolean) : [];
          
          // Extract extended key usage if available
          const extKeyUsageMatch = out.match(/X509v3 Extended Key Usage:[\s\n]+(.*?)(?:\n\n|\n[^\s])/s);
          const extendedKeyUsage = extKeyUsageMatch ? 
            extKeyUsageMatch[1].split(',').map(u => u.trim()).filter(Boolean) : [];
          
          // Fallback if subject/issuer extraction failed
          if (!subject) {
            const subjectLine = out.match(/Subject: ([^\n]+)/i)?.[1] || '';
            const cn = subjectLine.match(/CN\s*=\s*([^,]+)/)?.[1] || '';
            if (cn) subject = `CN=${cn}`;
          }
          
          const result: CertificateInfo = { 
            subject,
            issuer, 
            validFrom, 
            validTo, 
            serialNumber, 
            ca,
            rootCA,
            type: isPfx ? 'PFX/PKCS#12' : 'PEM',
            keyUsage,
            extendedKeyUsage,
            fingerprint
          };
          
          // Try to load metadata if available
          try {
            const metadataDir = process.env.CERT_METADATA_DIR || 
              path.join(process.env.DATA_DIR || '/app/data', 'cert-metadata');
            const metadataPath = path.join(metadataDir, `${name}.json`);
            
            // Check if metadata file exists
            fs.access(metadataPath)
              .then(() => fs.readFile(metadataPath, 'utf-8'))
              .then(content => {
                const metadata = JSON.parse(content);
                result.metadata = metadata;
                resolve(result);
              })
              .catch(() => {
                // Proceed without metadata
                resolve(result);
              });
          } catch {
            // Proceed without metadata
            resolve(result);
          }
        });
        
        let errorOutput = '';
        proc.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        proc.on('error', (err) => {
          reject(new Error(`OpenSSL error: ${err.message} - ${errorOutput}`));
        });
      });

      // Clean up temp file
      await fs.rm(tmpPemPath, { force: true }).catch(() => {
        console.warn('[certinfo] Failed to delete temporary PEM file');
      });
      
      return info;
    } catch (e) {
      console.error('[certinfo] error:', e);
      return { error: e instanceof Error ? e.message : 'Unable to extract certificate info.' };
    } finally {
      // Ensure temp file is cleaned up
      try {
        await fs.rm(tmpPemPath, { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (e) {
    console.error('[certinfo] Unhandled error:', e);
    return { error: 'Internal server error processing certificate' };
  }
});
