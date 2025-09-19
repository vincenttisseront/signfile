# Example-Script.ps1
# Ce script est un exemple pour tester la vérification de signature PowerShell

function Get-SystemInfo {
    <#
    .SYNOPSIS
        Récupère des informations système de base
    .DESCRIPTION
        Ce script recueille des informations de base sur le système et les affiche
    .EXAMPLE
        .\Example-Script.ps1
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

# Ce bloc de commentaire explique que ce fichier devrait normalement contenir une signature
# Un script correctement signé aurait un bloc comme celui-ci à la fin:
#
# # SIG # Begin signature block
# # MIIFuQYJKoZIhvcNAQcCoIIFqjCCBaYCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# # gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# # AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUKU9BEWj3hyHTGchR5BjALw6Y
# # ySWgggM+MIIDOjCCAiKgAwIBAgIQeL...
# # ...
# # # SIG # End signature block