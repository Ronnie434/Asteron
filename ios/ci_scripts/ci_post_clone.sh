#!/bin/bash

# Xcode Cloud post-clone script for Expo/React Native projects
# This script runs after the repository is cloned but before the build starts

set -e  # Exit on any error

echo "📦 Setting up environment for Xcode Cloud build..."

# Navigate to the project root (parent of ios folder)
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js using Homebrew (Xcode Cloud has Homebrew pre-installed)
echo "🔧 Installing Node.js..."
brew install node 2>&1

# Verify Node.js installation
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install project dependencies with progress output
echo "📥 Installing npm dependencies..."
# Use --progress to show download progress and prevent timeout
npm ci --legacy-peer-deps --progress 2>&1

echo "✅ npm dependencies installed!"

# Navigate to ios folder
cd ios

# Install CocoaPods dependencies with verbose output
echo "🍫 Installing CocoaPods dependencies..."
pod install --verbose 2>&1

echo "✅ Environment setup complete!"
