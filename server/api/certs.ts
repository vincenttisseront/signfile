import fs from 'fs/promises'
import path from 'path'
import { H3Event, defineEventHandler } from 'h3'
import forge from 'node-forge'
import logger from '../utils/logger'

// Define response types for better type safety
interface CertResponse {
  certificates?: Array<{
    name: string;
    metadata?: {
      uploadedBy: string;
      uploadedAt: string;
      notes: string;
    }
  }>;
  error?: string;
  ok?: boolean;
  fileName?: string;
}

// Helper function to ensure directories exist
async function ensureDirectories(...dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o777 });
    } catch (err) {
      logger.warn('certs.ts', `Warning creating directory ${dir}:`, err);
      // Continue execution - directory might already exist
    }
  }
}

export default defineEventHandler(async (event: H3Event): Promise<CertResponse> => {
  logger.info('certs.ts', 'API called:', event.req.method, event.req.url)
  
  // Get configured directories from environment with fallbacks
  const certDir = process.env.CERTS_DIR || '/certs'
  const metadataDir = process.env.CERT_METADATA_DIR || path.join(process.env.DATA_DIR || '/app/data', 'cert-metadata')
  
  // Ensure directories exist on startup
  await ensureDirectories(certDir, metadataDir)

  if (event.req.method === 'DELETE') {
    // Remove a certificate
    const url = new URL(event.req.url || '', 'http://localhost')
    const name = url.searchParams.get('name')
    
    // Improved validation with more explicit error messages
    if (!name) {
      return { error: 'Certificate name is required.' }
    }
    
    // Strict validation to prevent path traversal or unwanted characters
    if (!/^[\w.\-]+$/.test(name)) {
      return { error: 'Invalid certificate name. Only alphanumeric characters, dots, and hyphens are allowed.' }
    }
    
    const certPath = path.join(certDir, name)
    const metadataPath = path.join(metadataDir, `${name}.json`)
    
    try {
      // Check if certificate exists before attempting to delete
      try {
        await fs.access(certPath)
      } catch (err) {
        return { error: `Certificate "${name}" not found.` }
      }
      
      // Delete the certificate
      await fs.unlink(certPath)
      logger.info('certs.ts', 'Deleted cert:', certPath)
      
      // Try to delete metadata if it exists (but don't fail if it doesn't)
      try {
        await fs.unlink(metadataPath)
        logger.info('certs.ts', 'Deleted cert metadata:', metadataPath)
      } catch (metaErr) {
        // No action needed if metadata doesn't exist
        logger.info('certs.ts', 'No metadata found for deleted cert:', name)
      }
      
      return { ok: true }
    } catch (e) {
      logger.error('certs.ts', 'Failed to delete cert:', certPath, e)
      return { error: `Failed to remove certificate: ${(e as Error).message}` }
    }
  }
  if (event.req.method === 'POST') {
    // Handle certificate upload
    try {
      // Use formidable to parse multipart form - import dynamically
      const formidable = (await import('formidable')).default
      
      // Configure formidable with better security options
      const form = formidable({ 
        multiples: false,
        uploadDir: certDir,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        allowEmptyFiles: false,
        filter: (part) => {
          // Only allow specific file extensions
          if (part.name === 'certificate') {
            const originalName = part.originalFilename || '';
            return originalName.endsWith('.pfx') || originalName.endsWith('.pem');
          }
          return true; // Allow other form fields
        }
      });
      
      // Parse the form with proper typing for Promise
      return await new Promise<CertResponse>((resolve) => {
        form.parse(event.req, async (err, fields, files) => {
          // Handle parsing errors
          if (err) {
            console.error('[certs.ts] Form parsing error:', err);
            return resolve({ error: `Failed to parse upload: ${err.message}` });
          }
          
          // Get certificate file from upload
          const certFile = files.certificate?.[0];
          if (!certFile) {
            return resolve({ error: 'No certificate uploaded.' });
          }
          
          // Validate certificate filename
          let fileName = fields.saveName?.[0] || certFile.originalFilename || certFile.newFilename || '';
          fileName = path.basename(fileName); // Strip any path components for security
          
          // Ensure the filename only contains safe characters
          if (!/^[\w.\-]+$/.test(fileName)) {
            // Clean up temp file
            await fs.unlink(certFile.filepath).catch(e => console.error('Failed to clean up temp file:', e));
            return resolve({ error: 'Invalid filename. Only alphanumeric characters, dots, and hyphens are allowed.' });
          }
          
          // Enforce file extension
          if (!fileName.endsWith('.pfx') && !fileName.endsWith('.pem')) {
            fileName += '.pfx'; // Default to PFX if no valid extension
          }
          
          const destPath = path.join(certDir, fileName);
          
          try {
            // Move file from temp location to final destination
            await fs.copyFile(certFile.filepath, destPath);
            await fs.unlink(certFile.filepath).catch(e => console.error('Failed to clean up temp file:', e));
            
            // Extract and sanitize metadata
            const username = sanitizeInput(fields.username?.[0]) || 'Unknown user';
            const notes = sanitizeInput(fields.notes?.[0]) || '';
            
            // Save metadata with certificate
            const metadata = {
              uploadedBy: username,
              uploadedAt: new Date().toISOString(),
              notes: notes
            };
            
            const metadataPath = path.join(metadataDir, `${fileName}.json`);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            
            logger.info('certs.ts', 'Saved cert:', destPath, 'with metadata');
            resolve({ ok: true, fileName });
          } catch (e) {
            logger.error('certs.ts', 'Failed to save cert:', destPath, e);
            resolve({ error: `Failed to save certificate: ${(e as Error).message}` });
          }
        });
      });
    } catch (e) {
      logger.error('certs.ts', 'Unexpected error in POST handler:', e);
      return { error: 'Server error processing certificate upload.' };
    }
  }
  // Default case: GET - List certificates
  try {
    // Get certificate files
    let files: string[];
    try {
      files = await fs.readdir(certDir);
    } catch (err) {
      console.error('[certs.ts] Error reading certificate directory:', err);
      // If directory doesn't exist or is inaccessible, return empty list
      return { certificates: [] };
    }
    
    // Filter for valid certificate files
    const certFiles = files.filter(f => f.endsWith('.pfx') || f.endsWith('.pem'));
    
    // Build response with metadata and parsed cert info
    const certs = [];
    for (const certFile of certFiles) {
      const cert: any = { name: certFile };
      // Try to parse certificate info
      try {
        const certPath = path.join(certDir, certFile);
        const fileBuf = await fs.readFile(certPath);
        let parsed = null;
        if (certFile.endsWith('.pfx')) {
          // Try to parse PFX (PKCS#12)
          try {
            const p12Asn1 = forge.asn1.fromDer(fileBuf.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '');
            // Try to get the first cert bag
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = bags[forge.pki.oids.certBag]?.[0];
            if (certBag && certBag.cert) {
              parsed = certBag.cert;
            }
          } catch (e) {
            // Could not parse PFX, leave parsed null
          }
        } else if (certFile.endsWith('.pem')) {
          try {
            const pem = fileBuf.toString('utf8');
            parsed = forge.pki.certificateFromPem(pem);
          } catch (e) {
            // Could not parse PEM
          }
        }
        if (parsed) {
          cert.subject = parsed.subject?.attributes?.map((a: any) => `${a.shortName}=${a.value}`).join(', ');
          cert.issuer = parsed.issuer?.attributes?.map((a: any) => `${a.shortName}=${a.value}`).join(', ');
          cert.validFrom = parsed.validity?.notBefore?.toISOString?.() || null;
          cert.validTo = parsed.validity?.notAfter?.toISOString?.() || null;
          cert.serialNumber = parsed.serialNumber || null;
        }
      } catch (parseErr) {
        // Ignore parse errors, just log
        console.error(`[certs.ts] Failed to parse cert info for ${certFile}:`, parseErr);
      }
      // Metadata
      try {
        const metadataPath = path.join(metadataDir, `${certFile}.json`);
        if (await fileExists(metadataPath)) {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          try {
            const metadata = JSON.parse(metadataContent);
            cert.metadata = {
              uploadedBy: metadata.uploadedBy || 'Unknown',
              uploadedAt: metadata.uploadedAt || new Date().toISOString(),
              notes: metadata.notes || ''
            };
          } catch (parseErr) {
            cert.metadata = {
              uploadedBy: 'Unknown (metadata corrupt)',
              uploadedAt: new Date().toISOString(),
              notes: 'Metadata file was corrupted'
            };
          }
        }
      } catch (metaErr) {
        // Continue without metadata
      }
      certs.push(cert);
    }
    
    logger.info('certs.ts', 'Listing certs:', certs.length);
    return { certificates: certs };
  } catch (e) {
    logger.error('certs.ts', 'Failed to list certs:', e);
    return { 
      certificates: [],
      error: `Error listing certificates: ${(e as Error).message}`
    };
  }
})

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// Helper function to sanitize user input
function sanitizeInput(input: string | undefined): string {
  if (!input) return '';
  // Remove HTML tags and limit string length
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
    .slice(0, 1000); // Limit length for safety
}
