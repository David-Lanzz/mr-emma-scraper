FROM node:22-bullseye-slim

# Install all Chromium dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation libappindicator3-1 \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils libpangocairo-1.0-0 libpangoft2-1.0-0 \
    libfontconfig1 libxss1 libxtst6 --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for caching)
COPY package*.json ./

# Install Node dependencies (Express, Puppeteer, etc.)
RUN npm install --omit=dev

# Install Chrome for Puppeteer into the cache (/root/.cache/puppeteer)
RUN npx puppeteer browsers install chrome

# Copy all code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
