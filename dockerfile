# Use Puppeteer’s official image with Chromium preinstalled
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copy app code
COPY . .

# Install Node dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start your app
CMD ["node", "index.js"]
