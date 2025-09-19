# Example-Script-Signed.ps1
# Ce script est un exemple pour tester la vérification de signature PowerShell
# Contient un bloc de signature simulé à titre d'exemple

function Get-SystemInfo {
    <#
    .SYNOPSIS
        Récupère des informations système de base
    .DESCRIPTION
        Ce script recueille des informations de base sur le système et les affiche
    .EXAMPLE
        .\Example-Script-Signed.ps1
    #>
    
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $procInfo = Get-CimInstance Win32_Processor
    $computerSystem = Get-CimInstance Win32_ComputerSystem
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    
    [PSCustomObject]@{
        ComputerName = $env:COMPUTERNAME
        OSName = $osInfo.Caption
        OSVersion = $osInfo.Version
        OSBuild = $osInfo.BuildNumber
        Processor = $procInfo.Name
        Memory = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)
        User = $user.Name
        TimeStamp = Get-Date
    }
}

Write-Host "Démarrage de l'analyse système..." -ForegroundColor Cyan
$systemInfo = Get-SystemInfo
Write-Host "Informations système:" -ForegroundColor Green
$systemInfo | Format-List

Write-Host "Script terminé." -ForegroundColor Cyan

# SIG # Begin signature block
# MIIFuQYJKoZIhvcNAQcCoIIFqjCCBaYCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUKU9BEWj3hyHTGchR5BjALw6Y
# ySWgggM+MIIDOjCCAiKgAwIBAgIQeL7oNzPr8T+VYi2DI/AkSTANBgkqhkiG9w0B
# AQsFADAjMSEwHwYDVQQDDBhFeGFtcGxlIENvZGUgU2lnbmluZyBDZXJ0MB4XDTIz
# MDIyMzIwMDAwMFoXDTI0MDIyMzIwMDAwMFowIzEhMB8GA1UEAwwYRXhhbXBsZSBD
# b2RlIFNpZ25pbmcgQ2VydDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
# ALNYX4R3xOhC1m5OQM9JYmvT7zRiuiQMgvfItnXiYqGij5lfJNfUzeuO5uJFH5ri
# LRmCKP2cIkuMX+G0X+oGz+Z/7dY+WaaA4bMcMLvhBIeQEGDV4AbFukUwkLvEmb0+
# I3cLsE1vCwCJQHEj6U4UUuXrCz2mY3vF/DQVPNnMO85+73MyxhHLNYQOR6fcwqp+
# J7h09X3JApwI38nTrVxj6qQYlK1I42d79TYzJHPRQEDKW7wECxRYoWfIL7xM5t2e
# KVMbHXrfXTkiQhDhvdmuVLbYEYjcsq1LjXHwRvmimVNgRBKf0xoNEEY6okT1upBF
# LOoITrhJnBYBHwvxbHLAXlUCAwEAAaNGMEQwDgYDVR0PAQH/BAQDAgeAMBMGA1Ud
# JQQMMAoGCCsGAQUFBwMDMB0GA1UdDgQWBBT/dR7jk0QZ92fYzKMxyr3k5HYjhDAN
# BgkqhkiG9w0BAQsFAAOCAQEAqDdXKuHr7YRUvcSK2kZxSh/f5JqgAKPMMKqcnSVq
# ZxkFvyNBYGzrAT7GXLv9QCI2FP0vGp+MggJhgSuGOPmP0Ij6CnOiWEZOxNP45AXc
# mVGHOiOxJO9SL5n9iXOYGLdmrEMdPCuPdvJQeQxRxvLsVXJGpDzNrpdtnOTEnhSj
# ZO1SVnUSSQvTpnNjYYCe9kKMEw8+yFzUQOe0Z3v+yB9DoYKQC2XuJ9eBLuk0fsmm
# f0jPmP5kCKRwKP7qw5qC42V84XQZicQvXSy+hHgkVOsicrwi5hOBs8a0gMTX/sWA
# CMYePF0aorYM8OIkFZLAp473niSJpuHCBmkH7xaOeDT88zGCAdkwggHVAgEBMDcw
# IzEhMB8GA1UEAwwYRXhhbXBsZSBDb2RlIFNpZ25pbmcgQ2VydAIQeL7oNzPr8T+V
# Yi2DI/AkSTAJBgUrDgMCGgUAoHgwGAYKKwYBBAGCNwIBDDEKMAigAoAAoQKAADAZ
# BgkqhkiG9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgorBgEEAYI3AgELMQ4wDAYKKwYB
# BAGCNwIBFTAjBgkqhkiG9w0BCQQxFgQUQVv7Es3gDkgu9Z7XQlI3CvM+LM0wDQYJ
# KoZIhvcNAQEBBQAEggEAVT13guHBCgAnGIhpTCgIlFbJ+8Oa8lm7xIVLjYpkQ7u1
# +L8JuEG3cN7rvFr0DWbzr+Z3T11qMtMp7jCW4Bxe0B/0x2bIsNF3IhWZBWyuG4G8
# ZBwFqZ2Lk89iqYyCLO2nIgO5VFj+ZDgTqJDHN5mTuX3wpZrMq0Tnuu6W8vIetAb+
# Tgf39XoYOA3MVXeS8zGJH8y5PVJcSdnItFB95YrCpNZ2TKQs4ZpUoWW8/C9k8Bvy
# f2p9LmnOX6+G9PJj4iDhNL1PzP0qMsA1xvk9HjpP3FpPO8bu2Db+Z9Wqv1ogvdSs
# CQWX+J/zcHjJPOT7BZ/LxQXb1zD8nSV0OxqN+jJEig==
# SIG # End signature block