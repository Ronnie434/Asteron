#!/bin/sh
set -e

echo "🏗️ Starting ci_post_clone.sh setup..."

# Setup environment for Xcode Cloud
# Navigate to project root (parent of ios folder)
cd ../..

# ===========================================
# 1. Create .env file from Xcode Cloud environment variables
# ===========================================
echo "📝 Creating .env file from environment variables..."

# Validate required variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ ERROR: EXPO_PUBLIC_SUPABASE_URL not set in Xcode Cloud environment"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY not set in Xcode Cloud environment"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_OPENROUTER_API_KEY" ]; then
    echo "❌ ERROR: EXPO_PUBLIC_OPENROUTER_API_KEY not set in Xcode Cloud environment"
    exit 1
fi

# Create the .env file
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY}
EXPO_PUBLIC_OPENROUTER_API_KEY=${EXPO_PUBLIC_OPENROUTER_API_KEY}
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID}
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID}
EXPO_PUBLIC_APPLE_CLIENT_ID=${EXPO_PUBLIC_APPLE_CLIENT_ID}
EOF

echo "✅ Environment file created successfully"

# ===========================================
# 2. Install Node and CocoaPods via Homebrew
# ===========================================
echo "🍺 Installing Node and CocoaPods via Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Skipping brew install."
else
    brew install cocoapods node
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# ===========================================
# 3. Install Node Dependencies
# ===========================================
echo "📥 Installing Node dependencies..."
npm ci --legacy-peer-deps

echo "✅ npm dependencies installed!"

# ===========================================
# 4. Install CocoaPods
# ===========================================
echo "🍫 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

echo "✅ Environment setup complete!"
