import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withSequence, 
    withTiming, 
    Easing,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../ui/theme';

interface LoadingScreenProps {
    /**
     * Optional message to display below the loader
     */
    message?: string;
    /**
     * If true, renders a BlurView background for overlay on top of content
     */
    overlay?: boolean;
}

/**
 * A premium loading screen with a breathing/pulsing logo animation.
 * Can be used as a full screen loader or an overlay.
 */
export const LoadingScreen = ({ message, overlay = false }: LoadingScreenProps) => {
    const { colors, isDark } = useTheme();
    
    // Animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        // Breathing animation
        // Scale: 1 -> 1.2 -> 1
        scale.value = withRepeat(
            withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        // Opacity: 0.5 -> 1 -> 0.5
        opacity.value = withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const Logo = () => (
        <Animated.Image
            source={require('../../assets/AI_Companion_icon.png')}
            style={[styles.logo, animatedStyle]}
            resizeMode="cover"
        />
    );

    const Content = () => (
        <Animated.View 
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(300)}
            style={styles.contentContainer}
        >
            <View style={[styles.logoContainer, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                shadowColor: colors.primary,
                shadowOpacity: isDark ? 0.3 : 0.1,
            }]}>
                <Logo />
            </View>
            
            {message && (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {message}
                </Text>
            )}
        </Animated.View>
    );

    if (overlay) {
        return (
            <View style={[StyleSheet.absoluteFill, styles.overlayContainer]}>
                <BlurView 
                    intensity={isDark ? 40 : 60} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={StyleSheet.absoluteFill} 
                />
                <Content />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Content />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        elevation: 8,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 30,
    },
    message: {
        ...theme.typography.body,
        textAlign: 'center',
        fontWeight: '500',
    },
});
