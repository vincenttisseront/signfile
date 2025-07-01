# ---------- BASE BUILDER IMAGE ----------
FROM harbor.ibanfirst.tech/base/node@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS base
WORKDIR /app

# ---------- JSIGN LAYER (CACHED) ----------
FROM base AS jsign
ARG JSIGN_VERSION=7.1
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends wget ca-certificates openjdk-17-jre-headless && \
    wget -O /usr/local/bin/jsign-${JSIGN_VERSION}.jar https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar && \
    ln -sf /usr/local/bin/jsign-${JSIGN_VERSION}.jar /usr/local/bin/jsign.jar && \
    echo '#!/bin/sh\nexec java -jar /usr/local/bin/jsign.jar "$@"' > /usr/local/bin/jsign && \
    chmod +x /usr/local/bin/jsign && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ---------- BUILD STAGE ----------
FROM base AS build

# Pre-install only what's needed for the build
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates openjdk-17-jre-headless && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy only package metadata to leverage Docker cache for npm ci
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy app source after npm ci to keep cache valid
COPY . .

# Copy jsign from previous stage
COPY --from=jsign /usr/local/bin/jsign /usr/local/bin/jsign
COPY --from=jsign /usr/local/bin/jsign.jar /usr/local/bin/jsign.jar

# Optional: rebuild native modules (example: lightningcss)
RUN npm rebuild || true

# Build the Nuxt 3 app
RUN npm run build

# Debug build output
RUN echo "Build complete. Verifying output..." && \
    ls -la .output/ && \
    ls -la .output/server/ && \
    ls -la .output/public/ || true

# ---------- RUNTIME STAGE ----------
FROM base AS runtime

WORKDIR /app

# Runtime packages only (no build tools)
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates openjdk-17-jre-headless openssl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy built Nuxt output
COPY --from=build /app/.output/ ./.output/

# Copy jsign runtime tools
COPY --from=build /usr/local/bin/jsign /usr/local/bin/
COPY --from=build /usr/local/bin/jsign.jar /usr/local/bin/

# Copy composables (required at runtime for Okta composable)
COPY --from=build /app/composables/ ./composables/

# Runtime node_modules (required for version checks)
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Empty .env file for runtime use
RUN touch .env

# Runtime config
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0
ENV JSIGN_VERSION=7.1

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
