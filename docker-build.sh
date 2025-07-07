#!/bin/bash

# Exit on any error
set -e

# Configuration
IMAGE_NAME="signfile"
IMAGE_TAG="1.0.7"
CONTAINER_NAME="competent_turing"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "\e[36m🔨 Building SignFile Docker image...\e[0m"
docker build -t ${FULL_IMAGE_NAME} .

echo -e "\e[36m🧼 Stopping and removing existing container (if exists)...\e[0m"
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo -e "\e[36m📦 Creating Docker volumes if they don't exist...\e[0m"
docker volume create signfile-secure >/dev/null
docker volume create signfile-data >/dev/null
docker volume create signfile-auth-users >/dev/null

echo -e "\e[36m🚀 Starting new SignFile container...\e[0m"
docker run -d \
  --name ${CONTAINER_NAME} \
  -p 3000:3000 \
  -v signfile-secure:/app/secure-storage \
  -v signfile-data:/app/data \
  -v signfile-auth-users:/app/auth-data \
  -e AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json \
  -e CERTS_DIR=/app/secure-storage/certs \
  -e ADMIN_PASSWORD_FILE=/app/secure-storage/admin_password.txt \
  -e LOG_LEVEL=info \
  ${FULL_IMAGE_NAME}

echo -e "\e[36m⏳ Waiting for container readiness...\e[0m"
MAX_ATTEMPTS=30
attempt=0
containerReady=false

while [ "$containerReady" = false ] && [ $attempt -lt $MAX_ATTEMPTS ]; do
    ((attempt++))
    echo -e "🔍 Attempt $attempt/$MAX_ATTEMPTS..."
    
    # Check if container is running
    containerRunning=$(docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" --format "{{.Names}}" | grep -c $CONTAINER_NAME || true)
    
    if [ $containerRunning -eq 1 ]; then
        # First, try the basic health endpoint
        if curl -s -f http://localhost:3000/api/basic-health -m 2 >/dev/null; then
            echo -e "\e[32m✅ Health check endpoint is responding\e[0m"
            containerReady=true
        else
            # If basic health check fails, try the regular health endpoint
            if curl -s -f http://localhost:3000/api/health -m 2 >/dev/null; then
                echo -e "\e[32m✅ Health endpoint is responding\e[0m"
                containerReady=true
            else
                echo -e "↻ Not ready yet, retrying..."
                sleep 2
            fi
        fi
    else
        echo -e "\e[31m❌ Container failed to start or is not running. Logs:\e[0m"
        docker logs ${CONTAINER_NAME}
        
        # Check if container exists but is unhealthy or exited
        containerStatus=$(docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Status}}" || echo "Unknown")
        echo -e "\e[33mContainer status: $containerStatus\e[0m"
        
        if [ -f "$debugDir/node-startup.log" ]; then
            echo -e "\e[33m--- Node application startup log: ---\e[0m"
            cat "$debugDir/node-startup.log" | while read line; do echo -e "\e[90m$line\e[0m"; done
        fi
        
        echo -e "\e[33mDiagnostic logs saved to ./$debugDir/ directory\e[0m"
        
        exit 1
    fi
done

if [ "$containerReady" = false ]; then
    echo -e "\e[31m❌ Application not responding after $MAX_ATTEMPTS attempts.\e[0m"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

# Show admin password
echo -e "\n\e[36m🔐 Admin password from container:\e[0m"
docker exec ${CONTAINER_NAME} cat /app/secure-storage/admin_password.txt

# Verify important files
echo -e "\n\e[36m📁 Verifying persistent data...\e[0m"
docker exec ${CONTAINER_NAME} mkdir -p /app/secure-storage/certs 2>/dev/null || true

secureFilesExist=$(docker exec ${CONTAINER_NAME} ls -la /app/secure-storage)
authFilesExist=$(docker exec ${CONTAINER_NAME} ls -la /app/auth-data)

# Check certificates directory exists and show its contents
echo -e "\e[36m📂 Certificate directory contents:\e[0m"
docker exec ${CONTAINER_NAME} ls -la /app/secure-storage/certs

# Check for required files
if echo "$secureFilesExist" | grep -q "admin_password.txt" && echo "$authFilesExist" | grep -q "authenticated_users.json"; then
    echo -e "\e[32m✔ Data files are present and accessible\e[0m"

    # Validate JSON in authenticated_users.json
    authUsersContent=$(docker exec ${CONTAINER_NAME} cat /app/auth-data/authenticated_users.json)
    if echo "$authUsersContent" | grep -qE '^\s*\[\s*(\]|\{)'; then
        echo -e "\e[32m✔ Authenticated users file contains valid JSON\e[0m"
    else
        echo -e "\e[33m⚠ Invalid JSON in authenticated users file, resetting...\e[0m"
        docker exec ${CONTAINER_NAME} sh -c "echo '[]' > /app/auth-data/authenticated_users.json"
        docker exec ${CONTAINER_NAME} chmod 666 /app/auth-data/authenticated_users.json
    fi

    # Check admin password
    if ! docker exec ${CONTAINER_NAME} test -f /app/secure-storage/admin_password.txt; then
        echo -e "\e[33m⚠ Admin password missing, regenerating...\e[0m"
        randomPassword=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
        docker exec ${CONTAINER_NAME} sh -c "echo '$randomPassword' > /app/secure-storage/admin_password.txt"
        docker exec ${CONTAINER_NAME} chmod 666 /app/secure-storage/admin_password.txt
        echo -e "\e[32m✔ New admin password created.\e[0m"
    else
        echo -e "\e[32m✔ Admin password file is present.\e[0m"
    fi

    # Check certs directory perms
    certsDirPerms=$(docker exec ${CONTAINER_NAME} ls -ld /app/secure-storage/certs)
    if echo "$certsDirPerms" | grep -q "drwxrwxrwx" || echo "$certsDirPerms" | grep -q "777"; then
        echo -e "\e[32m✔ Certificates directory permissions are correct\e[0m"
    else
        echo -e "\e[33m⚠ Fixing certificates directory permissions...\e[0m"
        docker exec ${CONTAINER_NAME} chmod 777 /app/secure-storage/certs
    fi
else
    echo -e "\e[33m⚠ Some critical files may be missing. See logs.\e[0m"
fi

# Summary
echo -e "\n\e[36m📦 Volume Summary:\e[0m"
echo -e "\e[33m - Secure storage: signfile-secure ➜ /app/secure-storage\e[0m"
echo -e "\e[33m - Certificate dir: /app/secure-storage/certs\e[0m"
echo -e "\e[33m - Admin password: /app/secure-storage/admin_password.txt\e[0m"
echo -e "\e[33m - Application data: signfile-data ➜ /app/data\e[0m"
echo -e "\e[33m - Auth users: signfile-auth-users ➜ /app/auth-data\e[0m"

echo -e "\n\e[32m🎉 Setup complete!\e[0m"
echo -e "\e[32m📱 Development: Access the app at http://localhost:3000\e[0m"
echo -e "\e[32m🌐 Production: Access the app at https://signfile.ibanfirst.lan\e[0m"
echo -e "\e[32m📜 Use the admin password above to log in.\e[0m"

