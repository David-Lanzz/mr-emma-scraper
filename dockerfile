# Use Node slim image
FROM node:22-bullseye-slim

# Install dependencies required by Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget gnupg libnss3 libatk1.0-0 libx11-xcb1 libcups2 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 \
    libpangoft2-1.0-0 libfontconfig1 libxss1 libxtst6 xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to root (repo root)
WORKDIR /

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies including Puppeteer
RUN npm install puppeteer --unsafe-perm

# Copy all code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
