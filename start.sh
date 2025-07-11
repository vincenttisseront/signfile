#!/bin/sh

echo "[STARTUP] securityconsole container starting up..."
echo "[STARTUP] Creating required directories..."
mkdir -p "$TEMP_DIR" "$DATA_DIR" /app/auth-data 2>/dev/null || echo "[STARTUP] Warning: Error creating directories"
chmod -R 777 "$TEMP_DIR" "$DATA_DIR" /app/auth-data 2>/dev/null || echo "[STARTUP] Warning: Error setting permissions"

# Check if jsign is available
if command -v jsign >/dev/null 2>&1; then
  echo "[STARTUP] JSign found at $(which jsign)"
else
  echo "[STARTUP] WARNING: JSign not found in PATH!"
fi

echo "[STARTUP] Environment: NODE_ENV=$NODE_ENV"
echo "[STARTUP] Log level: $LOG_LEVEL"

# Create simple log directory for debugging even if Node.js fails to start
mkdir -p /tmp/startup-debug 2>/dev/null || true
chmod 777 /tmp/startup-debug 2>/dev/null || true
DATE_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo "$DATE_TIME - Starting container" > /tmp/startup-debug/startup.log
echo "$DATE_TIME - Container user: $(whoami)" >> /tmp/startup-debug/startup.log
env | grep -v PASSWORD | grep -v SECRET | sort >> /tmp/startup-debug/startup.log
ls -la /app >> /tmp/startup-debug/startup.log 2>&1
echo "NODE_PATH=$NODE_PATH" >> /tmp/startup-debug/startup.log
echo "PATH=$PATH" >> /tmp/startup-debug/startup.log

# Super basic directory check to avoid potential issues
echo "[STARTUP] Checking critical directories..."
for dir in "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" "$SECURE_STORAGE_DIR" "/app/auth-data"; do
  mkdir -p "$dir" 2>/dev/null || echo "[STARTUP] Warning: could not create $dir"
  chmod -R 777 "$dir" 2>/dev/null || echo "[STARTUP] Warning: could not chmod $dir"
  echo "[STARTUP] Verified directory: $dir"
done

echo "[STARTUP] Starting Nuxt server..."
# Ensure logs directory exists with correct permissions
mkdir -p /tmp/startup-debug 2>/dev/null || true
chmod -R 777 /tmp/startup-debug 2>/dev/null || true
touch /tmp/startup-debug/startup.log 2>/dev/null || true
touch /tmp/startup-debug/server.log 2>/dev/null || true
chmod 666 /tmp/startup-debug/*.log 2>/dev/null || true

# Check if output directory and server file exist
if [ -d ".output" ]; then
  echo "[STARTUP] .output directory exists" >> /tmp/startup-debug/startup.log
  ls -la .output >> /tmp/startup-debug/startup.log 2>&1 || true
else
  echo "[STARTUP] ERROR: .output directory missing!" >> /tmp/startup-debug/startup.log
  # Try to recover by creating minimal structure
  mkdir -p .output/server 2>/dev/null || true
fi

if [ -f ".output/server/index.mjs" ]; then
  echo "[STARTUP] Server entry point exists" >> /tmp/startup-debug/startup.log
  ls -la .output/server/index.mjs >> /tmp/startup-debug/startup.log 2>&1 || true
else
  echo "[STARTUP] ERROR: Server entry point missing!" >> /tmp/startup-debug/startup.log
  # Create fallback server file that just logs the error
  mkdir -p .output/server 2>/dev/null || true
  echo "console.log('[ERROR] Server entry point was missing, running fallback server'); const http=require('http'); const server=http.createServer((req,res) => {res.writeHead(200); res.end(JSON.stringify({status:'fallback',error:'Server files missing'}))}); server.listen(3000, '0.0.0.0');" > .output/server/index.mjs 2>/dev/null || echo "[STARTUP] ERROR: Could not create fallback server!"
  chmod +x .output/server/index.mjs 2>/dev/null || true
  echo "[STARTUP] Created fallback server" >> /tmp/startup-debug/startup.log
fi

# Check node executable
which node >> /tmp/startup-debug/startup.log 2>&1 || echo "[STARTUP] ERROR: Node not found in PATH" >> /tmp/startup-debug/startup.log
node --version >> /tmp/startup-debug/startup.log 2>&1 || echo "[STARTUP] ERROR: Could not get Node.js version" >> /tmp/startup-debug/startup.log

# Create a basic server check file that doesn't depend on the main app
echo "console.log('Server check - Node.js is working');" > /tmp/startup-debug/check.js 2>/dev/null || true
node /tmp/startup-debug/check.js >> /tmp/startup-debug/startup.log 2>&1 || echo "[STARTUP] ERROR: Node.js runtime test failed!" >> /tmp/startup-debug/startup.log

# Start the server with extensive logging and error catching
echo "[STARTUP] Executing: node .output/server/index.mjs" >> /tmp/startup-debug/startup.log
echo "[STARTUP] If server fails, container will continue running for diagnostics" >> /tmp/startup-debug/startup.log
node .output/server/index.mjs >> /tmp/startup-debug/server.log 2>&1 || (
  echo "[STARTUP] ERROR: Server crashed, starting fallback server to keep container running" >> /tmp/startup-debug/startup.log && 
  echo "const http=require('http'); const server=http.createServer((req,res) => {res.writeHead(500); res.end(JSON.stringify({status:'error',message:'Server crashed'}))}); console.log('[ERROR] Running fallback error server on port 3000'); server.listen(3000, '0.0.0.0');" > /tmp/fallback-server.js && 
  exec node /tmp/fallback-server.js
)
