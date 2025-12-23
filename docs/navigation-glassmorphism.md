# Navigation Bar Glassmorphism

## Overview
The navigation bar has been updated to use native iOS-like glassmorphism effect using `expo-blur`.

## Changes Made

### 1. BlurView Integration
- Replaced the solid `View` with `BlurView` from `expo-blur`
- Added proper blur intensity (100) for a strong blur effect
- Set tint to 'light' for iOS to match native iOS appearance

### 2. Background Transparency
- **iOS**: Uses `rgba(255, 255, 255, 0.15)` - highly transparent to let blur show through
- **Android**: Uses `rgba(255, 255, 255, 0.95)` - more opaque as fallback

### 3. Border Styling
- **iOS**: Subtle 0.5px border with 30% white opacity
- **Android**: Standard 1px border with 90% white opacity

### 4. Shadow Enhancement
- Increased shadow offset to `{ width: 0, height: 8 }`
- Larger shadow radius (24) for more depth
- Adjusted shadow opacity to 0.12 for subtlety

### 5. Active Tab Indicator
- **iOS**: Semi-transparent blue `rgba(0, 122, 255, 0.15)` for glassy effect
- **Android**: Uses theme's primaryLight color

## Customization Options

### Blur Intensity
Adjust the `intensity` prop on BlurView (range: 0-100):
```tsx
<BlurView intensity={80}> {/* Less blur */}
<BlurView intensity={100}> {/* More blur - current */}
```

### Tint Options
Change the blur tint (affects the color tone):
```tsx
tint="light"    // Current - bright, clean look
tint="dark"     // Dark mode variant
tint="default"  // System default
```

### Background Transparency
Adjust in `tabBarContainer` style:
```tsx
backgroundColor: 'rgba(255, 255, 255, 0.15)' // Current
backgroundColor: 'rgba(255, 255, 255, 0.05)' // More transparent
backgroundColor: 'rgba(255, 255, 255, 0.25)' // Less transparent
```

## Native iOS Comparison
The current implementation closely mimics native iOS features:
- ✅ Blur effect with material transparency
- ✅ Subtle white overlay
- ✅ Soft shadows for depth
- ✅ Minimal borders
- ✅ Content visibility through blur

## Platform Differences
- **iOS**: Full glassmorphism with BlurView
- **Android**: Fallback to semi-transparent background (BlurView still works but effect may vary by device)

## Performance Notes
- BlurView is GPU-accelerated on iOS
- Minimal performance impact
- `overflow: 'hidden'` is required for proper blur rendering within border radius
