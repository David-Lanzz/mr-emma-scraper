#!/usr/bin/env bash
set -e

# Install Chromium using the official Puppeteer CDN
echo "Downloading Chromium for Puppeteer..."

npm install puppeteer-core@19

# Fetch compatible Chromium
node - << 'EOF'
const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browserFetcher = puppeteer.createBrowserFetcher({ product: 'chrome' });
    const revision = '1095492'; // Ubuntu-compatible Chromium
    const info = await browserFetcher.download(revision);
    console.log("Chromium downloaded to:", info.executablePath);
  } catch (err) {
    console.error("Chromium download failed:", err);
    process.exit(1);
  }
})();
EOF
