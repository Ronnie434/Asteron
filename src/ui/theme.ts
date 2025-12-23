// Apple-inspired design system
// Clean, minimal, light backgrounds with subtle glass effects

// Light Theme Colors
export const lightColors = {
    // Backgrounds - Light, clean
    background: '#F2F2F7', // iOS light gray
    backgroundSecondary: '#FFFFFF',

    // Cards - White with subtle effects
    card: '#FFFFFF',
    cardElevated: 'rgba(255,255,255,0.95)',

    // Text - System colors
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',

    // Primary accent - iOS blue
    primary: '#007AFF',
    primaryLight: 'rgba(0, 122, 255, 0.1)',
    accent: '#5856D6', // iOS purple for premium features

    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',

    // Borders
    separator: 'rgba(60, 60, 67, 0.12)',

    // Glass effect
    glass: 'rgba(255,255,255,0.8)',
    glassBorder: 'rgba(0,0,0,0.04)',

    // Surface variants
    surface: '#FFFFFF',
    surfaceSecondary: '#F9F9F9',
} as const;

// Dark Theme Colors
export const darkColors = {
    // Backgrounds - Dark, clean
    background: '#000000', // Pure black
    backgroundSecondary: '#1C1C1E',

    // Cards - Dark with subtle effects
    card: '#1C1C1E',
    cardElevated: 'rgba(28, 28, 30, 0.95)',

    // Text - System colors (dark mode)
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#8E8E93', // iOS standard tertiary text for dark mode

    // Primary accent - iOS blue (same in dark)
    primary: '#0A84FF',
    primaryLight: 'rgba(10, 132, 255, 0.15)',
    accent: '#5E5CE6', // iOS purple for premium features (dark mode)

    // Semantic colors (brighter for dark mode)
    success: '#32D74B',
    warning: '#FF9F0A',
    danger: '#FF453A',

    // Borders
    separator: 'rgba(84, 84, 88, 0.6)',

    // Glass effect
    glass: 'rgba(28, 28, 30, 0.8)',
    glassBorder: 'rgba(255,255,255,0.08)',

    // Surface variants
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
} as const;

export const theme = {
    colors: lightColors, // Default to light

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 20,
        xl: 24,
        xxl: 32,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },

    typography: {
        largeTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 34,
            fontWeight: '700' as const,
            letterSpacing: 0.37,
        },
        title1: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 28,
            fontWeight: '700' as const,
            letterSpacing: 0.36,
        },
        title2: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 22,
            fontWeight: '700' as const,
            letterSpacing: 0.35,
        },
        title3: {
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 20,
            fontWeight: '600' as const,
            letterSpacing: 0.38,
        },
        headline: {
            fontFamily: 'DMSans_500Medium',
            fontSize: 17,
            fontWeight: '500' as const,
            letterSpacing: -0.41,
        },
        body: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 17,
            fontWeight: '400' as const,
            letterSpacing: -0.41,
        },
        callout: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            fontWeight: '400' as const,
            letterSpacing: -0.32,
        },
        subhead: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            fontWeight: '400' as const,
            letterSpacing: -0.24,
        },
        footnote: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            fontWeight: '400' as const,
            letterSpacing: -0.08,
        },
        caption1: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            fontWeight: '400' as const,
            letterSpacing: 0,
        },
        caption2: {
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            fontWeight: '400' as const,
            letterSpacing: 0.07,
        },
    },

    shadows: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        elevated: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
        },
    },
} as const;
