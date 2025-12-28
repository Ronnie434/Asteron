import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/useAuthStore';
import { theme } from '../src/ui/theme';

// Configure Google Sign-in
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Sign-In is available (iOS 13+)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      if (response.type === 'success' && response.data?.idToken) {
        // Get the tokens from the sign-in response
        const tokens = await GoogleSignin.getTokens();
        
        // For native mobile, use signInWithIdToken with provider 'google'
        // The idToken from native SDK doesn't include nonce, so Supabase should accept it
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
          access_token: tokens.accessToken,
        });

        if (error) {
          console.error('Supabase auth error:', error);
          Alert.alert('Sign In Failed', error.message);
        } else {
          console.log('Successfully signed in:', data.user?.email);
        }
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign-in is already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        console.error('Google sign-in error:', error);
        Alert.alert('Sign In Failed', error.message || 'An error occurred during sign in');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      
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

        if (error) {
          console.error('Supabase auth error:', error);
          Alert.alert('Sign In Failed', error.message);
        } else if (data.user) {
          // Apple only provides full name on first sign-in, save it
          if (credential.fullName) {
            const nameParts = [];
            if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName);
            if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName);
            
            if (nameParts.length > 0) {
              await supabase.auth.updateUser({
                data: {
                  full_name: nameParts.join(' '),
                  given_name: credential.fullName.givenName,
                  family_name: credential.fullName.familyName,
                },
              });
            }
          }
        }
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled the sign-in
      } else {
        console.error('Apple sign-in error:', error);
        Alert.alert('Sign In Failed', 'An error occurred during sign in');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const isLoading = isGoogleLoading || isAppleLoading;

  return (
    <LinearGradient
      colors={['#0a0a0f', '#12121a', '#0a0a0f']}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/AI_Companion_icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Asteron</Text>
          <Text style={styles.tagline}>Your calm forecast{'\n'}for what's ahead</Text>
        </View>

        {/* Sign-in Buttons */}
        <View style={[styles.buttonSection, { paddingBottom: insets.bottom + 40 }]}>
          {/* Apple Sign-in - Primary on iOS */}
          {Platform.OS === 'ios' && isAppleAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                styles.appleButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              {isAppleLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Google Sign-in */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              styles.googleButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Terms & Privacy */}
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  appName: {
    ...theme.typography.largeTitle,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tagline: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonSection: {
    gap: 16,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 12,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  appleIcon: {
    fontSize: 20,
    color: '#000',
  },
  appleButtonText: {
    ...theme.typography.body,
    fontFamily: 'DMSans_500Medium',
    color: '#000',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    ...theme.typography.body,
    fontFamily: 'DMSans_500Medium',
    color: '#000',
  },
  termsText: {
    ...theme.typography.footnote,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  termsLink: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
