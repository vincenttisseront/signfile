# ---------- OS BASE LAYER ----------
FROM harbor.ibanfirst.tech/base/node@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS base
WORKDIR /app

# ---------- RUNTIME DEPENDENCIES ----------
FROM base AS runtime-deps
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates openssl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ---------- LIBRARY LAYER (node_modules) ----------
FROM base AS deps
COPY package.json package-lock.json* ./ 
COPY entrypoint.sh /app/entrypoint.sh
COPY .env .env
RUN test -s .env || (echo 'ERROR: .env file missing or empty!' && exit 1)
RUN npm ci --prefer-offline --no-audit

# ---------- APP BUILD LAYER ----------
FROM deps AS build
COPY . .
RUN chmod +x node_modules/.bin/nuxt && \
    chmod +x node_modules/@esbuild/linux-x64/bin/esbuild
ENV NODE_ENV=production
RUN npm run build
RUN chmod +x .output/server/index.mjs

# ---------- RUNTIME LAYER ----------
FROM runtime-deps AS runtime
WORKDIR /app

# Create app user early (before COPY --chown) - check if GID/UID exists first
RUN if getent group 1000 >/dev/null; then \
      groupadd securityconsole; \
    else \
      groupadd -g 1000 securityconsole || groupadd securityconsole; \
    fi && \
    if getent passwd 1000 >/dev/null; then \
      useradd -g securityconsole -d /app -m -s /bin/sh securityconsole; \
    else \
      useradd -u 1000 -g securityconsole -d /app -m -s /bin/sh securityconsole || useradd -g securityconsole -d /app -m -s /bin/sh securityconsole; \
    fi

# App runtime files with correct ownership
COPY --chown=securityconsole:securityconsole --from=build /app/.output/ ./.output/
COPY --chown=securityconsole:securityconsole --from=build /app/composables/ ./composables/
COPY --chown=securityconsole:securityconsole --from=deps /app/node_modules/ ./node_modules/
COPY --chown=securityconsole:securityconsole --from=deps /app/package*.json ./
COPY --chown=securityconsole:securityconsole --from=deps /app/.env ./.env

RUN set -e; \
    mkdir -p /app/temp; \
    mkdir -p /app/data; \
    mkdir -p /app/auth-data; \
    chown -R securityconsole:securityconsole /app; \
    chmod -R 755 /app/temp; \
    chmod -R 755 /app/data; \
    chmod -R 755 /app/auth-data; \
    chmod 777 /app/temp; \
    chmod 777 /app/data; \
    chmod 777 /app/auth-data


# Copy startup scripts from build context to runtime layer
COPY --chown=securityconsole:securityconsole --from=build /app/start.sh /app/start.sh
COPY --chown=securityconsole:securityconsole --from=build /app/entrypoint.sh /app/entrypoint.sh

# Fix Windows line endings if present and ensure executable
RUN [ -f /app/start.sh ] && sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh || echo '/app/start.sh not found'; \
    [ -f /app/entrypoint.sh ] && sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh || echo '/app/entrypoint.sh not found';

# Inject atob polyfill at the top of Nuxt SSR entrypoint
RUN sed -i '1i if (typeof atob === "undefined") { global.atob = str => Buffer.from(str, "base64").toString("binary"); }' /app/.output/server/index.mjs

# Set env vars
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.1
ENV LOG_LEVEL=info

ENV TEMP_DIR=/app/temp
ENV DATA_DIR=/app/data
ENV AUTHENTICATED_USERS_FILE=/app/auth-data/authenticated_users.json

USER securityconsole

EXPOSE 3000

# No health check defined - container will always be considered healthy
# This ensures the container stays up even if the URL or ports change

# Entrypoint script is already copied above - no need to generate it here

# Use the wrapper script as entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
