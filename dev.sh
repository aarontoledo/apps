#!/bin/bash

# 1. Navigate to client and do an initial build
echo "🚀 Starting DevSuite Build..."
cd client && npm run build
cd ..

# 2. Start Wrangler to serve the Worker and the newly built assets
# The --watch flag will reload the Worker if you change index.js
echo "🌐 Starting Cloudflare Worker on http://localhost:8787"
npx wrangler dev --watch &

# 3. Use Vite's build watch mode to update the /dist folder automatically
# This ensures that every time you save a React file, it rebuilds
echo "🛠️  Watching for React changes..."
cd client && npm run build -- --watch