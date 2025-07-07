$filePath = "c:\Users\vti\OneDrive - iBanFirst\Work in progress\Dev\SignFile\components\Admin.vue"
$content = Get-Content $filePath -Raw

# Replace console.log statements with comments
$pattern = '^\s*console\.log\(.*\);.*$'
$newContent = $content -replace $pattern, '// Debug logging removed'

# Replace .then(() => console.log(...)) statements
$pattern = '\.then\(\(\) => console\.log\(.*\)\)'
$newContent = $newContent -replace $pattern, '.then(() => {})'

# Save the file
$newContent | Set-Content $filePath

Write-Host "Console logs removed from Admin.vue"
