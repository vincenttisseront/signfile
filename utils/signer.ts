import fs from 'fs/promises'
import type { pki as Pki } from 'node-forge'
import logger from '../server/utils/logger'

export async function signScriptWithCert(script: string, certPath: string, password: string): Promise<string> {
  try {
    logger.info('signer', 'Starting signing process...')
    logger.info('signer', `Script length: ${script.length} bytes`)
    logger.info('signer', `Certificate path: ${certPath}`)
  
    // ✅ Import node-forge modules separately with explicit imports
    const forge = await import('node-forge')
    const util = forge.util
    const asn1 = forge.asn1
    const pkcs12 = forge.pkcs12
    const pki = forge.pki
    const md = forge.md

    logger.info('signer', 'node-forge modules imported successfully')

    const pfxBuffer = await fs.readFile(certPath)
    logger.info('signer', `Certificate read, length: ${pfxBuffer.length} bytes`)

    // Convert to forge-compatible binary DER
    const binaryDer = util.createBuffer(new Uint8Array(pfxBuffer))
    logger.info('signer', 'Binary DER buffer created')
    
    const p12Asn1 = asn1.fromDer(binaryDer)
    logger.info('signer', 'ASN1 parsed')
    
    const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, false, password)
    logger.info('signer', 'PKCS12 parsed')

    // Try to extract private key
    const bags = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag })
    logger.info('signer', `Bags retrieved: ${Object.keys(bags).length}`)
    
    let privateKey = bags[pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as Pki.rsa.PrivateKey

    if (!privateKey) {
      logger.info('signer', 'Primary key extraction failed, trying fallback...')
      const fallbackBags = p12.getBags({ bagType: pki.oids.keyBag })
      privateKey = fallbackBags[pki.oids.keyBag]?.[0]?.key as Pki.rsa.PrivateKey
    }

    if (!privateKey) {
      logger.error('signer', 'Private key not found in certificate')
      throw new Error('Private key not found in certificate')
    }
    
    if (typeof privateKey.sign !== 'function') {
      logger.error('signer', 'Invalid private key object, sign method not found')
      throw new Error('Invalid private key object, sign method not found')
    }

    logger.info('signer', 'Private key extracted successfully')
    logger.info('signer', 'Creating digest...')
    
    const digest = md.sha256.create()
    digest.update(script, 'utf8')
    
    logger.info('signer', 'Signing digest...')
    const signature = privateKey.sign(digest)
    const base64Signature = util.encode64(signature)
    logger.info('signer', `Signature created, length: ${base64Signature.length}`)
    
    return base64Signature
  } catch (error) {
    logger.error('signer', `Error in signing process: ${error}`)
    logger.error('signer', `Stack trace: ${(error as Error).stack}`)
    throw error
  }
}
