# Base image with Node + OpenSSL
FROM node:22-slim

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose default Nuxt port
EXPOSE 3000

# Build Nuxt app (or skip if dev mode)
RUN npm run build

# Start app (change to 'dev' for local hot reload)
CMD ["npm", "run", "start"]
