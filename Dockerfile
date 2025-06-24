FROM node:22-slim

ENV JSIGN_VERSION=7.1

# Install OpenSSL, Java (headless), download jsign
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openssl \
        openjdk-17-jre-headless \
        wget && \
    wget -O /usr/local/bin/jsign-${JSIGN_VERSION}.jar https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar && \
    ln -sf /usr/local/bin/jsign-${JSIGN_VERSION}.jar /usr/local/bin/jsign.jar && \
    echo '#!/bin/sh\nexec java -jar /usr/local/bin/jsign.jar "$@"' > /usr/local/bin/jsign && \
    chmod +x /usr/local/bin/jsign && \
    apt-get purge -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install node modules
COPY package*.json ./
RUN npm install

# Copy app source code
COPY . .

# Expose and configure runtime
EXPOSE 3000
ENV NITRO_HOST=0.0.0.0

RUN npm run build

CMD ["npm", "run", "start"]
