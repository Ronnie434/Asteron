#!/bin/sh

# Fail on any error
set -e

# Go to the repository root
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing Node.js dependencies..."
npm install

echo "Installing CocoaPods..."
cd ios
pod install
