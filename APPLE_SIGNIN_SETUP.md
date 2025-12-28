# Apple Sign-In Setup Guide for Asteron (ai-companion-app)

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Apple Developer Portal Configuration](#apple-developer-portal-configuration)
4. [Supabase Configuration](#supabase-configuration)
5. [Code Review & Verification](#code-review--verification)
6. [Environment Variables](#environment-variables)
7. [Testing Instructions](#testing-instructions)
8. [Troubleshooting](#troubleshooting)
9. [Native vs OAuth Approach](#native-vs-oauth-approach)
10. [Production Checklist](#production-checklist)

---

## Introduction

This guide will help you configure Apple Sign-In for the **Asteron** app using the **native SDK approach** with `expo-apple-authentication`.

### What's Already Implemented

✅ **Code is already in place!** The app uses the native iOS Sign in with Apple SDK:
- Package: `expo-apple-authentication` v8.0.8 installed
- Configuration: `usesAppleSignIn: true` in [`app.json:19`](app.json:19)
- Sign-in handler: Implemented in [`app/signin.tsx:83-134`](app/signin.tsx:83-134)
- Supabase integration: Token exchange via `signInWithIdToken`

### What You Need to Configure

⚠️ **External configuration required:**
- Apple Developer Portal setup (App ID, Services ID, Key)
- Supabase dashboard configuration
- No code changes needed!

### Benefits of the Native Approach

✅ **Better user experience:** Native iOS UI, Face ID/Touch ID integration  
✅ **Simpler implementation:** No browser redirects or URL schemes  
✅ **More secure:** Credentials never leave the Apple ecosystem  
✅ **Apple's preferred method:** Uses official Apple SDK  
⚠️ **iOS only:** Only works on iOS 13+ devices

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Apple Developer Account** ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- [ ] **Supabase Project** - Already configured at your Supabase URL
- [ ] **Expo Development Environment** - Working on your machine
- [ ] **iOS Physical Device** - iOS 13+ required for testing (simulator won't work properly)
- [ ] **Bundle Identifier** - `app.asteron` (from [`app.json:18`](app.json:18))

---

## Apple Developer Portal Configuration

### Step 1: Configure App ID

1. Go to [Apple Developer Portal > Identifiers](https://developer.apple.com/account/resources/identifiers/)
2. Click on your App ID: `app.asteron`
   - If it doesn't exist, create it:
     - Click **"+"** button
     - Select **"App IDs"**
     - Select **"App"**
     - Description: `Asteron`
     - Bundle ID: `app.asteron` (Explicit)
3. In the **Capabilities** section:
   - ✅ Check **"Sign in with Apple"**
4. Click **"Save"**
5. Click **"Continue"** then **"Register"** (if creating new)

### Step 2: Create Services ID

The Services ID is used by Supabase to identify your app during the OAuth flow.

1. In **Identifiers**, click **"+"** button
2. Select **"Services IDs"**
3. Click **"Continue"**

**Register a Services ID:**
- Description: `Asteron Sign in with Apple`
- Identifier: `app.asteron.service` (recommended naming convention)
- Click **"Continue"** then **"Register"**

**Configure the Services ID:**
1. Click on your newly created Services ID
2. ✅ Check **"Sign in with Apple"**
3. Click **"Configure"** next to it

**Domains and Subdomains:**
- Add your Supabase project domain (replace with your actual URL):
  ```
  your-project-ref.supabase.co
  ```

**Return URLs:**
- Add your Supabase callback URL:
  ```
  https://your-project-ref.supabase.co/auth/v1/callback
  ```

4. Click **"Save"**
5. Click **"Continue"** then **"Save"** again

> **Note:** Replace `your-project-ref` with your actual Supabase project reference. You can find this in your Supabase project URL.

### Step 3: Create Sign in with Apple Key

This key allows Supabase to authenticate users on behalf of your app.

1. In the sidebar, go to **Keys**
2. Click **"+"** button
3. Key Name: `Asteron Sign in with Apple Key`
4. ✅ Check **"Sign in with Apple"**
5. Click **"Configure"** next to it
6. Select your Primary App ID: `app.asteron`
7. Click **"Save"**
8. Click **"Continue"**
9. Click **"Register"**

**Download the Key:**
1. ⚠️ **CRITICAL:** Click **"Download"** immediately
2. Save the `.p8` file securely (you can only download it once!)
3. Note your **Key ID** (10 characters, e.g., `ABC123DEFG`)
4. ⚠️ If you lose this file, you'll need to create a new key

### Step 4: Find Your Team ID

1. Go to **Membership** in the sidebar
2. Your **Team ID** is displayed at the top (10 characters)
3. Copy and save this for Supabase configuration

### ✅ Checklist: What You Should Have Now

- [ ] App ID: `app.asteron` with Sign in with Apple enabled
- [ ] Services ID: `app.asteron.service` (or your chosen name)
- [ ] Team ID: 10 characters (e.g., `ABC123DEFG`)
- [ ] Key ID: 10 characters (e.g., `XYZ789HIJK`)
- [ ] Private Key: `.p8` file downloaded and saved securely

---

## Supabase Configuration

### Step 1: Navigate to Apple Provider Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Apple** in the list of providers
4. Click to expand the Apple provider settings

### Step 2: Enable and Configure Apple Provider

Toggle **"Enable Sign in with Apple"** to ON.

**Configuration Fields:**

1. **Services ID** (Client ID):
   ```
   app.asteron.service
   ```
   (Use the exact Services ID you created in Apple Developer Portal)

2. **Team ID**:
   ```
   YOUR_TEAM_ID
   ```
   (10-character Team ID from Apple Developer Portal > Membership)

3. **Key ID**:
   ```
   YOUR_KEY_ID
   ```
   (10-character Key ID from the key you created)

4. **Private Key**:
   - Open your downloaded `.p8` file in a text editor
   - Copy the **entire contents**, including the header and footer:
     ```
     -----BEGIN PRIVATE KEY-----
     MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
     [multiple lines of key content]
     ...
     -----END PRIVATE KEY-----
     ```
   - Paste into the **Private Key** field in Supabase

5. Click **"Save"**

### Step 3: Configure Redirect URLs (Optional for Native)

Since you're using the **native SDK approach**, you don't need custom redirect URLs. However, if you want to add them for future flexibility:

1. Go to **Authentication** > **URL Configuration**
2. In **Redirect URLs**, you can add:
   ```
   asteron://oauth-callback
   exp://localhost:8081/--/oauth-callback
   ```
   (The `exp://` URL is for Expo development)

> **Note:** The native approach doesn't use URL redirects, but adding these doesn't hurt.

### ✅ Configuration Complete!

Your Supabase project is now configured to accept Sign in with Apple tokens from your iOS app.

---

## Code Review & Verification

The code is already implemented! Let's verify what's in place:

### 1. Package Installation ✅

From [`package.json:26`](package.json:26):
```json
"expo-apple-authentication": "^8.0.8"
```

### 2. App Configuration ✅

From [`app.json:19`](app.json:19):
```json
"ios": {
  "bundleIdentifier": "app.asteron",
  "usesAppleSignIn": true,
  ...
}
```

This tells iOS that your app uses Sign in with Apple, adding the required entitlements.

### 3. Sign-In Implementation ✅

From [`app/signin.tsx:83-134`](app/signin.tsx:83-134), the app:

**Checks availability:**
```typescript
useEffect(() => {
  if (Platform.OS === 'ios') {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }
}, []);
```

**Handles sign-in:**
```typescript
const handleAppleSignIn = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (credential.identityToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    
    // Saves full name on first sign-in
    if (credential.fullName) {
      await supabase.auth.updateUser({
        data: {
          full_name: nameParts.join(' '),
          given_name: credential.fullName.givenName,
          family_name: credential.fullName.familyName,
        },
      });
    }
  }
};
```

**Key Features:**
- ✅ Requests email and full name
- ✅ Handles Apple's identity token
- ✅ Exchanges token with Supabase via `signInWithIdToken`
- ✅ Saves user's name on first sign-in (Apple only provides this once!)
- ✅ Graceful error handling

### How the Native Flow Works

```mermaid
sequenceDiagram
    participant User
    participant App
    participant iOS
    participant Apple
    participant Supabase

    User->>App: Taps Sign in with Apple
    App->>iOS: signInAsync
    iOS->>Apple: Opens native Apple UI
    User->>Apple: Authenticates with Face ID/Touch ID
    Apple->>iOS: Returns identityToken
    iOS->>App: Returns credential with token
    App->>Supabase: signInWithIdToken provider=apple
    Supabase->>Apple: Validates token
    Apple->>Supabase: Token valid
    Supabase->>App: Returns session
    App->>User: Signed in!
```

### Differences from Renvo's OAuth Approach

**ai-companion-app (Native):**
- Uses `expo-apple-authentication`
- Native iOS UI (system modal)
- Direct token exchange with Apple SDK
- No browser or redirects
- iOS only

**Renvo (OAuth Browser):**
- Uses `expo-web-browser`
- Opens browser for OAuth flow
- URL scheme redirects (`renvo://`)
- Works on iOS, Android, Web
- More complex setup

---

## Environment Variables

The native approach doesn't require additional environment variables for Apple Sign-In itself. Your existing setup in [`ENV_SETUP.md`](ENV_SETUP.md) is sufficient.

**Current Environment Variables:**

From your `.env` file:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenRouter API
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Google OAuth (if applicable)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
```

**Optional:** If you want to reference Apple credentials for documentation purposes, you could add:
```bash
# Apple Sign-In (for reference only - not used by app)
# EXPO_PUBLIC_APPLE_SERVICES_ID=app.asteron.service
# EXPO_PUBLIC_APPLE_TEAM_ID=your-team-id
```

> **Note:** The app doesn't need these as environment variables because the native SDK handles everything internally.

---

## Testing Instructions

### ⚠️ Critical: Physical Device Required!

Apple Sign-In **does not work properly in the iOS Simulator** for production testing. You **must** use a physical iOS device.

### Prerequisites for Testing

- [ ] Physical iPhone or iPad running iOS 13 or later
- [ ] Device signed into iCloud with an Apple ID
- [ ] USB cable to connect device to your Mac
- [ ] Xcode installed on your Mac

### Step 1: Build and Install on Device

```bash
# Connect your iOS device via USB
# Make sure it's unlocked and trusted

# Build and run on connected device
npx expo run:ios --device
```

**Expo will:**
1. Detect your connected device
2. Build the app with proper entitlements
3. Install it on your device
4. Launch the app

> **Tip:** If you have multiple devices connected, Expo will prompt you to choose one.

### Step 2: Test First-Time Sign-In

1. Launch the app on your device
2. Navigate to the Sign-In screen
3. Tap **"Continue with Apple"**

**What happens:**
1. Native Apple Sign-In UI appears (system modal)
2. Shows your Apple ID
3. Asks if you want to:
   - **Share** your email, OR
   - **Hide** your email (creates private relay)
4. Shows name fields (editable on first sign-in only)
5. Authenticates with Face ID / Touch ID / Passcode
6. Returns to app

**First Sign-In Checklist:**
- [ ] Native iOS UI appears (not a browser)
- [ ] Can choose to share or hide email
- [ ] Can edit name fields
- [ ] Face ID/Touch ID prompt appears
- [ ] App receives user data
- [ ] Session is created in Supabase
- [ ] User is logged into the app

### Step 3: Test Subsequent Sign-Ins

1. Sign out from the app
2. Tap **"Continue with Apple"** again

**What happens:**
1. Native Apple Sign-In UI appears
2. Shows your Apple ID (no name edit option)
3. Authenticates with Face ID/Touch ID
4. Returns to app immediately

**Subsequent Sign-In Checklist:**
- [ ] No name edit option (expected)
- [ ] Faster authentication
- [ ] Session restores correctly
- [ ] User data persists

### Step 4: Test Session Persistence

1. Force quit the app (swipe up from app switcher)
2. Reopen the app

**Expected:**
- [ ] User remains signed in
- [ ] No need to sign in again
- [ ] User data displays correctly

### Step 5: Test Error Handling

**Test Cancellation:**
1. Tap **"Continue with Apple"**
2. Tap **"Cancel"** on the Apple Sign-In modal

**Expected:**
- [ ] App returns to sign-in screen
- [ ] No error message displayed (cancellation is normal)
- [ ] Can try again

**Test Network Error:**
1. Enable Airplane Mode
2. Tap **"Continue with Apple"**

**Expected:**
- [ ] Error alert appears
- [ ] User-friendly error message
- [ ] Can retry after enabling network

### Debugging Tips

**Enable Debug Logging:**

The app already has debug logs. Check Xcode console for:
```
[OAuth] Starting Apple sign-in
Supabase auth error: ...
Successfully signed in: user@example.com
```

**Check Supabase Logs:**
1. Go to Supabase Dashboard
2. Navigate to **Authentication** > **Logs**
3. Filter for Apple provider events
4. Look for successful/failed sign-ins

---

## Troubleshooting

### "Sign In with Apple is not available"

**Cause:** Device or configuration issue

**Solutions:**
1. Ensure device is iOS 13 or later
2. Check device is signed into iCloud (Settings > [Your Name])
3. Verify `usesAppleSignIn: true` in [`app.json:19`](app.json:19)
4. Rebuild the app: `npx expo run:ios --device --clean`
5. Check device has internet connection

### "The operation couldn't be completed"

**Cause:** Configuration mismatch between Apple and Supabase

**Solutions:**
1. Verify Services ID matches in Apple Developer Portal and Supabase
2. Check Team ID is correct (10 characters)
3. Verify Key ID is correct (10 characters)
4. Ensure Private Key includes full contents with header/footer
5. Check Services ID has correct return URL in Apple Developer Portal

### Token Exchange Failed

**Cause:** Supabase can't validate the Apple token

**Solutions:**
1. Check Supabase Apple provider is enabled
2. Verify all credentials (Services ID, Team ID, Key ID, Private Key)
3. Ensure no extra spaces in credential fields
4. Try regenerating Apple Key (download new .p8 file)
5. Check Supabase logs for specific error

### Name Not Saving

**Cause:** Apple only provides full name on first sign-in

**Solutions:**
1. This is expected behavior from Apple
2. Name is only available during initial authentication
3. If testing, you need to:
   - Remove the app from your Apple ID settings
   - Go to Settings > Apple ID > Password & Security > Apps Using Apple ID
   - Remove "Asteron"
   - Sign in again (will be treated as first-time)

### Simulator Not Working

**Cause:** Native Apple Sign-In requires physical device

**Solution:**
- This is expected - use a physical iOS device
- Simulator can test UI but not actual authentication
- For testing without device, switch to OAuth approach (not recommended)

### Build Entitlements Error

**Cause:** Xcode project needs entitlements update

**Solutions:**
1. Run: `npx expo prebuild --clean`
2. Rebuild: `npx expo run:ios --device`
3. Check Bundle Identifier matches Apple Developer Portal: `app.asteron`
4. Verify App ID has Sign in with Apple enabled

---

## Native vs OAuth Approach

### Native SDK Approach (ai-companion-app) ✅

**What it is:**
- Uses `expo-apple-authentication` package
- Directly integrates with iOS Sign in with Apple SDK
- Native iOS UI and authentication flow

**Advantages:**
- ✅ Better user experience (native iOS UI)
- ✅ Face ID / Touch ID integration
- ✅ More secure (no browser redirection)
- ✅ Simpler implementation
- ✅ Apple's recommended approach
- ✅ Faster authentication

**Disadvantages:**
- ⚠️ iOS only (iOS 13+)
- ⚠️ Can't test in simulator
- ⚠️ Requires physical device for development

### OAuth Browser Approach (Renvo)

**What it is:**
- Uses `expo-web-browser` + `expo-auth-session`
- Opens browser for OAuth flow
- URL scheme redirects

**Advantages:**
- ✅ Cross-platform (iOS, Android, Web)
- ✅ Can work in simulator
- ✅ More flexible

**Disadvantages:**
- ⚠️ More complex setup
- ⚠️ Requires URL scheme configuration
- ⚠️ Browser-based (not native UI)
- ⚠️ Slower authentication flow
- ⚠️ Less secure (browser redirects)

### Why ai-companion-app Uses Native Approach

1. **iOS-first app:** Asteron is primarily for iOS users
2. **Better UX:** Native experience matches Apple's design guidelines
3. **Simpler code:** Less configuration, fewer moving parts
4. **More secure:** Tokens never exposed in URLs
5. **Apple's preference:** Using official SDK shows quality

---

## Production Checklist

Before submitting to the App Store, ensure:

### Apple Developer Portal
- [ ] App ID has Sign in with Apple enabled
- [ ] Services ID is configured with production domains
- [ ] Private Key is securely stored (backup the .p8 file!)
- [ ] Return URLs match your production Supabase URL

### Supabase
- [ ] Apple provider is enabled in production project
- [ ] All credentials (Services ID, Team ID, Key ID, Private Key) are correct
- [ ] Tested with production Supabase instance
- [ ] Database has proper user tables and policies

### App Configuration
- [ ] Bundle Identifier matches Apple Developer Portal: `app.asteron`
- [ ] `usesAppleSignIn: true` in [`app.json`](app.json:19)
- [ ] Production Supabase URL in environment variables
- [ ] Google Sign-In also working (if applicable)

### Testing
- [ ] Tested on multiple iOS devices (iPhone & iPad)
- [ ] Tested different iOS versions (13+)
- [ ] First-time sign-in works (name/email collection)
- [ ] Subsequent sign-ins work
- [ ] Session persistence works
- [ ] Sign-out works correctly
- [ ] Error handling works (cancellation, network errors)

### Privacy & Legal
- [ ] Privacy policy URL in App Store listing
- [ ] Terms of service URL in App Store listing
- [ ] Privacy policy mentions Sign in with Apple
- [ ] Explains what data is collected
- [ ] Includes Apple's privacy requirements

### App Store Review Guidelines

Apple requires:

1. **Sign in with Apple button placement:**
   - Must be prominently displayed
   - Should be equal or greater prominence than other sign-in options
   - ✅ Your app already does this correctly in [`app/signin.tsx`](app/signin.tsx:158)

2. **Privacy information:**
   - Disclose what data you collect
   - Explain how you use Apple ID data
   - Include in privacy policy

3. **No special treatment:**
   - Don't incentivize other sign-in methods over Apple
   - Offer same features regardless of sign-in method

4. **Account deletion:**
   - Provide way to delete account
   - Include in app settings

### Production Environment Variables

Ensure your production `.env` file has:

```bash
# Production Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Other services
EXPO_PUBLIC_OPENROUTER_API_KEY=your-production-api-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-production-google-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-production-google-ios-client-id
```

### Pre-Submission Checklist

- [ ] Built with production configuration
- [ ] Tested on TestFlight (beta testing)
- [ ] All authentication flows work in production
- [ ] Privacy policy is accessible
- [ ] Terms of service are accessible
- [ ] App Store screenshots show Sign in with Apple
- [ ] App Store description mentions Sign in with Apple
- [ ] Ready for App Store review

---

## Support Resources

### Official Documentation

- [Apple: Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Expo: Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase: Auth with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)

### Developer Portals

- [Apple Developer Portal](https://developer.apple.com/account/)
- [Supabase Dashboard](https://app.supabase.com/)

### Getting Help

If you encounter issues:

1. Check Supabase Auth logs for errors
2. Review Apple Developer Portal configuration
3. Test on physical device (not simulator)
4. Check this troubleshooting section
5. Review Expo documentation
6. Check Apple Developer Forums

---

## Summary

**What's Done:**
- ✅ Code is implemented
- ✅ App configuration is correct
- ✅ Package is installed

**What You Need to Do:**
1. Configure Apple Developer Portal (App ID, Services ID, Key)
2. Configure Supabase dashboard (enable Apple provider)
3. Test on physical iOS device
4. Deploy to production

**Key Reminder:**
🎯 The native approach is simpler and provides better UX, but requires a physical iOS device for testing. The code is already in place - you just need to configure the external services!