#!/bin/bash

# 1. Navigate to client and do an initial build
echo "🚀 Starting DevSuite Build..."
cd client && npm run build
cd ..

# 2. Start Wrangler
# Changed: Removed --watch and replaced with the modern persistent mode
echo "🌐 Starting Cloudflare Worker on http://localhost:8787"
npx wrangler dev &

# 3. Use Vite's build watch mode
# Note: Ensure there is a space after the --
echo "🛠️  Watching for React changes..."
cd client && npm run build -- --watch