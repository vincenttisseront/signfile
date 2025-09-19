# ---------- OS BASE LAYER ----------
FROM harbor.ibanfirst.tech/base/node@sha256:4a4884e8a44826194dff92ba316264f392056cbe243dcc9fd3551e71cea02b90 AS base
WORKDIR /app

# ---------- JSIGN LAYER ----------
FROM base AS jsign
ARG JSIGN_VERSION=7.2
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
    ca-certificates openjdk-17-jre-headless openssl curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    openssl version && \
    which openssl

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
  [ -f node_modules/@esbuild/linux-x64/bin/esbuild ] && chmod +x node_modules/@esbuild/linux-x64/bin/esbuild || true
ENV NODE_ENV=production
RUN npm run build
RUN chmod +x .output/server/index.mjs

# ---------- RUNTIME LAYER ----------
FROM runtime-deps AS runtime
WORKDIR /app

# Create app user early (before COPY --chown) - check if GID/UID exists first
RUN if getent group 1000 >/dev/null; then \
      groupadd signfile; \
    else \
      groupadd -g 1000 signfile || groupadd signfile; \
    fi && \
    if getent passwd 1000 >/dev/null; then \
      useradd -g signfile -d /app -m -s /bin/sh signfile; \
    else \
      useradd -u 1000 -g signfile -d /app -m -s /bin/sh signfile || useradd -g signfile -d /app -m -s /bin/sh signfile; \
    fi

# App runtime files with correct ownership
COPY --chown=signfile:signfile --from=build /app/.output/ ./.output/
COPY --chown=signfile:signfile --from=build /app/composables/ ./composables/
COPY --chown=signfile:signfile --from=build /app/server/ ./server/
COPY --chown=signfile:signfile --from=deps /app/node_modules/ ./node_modules/
COPY --chown=signfile:signfile --from=deps /app/package*.json ./
COPY --chown=signfile:signfile --from=deps /app/.env ./.env
COPY --chown=signfile:signfile --from=jsign /usr/local/bin/jsign /usr/local/bin/
COPY --chown=signfile:signfile --from=jsign /usr/local/bin/jsign.jar /usr/local/bin/

# Create writable directories and ensure proper ownership
# Create each directory and set permissions separately for better error isolation
RUN set -e; \
    mkdir -p /app/secure-storage/certs; \
    mkdir -p /app/temp; \
    mkdir -p /app/data; \
    mkdir -p /app/auth-data; \
    # Ensure signfile user owns app directories
    chown -R signfile:signfile /app; \
    # Set relaxed permissions on data directories for compatibility
    chmod -R 755 /app/secure-storage; \
    chmod -R 755 /app/temp; \
    chmod -R 755 /app/data; \
    chmod -R 755 /app/auth-data; \
    # Special write permissions for key directories
    chmod 777 /app/secure-storage/certs; \
    chmod 777 /app/temp; \
    chmod 777 /app/data; \
    chmod 777 /app/auth-data

# Copy startup scripts from workspace to container
COPY --chown=signfile:signfile start.sh /app/start.sh
COPY --chown=signfile:signfile entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/start.sh /app/entrypoint.sh

# Set env vars
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.2
ENV LOG_LEVEL=info

# Set directories and paths (non-sensitive)
ENV CERTS_DIR=/app/secure-storage/certs
ENV TEMP_DIR=/app/temp
ENV DATA_DIR=/app/data
ENV SECURE_STORAGE_DIR=/app/secure-storage

# Define file paths (marked as non-secrets as they're just paths, not content)
# DOCKER_IGNORE_PATHS=true
ENV ADMIN_PASSWORD_FILE=/app/secure-storage/admin_password.txt
ENV ADMIN_USERS_FILE=/app/data/admin_users.json
ENV AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json
# DOCKER_IGNORE_PATHS=false

USER signfile

EXPOSE 3000

# No health check defined - container will always be considered healthy
# This ensures the container stays up even if the URL or ports change

# Entrypoint script is already copied above - no need to generate it here

# Use the wrapper script as entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
