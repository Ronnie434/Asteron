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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTheme } from '../src/contexts/ThemeContext';
import { theme } from '../src/ui/theme';
import { LoadingScreen } from '../src/components/LoadingScreen';

// Configure Google Sign-in
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

// Apple Logo SVG Component
const AppleLogo = ({ size = 20, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill={color}
    />
  </Svg>
);

// Google Logo SVG Component
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
        const tokens = await GoogleSignin.getTokens();
        
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
          access_token: tokens.accessToken,
        });

        if (error) {
          console.error('Supabase auth error:', error);
          Alert.alert('Sign In Failed', error.message);
        } else if (data.session) {
          console.log('Successfully signed in:', data.user?.email);
          
          // Send welcome email for NEW users only (check both time and flag)
          try {
            const userCreatedAt = new Date(data.user?.created_at || '');
            const now = new Date();
            const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
            const isNewUser = secondsSinceCreation < 30;
            const alreadySentWelcomeEmail = data.user?.user_metadata?.welcome_email_sent === true;
            
            if (isNewUser && data.user?.email && !alreadySentWelcomeEmail) {
              const userName = data.user?.user_metadata?.name ||
                             data.user?.user_metadata?.full_name ||
                             'there';
              const firstName = userName.split(' ')[0];
              
              console.log('[OAuth] NEW USER - Sending welcome email to:', data.user.email);
              
              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
              const welcomeUrl = `${supabaseUrl}/functions/v1/send-welcome-email`;
              const welcomeResponse = await fetch(welcomeUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${data.session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: data.user.email,
                  firstName: firstName,
                }),
              });
              
              if (welcomeResponse.ok) {
                console.log('[OAuth] Welcome email sent successfully');
                // Mark that welcome email was sent to prevent duplicates
                await supabase.auth.updateUser({
                  data: { welcome_email_sent: true }
                });
              } else {
                console.warn('[OAuth] Failed to send welcome email (non-blocking)');
              }
            } else if (data.user?.email) {
              console.log('[OAuth] RETURNING USER - Skipping welcome email');
            }
          } catch (emailError) {
            console.warn('[OAuth] Error sending welcome email (non-blocking):', emailError);
            // Don't fail OAuth if email fails
          }
        }
      } else if (response.type === 'cancelled') {
        // User cancelled - do nothing, this is expected behavior
        console.log('Google sign-in cancelled by user');
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - silent handling
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // In progress - silent handling
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
        } else if (data.user && data.session) {
          // Update user profile with Apple name if provided
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
          
          // Send welcome email for NEW users only (check both time and flag)
          try {
            const userCreatedAt = new Date(data.user?.created_at || '');
            const now = new Date();
            const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
            const isNewUser = secondsSinceCreation < 30;
            const alreadySentWelcomeEmail = data.user?.user_metadata?.welcome_email_sent === true;
            
            if (isNewUser && data.user?.email && !alreadySentWelcomeEmail) {
              const userName = credential.fullName?.givenName ||
                             data.user?.user_metadata?.name ||
                             data.user?.user_metadata?.full_name ||
                             'there';
              const firstName = userName.split(' ')[0];
              
              console.log('[OAuth] NEW USER - Sending welcome email to:', data.user.email);
              
              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
              const welcomeUrl = `${supabaseUrl}/functions/v1/send-welcome-email`;
              const welcomeResponse = await fetch(welcomeUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${data.session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: data.user.email,
                  firstName: firstName,
                }),
              });
              
              if (welcomeResponse.ok) {
                console.log('[OAuth] Welcome email sent successfully');
                // Mark that welcome email was sent to prevent duplicates
                await supabase.auth.updateUser({
                  data: { welcome_email_sent: true }
                });
              } else {
                console.warn('[OAuth] Failed to send welcome email (non-blocking)');
              }
            } else if (data.user?.email) {
              console.log('[OAuth] RETURNING USER - Skipping welcome email');
            }
          } catch (emailError) {
            console.warn('[OAuth] Error sending welcome email (non-blocking):', emailError);
            // Don't fail OAuth if email fails
          }
        }
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && (
        <LoadingScreen 
          message={isGoogleLoading ? "Signing in with Google..." : "Signing in with Apple..."} 
          overlay 
        />
      )}
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Image 
              source={require('../assets/AI_Companion_icon.png')} 
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Asteron</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Your calm forecast for what's ahead
          </Text>
        </View>

        {/* Sign-in Buttons */}
        <View style={[styles.buttonSection, { paddingBottom: insets.bottom + 40 }]}>
          {/* Apple Sign-in - Primary on iOS */}
          {Platform.OS === 'ios' && isAppleAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                isDark ? styles.appleButtonDark : styles.appleButtonLight,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              <AppleLogo size={20} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff' }]}>
                Continue with Apple
              </Text>
            </Pressable>
          )}

          {/* Google Sign-in */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              styles.googleButton,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              },
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <GoogleLogo size={20} />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </Pressable>

          {/* Skip Sign-in - Commented out for now
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={async () => {
              const { skipSignIn } = useAuthStore.getState();
              await skipSignIn();
            }}
            disabled={isLoading}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Skip for now
            </Text>
          </Pressable>
          */}

          {/* Terms & Privacy */}
          <Text style={[styles.termsText, { color: colors.textTertiary }]}>
            By continuing, you agree to our{' '}
            <Text style={[styles.termsLink, { color: colors.textSecondary }]}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={[styles.termsLink, { color: colors.textSecondary }]}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </View>
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
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  appName: {
    ...theme.typography.largeTitle,
    marginBottom: 8,
  },
  tagline: {
    ...theme.typography.body,
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
    borderWidth: 1,
  },
  appleButtonDark: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  appleButtonLight: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  googleButton: {
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...theme.typography.body,
    fontFamily: 'DMSans_500Medium',
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    ...theme.typography.subhead,
    fontFamily: 'DMSans_500Medium',
  },
  termsText: {
    ...theme.typography.footnote,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  termsLink: {},
});
