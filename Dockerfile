# ---------- OS BASE LAYER ----------
FROM harbor.ibanfirst.tech/base/node@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS base
WORKDIR /app

# ---------- JSIGN LAYER ----------
FROM base AS jsign
ARG JSIGN_VERSION=7.1
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    wget ca-certificates openjdk-17-jre-headless && \
    wget -O /usr/local/bin/jsign-${JSIGN_VERSION}.jar https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar && \
    ln -sf /usr/local/bin/jsign-${JSIGN_VERSION}.jar /usr/local/bin/jsign.jar && \
    echo '#!/bin/sh\nexec java -jar /usr/local/bin/jsign.jar "$@"' > /usr/local/bin/jsign && \
    chmod +x /usr/local/bin/jsign && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ---------- RUNTIME DEPENDENCIES ----------
FROM base AS runtime-deps
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates openjdk-17-jre-headless openssl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ---------- LIBRARY LAYER (node_modules) ----------
FROM base AS deps
COPY package.json package-lock.json* ./ 
COPY .env .env
RUN test -s .env || (echo 'ERROR: .env file missing or empty!' && exit 1)
RUN npm ci --prefer-offline --no-audit

# ---------- APP BUILD LAYER ----------
FROM deps AS build
COPY . .
COPY --from=jsign /usr/local/bin/jsign /usr/local/bin/
COPY --from=jsign /usr/local/bin/jsign.jar /usr/local/bin/
RUN chmod +x node_modules/.bin/nuxt && \
    chmod +x node_modules/@esbuild/linux-x64/bin/esbuild
ENV NODE_ENV=production
RUN npm run build
RUN chmod +x .output/server/index.mjs

# ---------- RUNTIME LAYER ----------
FROM runtime-deps AS runtime
WORKDIR /app

# Create app user early (before COPY --chown)
RUN addgroup --system signfile && \
    adduser --system --ingroup signfile --home /app --disabled-password signfile

# App runtime files with correct ownership
COPY --chown=signfile:signfile --from=build /app/.output/ ./.output/
COPY --chown=signfile:signfile --from=build /app/composables/ ./composables/
COPY --chown=signfile:signfile --from=deps /app/node_modules/ ./node_modules/
COPY --chown=signfile:signfile --from=deps /app/package*.json ./
COPY --chown=signfile:signfile --from=deps /app/.env ./.env
COPY --chown=signfile:signfile --from=jsign /usr/local/bin/jsign /usr/local/bin/
COPY --chown=signfile:signfile --from=jsign /usr/local/bin/jsign.jar /usr/local/bin/

# Create writable directories and ensure proper ownership
RUN mkdir -p /app/secure-storage/certs /app/temp /app/data /app/auth-data /app/secure-storage /tmp/startup-debug && \
    chmod -R 777 /app/secure-storage /app/temp /app/data /app/auth-data /tmp/startup-debug && \
    chown -R signfile:signfile /app/secure-storage /app/temp /app/data /app/auth-data /tmp/startup-debug

