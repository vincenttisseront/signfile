#!/bin/sh
# Entrypoint wrapper script to keep container running even if start.sh fails

# Run the main start script and capture its exit code
/app/start.sh
EXIT_CODE=$?

# If start.sh fails, keep the container running for diagnostics
if [ $EXIT_CODE -ne 0 ]; then
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
  server.listen(3000, '0.0.0.0');" > /tmp/diagnostic-server.js
  # Execute the diagnostic server
  exec node /tmp/diagnostic-server.js
fi
