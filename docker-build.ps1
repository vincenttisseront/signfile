#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

# Configuration
$IMAGE_NAME = "signfile"
$IMAGE_TAG = "1.0.7"
$CONTAINER_NAME = "competent_turing"

Write-Host "🔨 Building SignFile Docker image..." -ForegroundColor Cyan
docker build -t "$IMAGE_NAME:$IMAGE_TAG" .

Write-Host "🧼 Stopping and removing existing container (if exists)..." -ForegroundColor Cyan
docker stop $CONTAINER_NAME 2>$null
docker rm $CONTAINER_NAME 2>$null

Write-Host "📦 Creating Docker volumes if they don't exist..." -ForegroundColor Cyan
docker volume create signfile-secure | Out-Null
docker volume create signfile-data | Out-Null
docker volume create signfile-auth-users | Out-Null

Write-Host "🚀 Starting new SignFile container..." -ForegroundColor Cyan
docker run -d `
  --name $CONTAINER_NAME `
  -p 3000:3000 `
  -v signfile-secure:/app/secure-storage `
  -v signfile-data:/app/data `
  -v signfile-auth-users:/app/auth-data `
  -e AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json `
  -e CERTS_DIR=/app/secure-storage/certs `
  -e ADMIN_PASSWORD_FILE=/app/secure-storage/admin_password.txt `
  "$IMAGE_NAME:$IMAGE_TAG"

Write-Host "⏳ Waiting for container readiness..." -ForegroundColor Cyan
$MAX_ATTEMPTS = 30
$attempt = 0
$containerReady = $false

while (-not $containerReady -and $attempt -lt $MAX_ATTEMPTS) {
    $attempt++
    Write-Host "🔍 Attempt $attempt/$MAX_ATTEMPTS..."
    
    $containerRunning = docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" --format "{{.Names}}" | Out-String
    if ($containerRunning -match $CONTAINER_NAME) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                $containerReady = $true
                Write-Host "✅ SignFile is now running at http://localhost:3000" -ForegroundColor Green
            }
        } catch {
            Write-Host "↻ Not ready yet, retrying..."
            Start-Sleep -Seconds 1
        }
    } else {
        Write-Host "❌ Container failed to start. Logs:" -ForegroundColor Red
        docker logs $CONTAINER_NAME
        exit 1
    }
}

if (-not $containerReady) {
    Write-Host "❌ Application not responding after $MAX_ATTEMPTS attempts." -ForegroundColor Red
    docker logs $CONTAINER_NAME
    exit 1
}

# Show admin password
Write-Host "`n🔐 Admin password from container:" -ForegroundColor Cyan
docker exec $CONTAINER_NAME cat /app/secure-storage/admin_password.txt

# Verify important files
Write-Host "`n📁 Verifying persistent data..." -ForegroundColor Cyan
docker exec $CONTAINER_NAME mkdir -p /app/secure-storage/certs 2>$null
$secureFilesExist = docker exec $CONTAINER_NAME ls -la /app/secure-storage
$authFilesExist = docker exec $CONTAINER_NAME ls -la /app/auth-data
$certsDirExists = docker exec $CONTAINER_NAME ls -la /app/secure-storage/certs

if ($secureFilesExist -match "admin_password.txt" -and $authFilesExist -match "authenticated_users.json") {
    Write-Host "✔ Data files are present and accessible" -ForegroundColor Green

    # Validate JSON in authenticated_users.json
    $authUsersContent = docker exec $CONTAINER_NAME cat /app/auth-data/authenticated_users.json
    if ($authUsersContent -match "^\s*\[\s*(\]|\{)") {
        Write-Host "✔ Authenticated users file contains valid JSON" -ForegroundColor Green
    } else {
        Write-Host "⚠ Invalid JSON in authenticated users file, resetting..." -ForegroundColor Yellow
        docker exec $CONTAINER_NAME sh -c "echo '[]' > /app/auth-data/authenticated_users.json"
        docker exec $CONTAINER_NAME chmod 666 /app/auth-data/authenticated_users.json
    }

    # Check admin password
    docker exec $CONTAINER_NAME test -f /app/secure-storage/admin_password.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Admin password missing, regenerating..." -ForegroundColor Yellow
        $randomPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
        docker exec $CONTAINER_NAME sh -c "echo '$randomPassword' > /app/secure-storage/admin_password.txt"
        docker exec $CONTAINER_NAME chmod 666 /app/secure-storage/admin_password.txt
        Write-Host "✔ New admin password created." -ForegroundColor Green
    } else {
        Write-Host "✔ Admin password file is present." -ForegroundColor Green
    }

    # Check certs directory perms
    $certsDirPerms = docker exec $CONTAINER_NAME ls -ld /app/secure-storage/certs
    if ($certsDirPerms -match "drwxrwxrwx" -or $certsDirPerms -match "777") {
        Write-Host "✔ Certificates directory permissions are correct" -ForegroundColor Green
    } else {
        Write-Host "⚠ Fixing certificates directory permissions..." -ForegroundColor Yellow
        docker exec $CONTAINER_NAME chmod 777 /app/secure-storage/certs
    }
} else {
    Write-Host "⚠ Some critical files may be missing. See logs." -ForegroundColor Yellow
}

# Summary
Write-Host "`n📦 Volume Summary:" -ForegroundColor Cyan
Write-Host " - Secure storage: signfile-secure ➜ /app/secure-storage" -ForegroundColor Yellow
Write-Host " - Certificate dir: /app/secure-storage/certs" -ForegroundColor Yellow
Write-Host " - Admin password: /app/secure-storage/admin_password.txt" -ForegroundColor Yellow
Write-Host " - Application data: signfile-data ➜ /app/data" -ForegroundColor Yellow
Write-Host " - Auth users: signfile-auth-users ➜ /app/auth-data" -ForegroundColor Yellow

Write-Host "`n🎉 Setup complete! Access the app at http://localhost:3000" -ForegroundColor Green
Write-Host "📜 Use the admin password above to log in." -ForegroundColor Green