# Startup script
RUN echo '#!/bin/sh\n\
echo "[STARTUP] SignFile container starting up..."\n\
echo "[STARTUP] Creating required directories..."\n\
mkdir -p "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" /app/auth-data "$SECURE_STORAGE_DIR" 2>/dev/null || echo "[STARTUP] Warning: Error creating directories"\n\
chmod -R 777 "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" /app/auth-data "$SECURE_STORAGE_DIR" 2>/dev/null || echo "[STARTUP] Warning: Error setting permissions"\n\
\n\
# Generate admin password if it does not exist\n\
if [ ! -f "$ADMIN_PASSWORD_FILE" ]; then\n\
  echo "[STARTUP] Admin password file not found, generating new password..."\n\
  # Generate random password (16 chars of alphanumeric)\n\
  ADMIN_PWD=$(cat /dev/urandom | tr -dc "a-zA-Z0-9" | fold -w 16 | head -n 1)\n\
  echo "$ADMIN_PWD" > "$ADMIN_PASSWORD_FILE"\n\
  echo "[STARTUP] Generated new admin password: $ADMIN_PWD"\n\
  chmod 600 "$ADMIN_PASSWORD_FILE" 2>/dev/null || echo "[STARTUP] Warning: Could not set admin password file permissions"\n\
else\n\
  echo "[STARTUP] Using existing admin password file"\n\
fi\n\
\n\
# Initialize empty admin users file if it does not exist\n\
if [ ! -f "$ADMIN_USERS_FILE" ]; then\n\
  echo "[STARTUP] Creating admin users file..."\n\
  echo "[]" > "$ADMIN_USERS_FILE"\n\
  echo "[STARTUP] Initialized empty admin users file"\n\
else\n\
  echo "[STARTUP] Using existing admin users file"\n\
fi\n\
\n\
# Initialize empty authenticated users file if it does not exist\n\
if [ ! -f "$AUTHENTICATED_USERS_FILE" ]; then\n\
  echo "[STARTUP] Creating authenticated users file..."\n\
  # Ensure the directory exists\n\
  mkdir -p "$(dirname "$AUTHENTICATED_USERS_FILE")" 2>/dev/null || echo "[STARTUP] Warning: Error creating auth directory"\n\
  chmod 777 "$(dirname "$AUTHENTICATED_USERS_FILE")" 2>/dev/null || echo "[STARTUP] Warning: Error setting auth directory permissions"\n\
  echo "[]" > "$AUTHENTICATED_USERS_FILE"\n\
  echo "[STARTUP] Initialized empty authenticated users file at $AUTHENTICATED_USERS_FILE"\n\
  chmod 666 "$AUTHENTICATED_USERS_FILE" 2>/dev/null || echo "[STARTUP] Warning: Error setting auth file permissions"\n\
else\n\
  echo "[STARTUP] Using existing authenticated users file"\n\
fi\n\
\n\
# Check if jsign is available\n\
if command -v jsign >/dev/null 2>&1; then\n\
  echo "[STARTUP] JSign found at $(which jsign)"\n\
else\n\
  echo "[STARTUP] WARNING: JSign not found in PATH!"\n\
fi\n\
\n\
echo "[STARTUP] Environment: NODE_ENV=$NODE_ENV"\n\
echo "[STARTUP] Log level: $LOG_LEVEL"\n\
\n\
# Create simple log directory for debugging even if Node.js fails to start\n\
mkdir -p /tmp/startup-debug 2>/dev/null || true\n\
chmod 777 /tmp/startup-debug 2>/dev/null || true\n\
DATE_TIME=$(date "+%Y-%m-%d %H:%M:%S")\n\
echo "$DATE_TIME - Starting container" > /tmp/startup-debug/startup.log\n\
echo "$DATE_TIME - Container user: $(whoami)" >> /tmp/startup-debug/startup.log\n\
env | grep -v PASSWORD | grep -v SECRET | sort >> /tmp/startup-debug/startup.log\n\
ls -la /app >> /tmp/startup-debug/startup.log 2>&1\n\
echo "NODE_PATH=$NODE_PATH" >> /tmp/startup-debug/startup.log\n\
echo "PATH=$PATH" >> /tmp/startup-debug/startup.log\n\
\n\
# Super basic directory check to avoid potential issues\n\
echo "[STARTUP] Checking critical directories..."\n\
for dir in "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" "$SECURE_STORAGE_DIR" "/app/auth-data"; do\n\
  mkdir -p "$dir" 2>/dev/null || echo "[STARTUP] Warning: could not create $dir"\n\
  chmod -R 777 "$dir" 2>/dev/null || echo "[STARTUP] Warning: could not chmod $dir"\n\
  echo "[STARTUP] Verified directory: $dir"\n\
done\n\
\n\
echo "[STARTUP] Starting Nuxt server..."\n\
# Try to start the server in a way that captures errors to a log file\n\
mkdir -p /tmp/startup-debug 2>/dev/null || echo "[STARTUP] Warning: Could not create log directory"\n\
chmod 777 /tmp/startup-debug 2>/dev/null || echo "[STARTUP] Warning: Could not set log directory permissions"\n\
exec node .output/server/index.mjs 2>&1 | tee -a /tmp/startup-debug/server.log\n' > /app/start.sh && \
    chmod +x /app/start.sh

# Set env vars
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.1
ENV LOG_LEVEL=debug
ENV CERTS_DIR=/app/secure-storage/certs
ENV TEMP_DIR=/app/temp
ENV DATA_DIR=/app/data
ENV SECURE_STORAGE_DIR=/app/secure-storage
ENV ADMIN_PASSWORD_FILE=/app/secure-storage/admin_password.txt
ENV ADMIN_USERS_FILE=/app/data/admin_users.json
ENV AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json

USER signfile

EXPOSE 3000

# Use a more robust health check with multiple endpoint fallbacks
# Container health check must use localhost:3000 because it's checking from inside the container
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/basic-health || wget -q -O - http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]
