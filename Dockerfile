# ---------- BASE IMAGE ----------
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

# ---------- BUILD STAGE ----------
FROM base AS build

# System dependencies
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates openjdk-17-jre-headless && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install dependencies and copy project files
COPY package*.json ./
COPY .env .env
RUN test -s .env || (echo 'ERROR: .env file missing or empty!' && exit 1)
RUN npm ci --prefer-offline
COPY . .

# Permissions for Windows-based hosts
RUN chmod +x node_modules/.bin/nuxt && \
    chmod +x node_modules/@esbuild/linux-x64/bin/esbuild

# Copy jsign binary
COPY --from=jsign /usr/local/bin/jsign /usr/local/bin/
COPY --from=jsign /usr/local/bin/jsign.jar /usr/local/bin/

# Rebuild any native modules if needed
RUN npm rebuild || true

# Nuxt build (includes Tailwind processing via @nuxtjs/tailwindcss)
RUN NODE_ENV=production npm run build

# Final cleanup & permission fix
RUN chmod +x .output/server/index.mjs

# ---------- RUNTIME STAGE ----------
FROM base AS runtime
WORKDIR /app

# System dependencies only
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates openjdk-17-jre-headless openssl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Runtime output and dependencies
COPY --from=build /app/.output/ ./.output/
COPY --from=build /usr/local/bin/jsign /usr/local/bin/
COPY --from=build /usr/local/bin/jsign.jar /usr/local/bin/
COPY --from=build /app/composables/ ./composables/
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/package*.json ./
COPY --from=build /app/.env ./.env

# Runtime permissions
RUN chmod -R 755 .output && \
    find .output -name "*.mjs" -exec chmod 755 {} \;

# Environment variables
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.1

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
