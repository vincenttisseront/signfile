# --------- BUILD STAGE ---------
FROM harbor.ibanfirst.tech/base/node@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS build

WORKDIR /app

# Install minimal build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    openjdk-17-jre-headless \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy and install *with* devDependencies to allow Nuxt/Tailwind to build
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Download jsign
ENV JSIGN_VERSION=7.1
RUN wget -O /usr/local/bin/jsign-${JSIGN_VERSION}.jar https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar && \
    ln -sf /usr/local/bin/jsign-${JSIGN_VERSION}.jar /usr/local/bin/jsign.jar && \
    echo '#!/bin/sh\nexec java -jar /usr/local/bin/jsign.jar "$@"' > /usr/local/bin/jsign && \
    chmod +x /usr/local/bin/jsign

# Optional: rebuild native modules just in case (lightningcss)
RUN npm rebuild || true

# Build app
RUN npm run build


# --------- RUNTIME STAGE ---------
FROM harbor.ibanfirst.tech/base/node@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS runtime

WORKDIR /app

# Runtime packages only
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    openjdk-17-jre-headless \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy built app and jsign
COPY --from=build /app/.output /app/.output
COPY --from=build /usr/local/bin/jsign* /usr/local/bin/
COPY --from=build /usr/local/bin/jsign.jar /usr/local/bin/jsign.jar

# Nuxt runtime environment
ENV NODE_ENV=production
ENV TZ=Europe/Paris
ENV NITRO_HOST=0.0.0.0

# Set JSIGN_VERSION in runtime stage as well
ENV JSIGN_VERSION=7.1

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
