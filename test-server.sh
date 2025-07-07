#!/bin/bash
# This script tests the Node.js application directly without Docker to help diagnose issues

LOG_DIR="./test-logs"
mkdir -p "$LOG_DIR"

echo "=== Testing Node.js application outside of container ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"

# Check if .output directory exists
if [ -d ".output" ]; then
  echo "✓ .output directory exists"
  ls -la .output | head -n 10
else
  echo "✗ .output directory missing!"
  exit 1
fi

# Check if server entry point exists
if [ -f ".output/server/index.mjs" ]; then
  echo "✓ Server entry point exists"
else
  echo "✗ Server entry point missing!"
  exit 1
fi

# Check environment variables
echo ""
echo "=== Environment Variables ==="
echo "NODE_ENV=${NODE_ENV:-not set}"
echo "LOG_LEVEL=${LOG_LEVEL:-not set}"

# Set necessary environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export NITRO_HOST=${NITRO_HOST:-0.0.0.0}
export LOG_LEVEL=${LOG_LEVEL:-debug}

# Create empty directories for testing
mkdir -p ./test-secure-storage/certs ./test-temp ./test-data ./test-auth-data

# Set environment variables for directories
export CERTS_DIR=./test-secure-storage/certs
export TEMP_DIR=./test-temp
export DATA_DIR=./test-data
export SECURE_STORAGE_DIR=./test-secure-storage
export ADMIN_PASSWORD_FILE=./test-secure-storage/admin_password.txt
export ADMIN_USERS_FILE=./test-data/admin_users.json
export AUTHENTICATED_USERS_FILE=./test-auth-data/authenticated_users.json

# Log directory settings
echo ""
echo "=== Test Directories ==="
echo "CERTS_DIR=$CERTS_DIR"
echo "TEMP_DIR=$TEMP_DIR" 
echo "DATA_DIR=$DATA_DIR"
echo "SECURE_STORAGE_DIR=$SECURE_STORAGE_DIR"

# Create admin password file if it doesn't exist
if [ ! -f "$ADMIN_PASSWORD_FILE" ]; then
  echo "Creating admin password file..."
  echo "testpassword" > "$ADMIN_PASSWORD_FILE"
fi

# Create admin users file if it doesn't exist
if [ ! -f "$ADMIN_USERS_FILE" ]; then
  echo "Creating admin users file..."
  echo "[]" > "$ADMIN_USERS_FILE"
fi

# Create authenticated users file if it doesn't exist
mkdir -p "$(dirname "$AUTHENTICATED_USERS_FILE")"
if [ ! -f "$AUTHENTICATED_USERS_FILE" ]; then
  echo "Creating authenticated users file..."
  echo "[]" > "$AUTHENTICATED_USERS_FILE"
fi

# Run a quick test of the server
echo ""
echo "=== Starting server for 10 seconds to test it ==="
echo "Server logs will be in $LOG_DIR/server.log"

# Create a simple server check script
echo "console.log('Testing Node.js runtime');" > "$LOG_DIR/check.js"
if node "$LOG_DIR/check.js" 2>/dev/null; then
  echo "✓ Node.js runtime test passed"
else
  echo "✗ Node.js runtime test failed!"
  echo "Please check Node.js installation"
  exit 1
fi

# Start the server in the background
echo "Starting server..."
node .output/server/index.mjs > "$LOG_DIR/server.log" 2>&1 &
PID=$!

# Check if process is actually running
if ps -p $PID > /dev/null; then
  echo "✓ Server process started with PID $PID"
else
  echo "✗ Failed to start server process!"
  cat "$LOG_DIR/server.log"
  exit 1
fi

# Wait a bit for the server to start
echo "Waiting for server to initialize..."
sleep 5

# Test the health endpoints with multiple attempts
echo ""
echo "=== Testing endpoints ==="

MAX_ATTEMPTS=5
attempt=1
alive_success=false

while [ $attempt -le $MAX_ATTEMPTS ] && [ "$alive_success" = false ]; do
  echo "Attempt $attempt of $MAX_ATTEMPTS for /api/alive..."
  if curl -s -f http://localhost:3000/api/alive -o "$LOG_DIR/alive-response.json" 2>/dev/null; then
    echo "✓ /api/alive endpoint responded successfully"
    echo "Response:"
    cat "$LOG_DIR/alive-response.json"
    alive_success=true
  else
    echo "✗ /api/alive attempt $attempt failed, retrying..."
    sleep 2
    ((attempt++))
  fi
done

if [ "$alive_success" = false ]; then
  echo "✗ All attempts to reach /api/alive failed!"
  echo "Server logs:"
  cat "$LOG_DIR/server.log"
  
  # Don't exit - try the other endpoint
fi

# Try the basic-health endpoint
if curl -s -f http://localhost:3000/api/basic-health -o "$LOG_DIR/health-response.json" 2>/dev/null; then
  echo "✓ /api/basic-health endpoint responded successfully"
  echo "Response:"
  cat "$LOG_DIR/health-response.json"
else
  echo "✗ /api/basic-health endpoint failed!"
fi

# Wait a bit more then stop the server
echo "Test complete, stopping server..."
sleep 2
kill $PID 2>/dev/null || echo "Server process already terminated"

# Check for any error messages in the log
echo ""
echo "=== Checking server logs for errors ==="
if grep -i "error" "$LOG_DIR/server.log" | grep -v "errordomain" > "$LOG_DIR/errors.txt"; then
  error_count=$(wc -l < "$LOG_DIR/errors.txt")
  echo "⚠ Found $error_count potential error messages in the log:"
  cat "$LOG_DIR/errors.txt" | head -n 10
  if [ $error_count -gt 10 ]; then
    echo "... and $(($error_count - 10)) more errors (see $LOG_DIR/errors.txt)"
  fi
else
  echo "✓ No obvious errors found in logs"
fi

echo ""
echo "=== Test complete ==="
echo "Check $LOG_DIR/server.log for full details"
echo "All test artifacts saved to $LOG_DIR directory"
