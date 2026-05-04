#!/bin/bash
# Runek Mac/Linux Launcher

echo "🚀 Launching Runek Career Autopilot..."

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "runek-app/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd runek-app && npm install
    cd ..
fi

# Run the app
echo "🌐 Starting dashboard at http://localhost:3000"
cd runek-app && npm run dev
