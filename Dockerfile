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

# Create writable directories
RUN mkdir -p /app/secure-storage/certs /app/temp /app/data /app/auth-data /app/secure-storage && \
    chmod 777 /app/secure-storage/certs /app/temp /app/data /app/auth-data /app/secure-storage

# Startup script
RUN echo '#!/bin/sh\n\
mkdir -p "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" /app/auth-data "$SECURE_STORAGE_DIR" 2>/dev/null || true\n\
chmod -R 777 "$CERTS_DIR" "$TEMP_DIR" "$DATA_DIR" /app/auth-data "$SECURE_STORAGE_DIR" 2>/dev/null || true\n\
\n\
# Generate admin password if it does not exist\n\
if [ ! -f "$ADMIN_PASSWORD_FILE" ]; then\n\
  # Generate random password (16 chars of alphanumeric)\n\
  ADMIN_PWD=$(cat /dev/urandom | tr -dc "a-zA-Z0-9" | fold -w 16 | head -n 1)\n\
  echo "$ADMIN_PWD" > "$ADMIN_PASSWORD_FILE"\n\
  echo "Generated new admin password: $ADMIN_PWD"\n\
fi\n\
\n\
# Initialize empty admin users file if it does not exist\n\
if [ ! -f "$ADMIN_USERS_FILE" ]; then\n\
  echo "[]" > "$ADMIN_USERS_FILE"\n\
  echo "Initialized empty admin users file"\n\
fi\n\
\n\
# Initialize empty authenticated users file if it does not exist\n\
if [ ! -f "$AUTHENTICATED_USERS_FILE" ]; then\n\
  # Ensure the directory exists\n\
  mkdir -p "$(dirname "$AUTHENTICATED_USERS_FILE")" 2>/dev/null || true\n\
  chmod 777 "$(dirname "$AUTHENTICATED_USERS_FILE")" 2>/dev/null || true\n\
  echo "[]" > "$AUTHENTICATED_USERS_FILE"\n\
  echo "Initialized empty authenticated users file at $AUTHENTICATED_USERS_FILE"\n\
  chmod 666 "$AUTHENTICATED_USERS_FILE" 2>/dev/null || true\n\
fi\n\
\n\
exec node .output/server/index.mjs\n' > /app/start.sh && \
    chmod +x /app/start.sh

# Set env vars
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.1
ENV CERTS_DIR=/app/secure-storage/certs
ENV TEMP_DIR=/app/temp
ENV DATA_DIR=/app/data
ENV SECURE_STORAGE_DIR=/app/secure-storage
ENV ADMIN_PASSWORD_FILE=/app/secure-storage/admin_password.txt
ENV ADMIN_USERS_FILE=/app/data/admin_users.json
ENV AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json

USER signfile

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
