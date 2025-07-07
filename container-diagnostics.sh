#!/bin/bash

# This script will check container health and gather diagnostics on Ubuntu
# Usage: ./container-diagnostics.sh [container_name]

CONTAINER_NAME="${1:-competent_turing}"
LOGS_DIR="debug-logs"

echo -e "\e[36m🔍 Container Diagnostics for $CONTAINER_NAME\e[0m"

# Create logs directory
mkdir -p "$LOGS_DIR"

# Check if container exists and its status
if docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    STATUS=$(docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Status}}")
    echo -e "\e[36mContainer status:\e[0m $STATUS"
    
    # Check if container is running
    if docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        echo -e "\e[32m✅ Container is running\e[0m"
        
        # Check health status
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "health status not available")
        echo -e "\e[36mHealth status:\e[0m $HEALTH"
        
        # Try health endpoints
        echo -e "\n\e[36mTesting endpoints:\e[0m"
        
        echo -n "Basic health endpoint: "
        if curl -s -f http://localhost:3000/api/basic-health -m 2 > "$LOGS_DIR/basic-health.json" 2>/dev/null; then
            echo -e "\e[32mOK\e[0m"
            cat "$LOGS_DIR/basic-health.json" | jq . 2>/dev/null || cat "$LOGS_DIR/basic-health.json"
        else
            echo -e "\e[31mFAILED\e[0m"
        fi
        
        echo -n "Full health endpoint: "
        if curl -s -f http://localhost:3000/api/health -m 2 > "$LOGS_DIR/health.json" 2>/dev/null; then
            echo -e "\e[32mOK\e[0m"
            cat "$LOGS_DIR/health.json" | jq . 2>/dev/null || cat "$LOGS_DIR/health.json"
        else
            echo -e "\e[31mFAILED\e[0m"
        fi
    else
        echo -e "\e[31m❌ Container is not running\e[0m"
    fi
    
    # Get container logs
    echo -e "\n\e[36mContainer logs:\e[0m"
    docker logs "$CONTAINER_NAME" > "$LOGS_DIR/container.log" 2>&1
    tail -n 20 "$LOGS_DIR/container.log"
    echo -e "\n\e[90mFull logs saved to $LOGS_DIR/container.log\e[0m"
    
    # Copy debug logs from container
    echo -e "\n\e[36mCopying debug logs from container:\e[0m"
    docker cp "$CONTAINER_NAME:/tmp/startup-debug/." "$LOGS_DIR/" 2>/dev/null
    
    # List and show debug logs
    echo -e "\n\e[36mAvailable debug logs:\e[0m"
    find "$LOGS_DIR" -type f | sort
    
    # Check important files
    echo -e "\n\e[36mChecking important files:\e[0m"
    
    for dir in "/app/secure-storage" "/app/secure-storage/certs" "/app/data" "/app/auth-data"; do
        echo -n "Directory $dir: "
        if docker exec "$CONTAINER_NAME" test -d "$dir" 2>/dev/null; then
            echo -e "\e[32mExists\e[0m"
            docker exec "$CONTAINER_NAME" ls -la "$dir" > "$LOGS_DIR/dir_$(echo "$dir" | tr '/' '_').txt" 2>&1
            echo -e "\e[90mContents saved to $LOGS_DIR/dir_$(echo "$dir" | tr '/' '_').txt\e[0m"
        else
            echo -e "\e[31mMissing\e[0m"
        fi
    done
    
    # Check file permissions
    echo -e "\n\e[36mImportant file permissions:\e[0m"
    for file in "/app/secure-storage/admin_password.txt" "/app/auth-data/authenticated_users.json"; do
        docker exec "$CONTAINER_NAME" ls -la "$file" 2>/dev/null || echo "$file not found"
    done
    
    # Check environment variables
    echo -e "\n\e[36mEnvironment variables:\e[0m"
    docker exec "$CONTAINER_NAME" env | grep -v PASSWORD | grep -v SECRET | sort > "$LOGS_DIR/environment.txt"
    cat "$LOGS_DIR/environment.txt"
    
    echo -e "\n\e[32m✅ Diagnostics completed\e[0m"
    echo -e "\e[90mAll logs saved to $LOGS_DIR/\e[0m"
else
    echo -e "\e[31m❌ Container '$CONTAINER_NAME' does not exist\e[0m"
fi

