#!/bin/sh
# Entrypoint wrapper script to keep container running even if start.sh fails

# Create diagnostic directory
mkdir -p /tmp/startup-debug 2>/dev/null || true
chmod 777 /tmp/startup-debug 2>/dev/null || true
echo "$(date '+%Y-%m-%d %H:%M:%S') - Entrypoint started" > /tmp/startup-debug/entrypoint.log

# Run the main start script and capture its exit code
/app/start.sh
EXIT_CODE=$?

# If start.sh fails, keep the container running for diagnostics
if [ $EXIT_CODE -ne 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Main script failed with exit code $EXIT_CODE" >> /tmp/startup-debug/entrypoint.log
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting diagnostic server to keep container running" >> /tmp/startup-debug/entrypoint.log
  # Create a simple HTTP server to respond to basic requests
  echo "const http=require('http'); const server=http.createServer((req,res) => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'error',
      message: 'Main container process failed with exit code $EXIT_CODE',
      time: '$(date '+%Y-%m-%d %H:%M:%S')',
      diagnostic: true,
      path: req.url
    }));
  }); 
  console.log('[ENTRYPOINT] Main process failed. Running diagnostic server on port 3000');
  server.listen(3000, '0.0.0.0');" > /tmp/diagnostic-server.js
  # Execute the diagnostic server
  exec node /tmp/diagnostic-server.js
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Main script exited normally with code $EXIT_CODE" >> /tmp/startup-debug/entrypoint.log
fi
