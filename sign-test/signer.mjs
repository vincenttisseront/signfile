import fs from 'fs/promises';
import util from 'node:util';
import { exec as execCb } from 'node:child_process';
const exec = util.promisify(execCb);

async function testSigner() {
  console.log('Testing signer module...');
  
  // Create a simple test script
  const testScript = ;
  await fs.writeFile('test-script.ps1', testScript);
  
  // Create a test certificate
  console.log('Creating test certificate...');
  await exec('openssl req -x509 -newkey rsa:2048 -keyout test-key.pem -out test-cert.pem -days 1 -nodes -subj "/CN=TestCert/O=Test/C=FR"');
  await exec('openssl pkcs12 -export -out test-cert.pfx -inkey test-key.pem -in test-cert.pem -passout pass:test123');
  
  try {
    // Node-forge is used for signing in the application
    console.log('Testing node-forge...');
    const { util, asn1, pkcs12, pki, md } = await import('node-forge');
    console.log('Node-forge modules loaded');
    
    // Read the certificate
    const pfxBuffer = await fs.readFile('test-cert.pfx');
    console.log('Certificate read, length:', pfxBuffer.length);
    
    // Parse the certificate
    const binaryDer = util.createBuffer(new Uint8Array(pfxBuffer));
    console.log('Binary DER created');
    const p12Asn1 = asn1.fromDer(binaryDer);
    console.log('ASN1 parsed');
    const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, false, 'test123');
    console.log('PKCS12 parsed');
    
    // Extract the private key
    const bags = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag });
    console.log('Bags retrieved:', Object.keys(bags).length);
    let privateKey = bags[pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
    
    if (!privateKey) {
      console.log('Trying fallback key extraction...');
      const fallbackBags = p12.getBags({ bagType: pki.oids.keyBag });
      privateKey = fallbackBags[pki.oids.keyBag]?.[0]?.key;
    }
    
    console.log('Private key found:', !!privateKey);
    
    if (!privateKey || typeof privateKey.sign !== 'function') {
      throw new Error('Private key not found or invalid');
    }
    
    // Create a digest
    const digest = md.sha256.create();
    digest.update(testScript, 'utf8');
    console.log('Digest created');
    
    // Sign the digest
    const signature = privateKey.sign(digest);
    console.log('Signature created, length:', signature.length);
    
    // Base64 encode the signature
    const base64Sig = util.encode64(signature);
    console.log('Base64 signature:', base64Sig.substring(0, 20) + '...');
    
    // Create the final signed script
    const signedScript = testScript + '\n\n# SIG # Begin signature block\n' + base64Sig + '\n# SIG # End signature block';
    await fs.writeFile('signed-script.ps1', signedScript);
    console.log('Signed script created successfully');
    
    return { success: true };
  } catch (err) {
    console.error('Error in test:', err);
    console.error('Stack trace:', err.stack);
    return { success: false, error: err.message, stack: err.stack };
  }
}

// Run the test
testSigner().then(result => {
  console.log('Test complete, result:', result);
}).catch(err => {
  console.error('Test failed:', err);
});
