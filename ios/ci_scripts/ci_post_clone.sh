#!/bin/bash

# Xcode Cloud post-clone script for Expo/React Native projects
# This script runs after the repository is cloned but before the build starts

set -e  # Exit on any error

echo "📦 Setting up environment for Xcode Cloud build..."

# Navigate to the project root (parent of ios folder)
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js using Homebrew (Xcode Cloud has Homebrew pre-installed)
echo "🔧 Installing Node.js..."
brew install node

# Verify Node.js installation
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install project dependencies
echo "📥 Installing npm dependencies..."
npm ci --legacy-peer-deps

# Navigate to ios folder
cd ios

# Install CocoaPods dependencies
echo "🍫 Installing CocoaPods dependencies..."
pod install

echo "✅ Environment setup complete!"
