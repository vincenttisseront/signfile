# Base image with Node + OpenSSL
FROM node:22-slim

# Set jsign version
ENV JSIGN_VERSION=7.1

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install Java + wget
RUN apt-get update && apt-get install -y openjdk-17-jre wget && rm -rf /var/lib/apt/lists/*

# Download jsign CLI
RUN wget -O /usr/local/bin/jsign.jar https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar

# Create a wrapper script for convenience
RUN echo '#!/bin/sh\nexec java -jar /usr/local/bin/jsign.jar "$@"' > /usr/local/bin/jsign && chmod +x /usr/local/bin/jsign

# Create app directory
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy source code (including hidden files)
COPY . .

# Expose default Nuxt port
EXPOSE 3000

# Ensure Nuxt listens on all interfaces
ENV NITRO_HOST=0.0.0.0

# Build Nuxt app (or skip if dev mode)
RUN npm run build

# Start app (change to 'dev' for local hot reload)
CMD ["npm", "run", "start"]
