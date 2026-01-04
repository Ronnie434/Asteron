import { useWindowDimensions, Platform } from 'react-native';
import { useMemo } from 'react';

export const breakpoints = {
  phone: 0,
  tablet: 600,
  desktop: 1024,
} as const;

export const maxWidths = {
  tabBar: 600,
  modal: 600,
  wideModal: 800,
  content: 700,
  chatBubble: 500,
  onboardingSlide: 500,
} as const;

// Platform detection for Mac-specific behavior
export const isMac = Platform.OS === 'macos' || 
  (Platform.OS === 'web' && /Mac/.test(navigator?.userAgent || ''));

export type ScreenSize = 'phone' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const screenSize: ScreenSize = 
    width >= breakpoints.desktop ? 'desktop' :
    width >= breakpoints.tablet ? 'tablet' : 'phone';

  const isPhone = screenSize === 'phone';
  const isTablet = screenSize === 'tablet';
  const isDesktop = screenSize === 'desktop';

  // Helper function: returns responsive width with max constraint
  const getResponsiveWidth = (
    percentage: number, 
    maxWidth: number
  ): number => {
    const calculatedWidth = width * percentage;
    return Math.min(calculatedWidth, maxWidth);
  };

  // Common responsive widths
  const tabBarWidth = getResponsiveWidth(0.9, maxWidths.tabBar);
  const modalWidth = getResponsiveWidth(0.9, maxWidths.modal);
  const wideModalWidth = getResponsiveWidth(0.95, maxWidths.wideModal);
  const contentWidth = getResponsiveWidth(0.95, maxWidths.content);
  const onboardingSlideWidth = isDesktop 
    ? maxWidths.onboardingSlide 
    : width; // Full width on phone/tablet

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Raw dimensions (reactive)
    width,
    height,
    
    // Screen size helpers
    screenSize,
    isPhone,
    isTablet,
    isDesktop,
    isMac,
    
    // Breakpoints and max-widths
    breakpoints,
    maxWidths,
    
    // Pre-calculated responsive widths
    tabBarWidth,
    modalWidth,
    wideModalWidth,
    contentWidth,
    onboardingSlideWidth,
    
    // Utility function
    getResponsiveWidth,
  }), [width, height, screenSize, tabBarWidth, modalWidth, wideModalWidth, contentWidth, onboardingSlideWidth]);
}