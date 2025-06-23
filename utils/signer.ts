import fs from 'fs/promises'
import type { pki as Pki } from 'node-forge'

export async function signScriptWithCert(script: string, certPath: string, password: string): Promise<string> {
  // ✅ Use modular import to avoid 'undefined' errors in Vite/Nitro
  const { util, asn1, pkcs12, pki, md } = await import('node-forge')

  const pfxBuffer = await fs.readFile(certPath)

  // Convert to forge-compatible binary DER
  const binaryDer = util.createBuffer(new Uint8Array(pfxBuffer))
  const p12Asn1 = asn1.fromDer(binaryDer)
  const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, false, password)

  // Try to extract private key
  const bags = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag })
  let privateKey = bags[pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as Pki.rsa.PrivateKey

  if (!privateKey) {
    const fallbackBags = p12.getBags({ bagType: pki.oids.keyBag })
    privateKey = fallbackBags[pki.oids.keyBag]?.[0]?.key as Pki.rsa.PrivateKey
  }

  if (!privateKey || typeof privateKey.sign !== 'function') {
    throw new Error('Private key not found or invalid.')
  }

  const digest = md.sha256.create()
  digest.update(script, 'utf8')

  const signature = util.encode64(privateKey.sign(digest))
  return signature
}
