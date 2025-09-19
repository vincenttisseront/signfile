<template>
  <div class="p-8 md:p-10 max-w-4xl mx-auto">
    <header class="mb-6">
      <h1 class="font-extrabold text-security font-sans text-2xl md:text-3xl">
        Signature Verification
      </h1>
    </header>
    
    <div class="grid md:grid-cols-2 gap-6">
      <div class="col-span-1">
        <VerifyForm />
      </div>
      
      <div class="col-span-1">
        <SignatureVerifier />
      </div>
    </div>
    
    <div class="mt-12 p-6 bg-security/5 rounded-xl border border-security/10 shadow-sm">
      <h2 class="font-semibold text-lg text-modernity mb-4">Understanding PowerShell Signatures</h2>
      
      <div class="prose prose-sm">
        <h3 class="text-security">Why macOS does not detect PowerShell signatures</h3>
        <p>PowerShell scripts use a different signature system than macOS:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <strong>Authenticode vs. Apple Code Signing</strong>: PowerShell scripts are signed with Authenticode (Microsoft), 
            while macOS uses its own Apple signature system.
          </li>
          <li>
            <strong>Signature embedded in text</strong>: The PowerShell signature is embedded directly in the script file's text, 
            in a special block starting with <code># SIG # Begin signature block</code>.
          </li>
          <li>
            <strong>Specific verification</strong>: To verify a PowerShell signature, you must use PowerShell itself 
            or tools compatible with Authenticode (like the one used on this page).
          </li>
        </ul>
        
        <h3 class="text-security mt-4">How to verify a PowerShell signature</h3>
        <p>On Windows with PowerShell:</p>
        <pre class="bg-security/5 p-2 rounded text-xs overflow-auto">Get-AuthenticodeSignature -FilePath script.ps1</pre>
        
        <p>Our tool checks:</p>
        <ol class="list-decimal pl-6 space-y-1">
          <li>The presence of the PowerShell signature block</li>
          <li>The cryptographic validity of the signature using Authenticode-compatible tools</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen } = useLayout();
</script>
