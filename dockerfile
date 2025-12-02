FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copy package.json first (for caching)
COPY package*.json ./

# Make /app writable and switch user
RUN chown -R pptruser:pptruser /app
USER pptruser

# Install dependencies
RUN npm install

# Copy the rest of your app
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
