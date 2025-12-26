// Apple-inspired design system
// Clean, minimal, light backgrounds with subtle glass effects

/**
 * Convert hex color to rgba with alpha
 * @param hex - Hex color (e.g., "#EF4444" or "#FFF")
 * @param alpha - Alpha value 0-1 (e.g., 0.1 for 10% opacity)
 */
export const hexToRgba = (hex: string, alpha: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Handle short hex (e.g., #FFF)
    const fullHex = cleanHex.length === 3
        ? cleanHex.split('').map(c => c + c).join('')
        : cleanHex;

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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

    // Primary accent - Modern Indigo (AI-inspired)
    primary: '#6366F1',
    primaryLight: 'rgba(99, 102, 241, 0.12)',
    accent: '#EC4899', // Rose pink for premium features

    // Semantic colors
    success: '#10B981', // Modern emerald
    warning: '#F59E0B', // Amber
    danger: '#EF4444', // Modern red

    // Borders
    separator: 'rgba(60, 60, 67, 0.12)',

    // Glass effect
    glass: 'rgba(255,255,255,0.8)',
    glassBorder: 'rgba(0,0,0,0.04)',
    glassHighlight: 'rgba(255,255,255,0.4)',

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

    // Primary accent - Brighter Indigo for dark mode
    primary: '#818CF8',
    primaryLight: 'rgba(129, 140, 248, 0.18)',
    accent: '#F472B6', // Lighter rose for dark mode

    // Semantic colors (brighter for dark mode)
    success: '#34D399', // Brighter emerald
    warning: '#FBBF24', // Brighter amber
    danger: '#F87171', // Brighter red

    // Borders
    separator: 'rgba(84, 84, 88, 0.6)',

    // Glass effect
    glass: 'rgba(28, 28, 30, 0.8)',
    glassBorder: 'rgba(255,255,255,0.08)',
    glassHighlight: 'rgba(255,255,255,0.1)',

    // Surface variants
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
} as const;

export const theme = {
    colors: lightColors, // Default to light

    gradients: {
        background: ['#F2F2F7', '#FFFFFF'],
    },

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
