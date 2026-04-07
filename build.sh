#!/bin/bash

# Render build script for AquaMonitor
echo "🚀 Starting AquaMonitor build process..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies with optimizations
echo "🐍 Installing Python dependencies..."
pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

echo "✅ Build completed successfully!"