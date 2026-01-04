# Mac Screen Responsiveness Implementation Plan

## Overview

### Problem Statement
The AI Companion app (Expo/React Native) works correctly on iPad and iPhone but has visual and usability issues on Mac screens (which are significantly larger). The root cause is **6 files using static `Dimensions.get('window')`** which captures screen dimensions at module load time and never updates for window resizing or larger Mac displays.

### Impact on Mac (1440p+ screens)
- Tab bar stretches to 90% of screen width (~1296px on 1440p Mac) - far too wide
- Help modal at 90% width creates an enormous, hard-to-read modal
- Onboarding slides have excessive horizontal stretching
- Chat messages with `maxWidth: '85%'` are still ~1200px wide on Mac
- All bottom-sheet modals stretch to full screen width
- No column layout or centered content for wide screens

### Solution Approach
1. Create responsive utilities using React Native's `useWindowDimensions` hook
2. Define breakpoint constants for phone/tablet/desktop
3. Apply max-width constraints to all width-dependent components
4. Center content on wide screens instead of stretching

---

## Breakpoint Strategy

```typescript
// Breakpoint definitions
export const breakpoints = {
  phone: 0,      // 0-599px
  tablet: 600,   // 600-1024px
  desktop: 1024, // 1024px+
} as const;

// Max-width constraints for components
export const maxWidths = {
  tabBar: 600,           // Tab bar max width
  modal: 600,            // Standard modal max width
  wideModal: 800,        // Wide modal max width (CalendarModal)
  content: 700,          // Main content area max width
  chatBubble: 500,       // Chat message bubble max width
  onboardingSlide: 500,  // Onboarding slide max width
} as const;
```

### Screen Size Categories
| Category | Width Range | Behavior |
|----------|-------------|----------|
| Phone | < 600px | Use 90% width (current behavior) |
| Tablet | 600-1024px | Use responsive width with max constraints |
| Desktop/Mac | > 1024px | Use max-width constraints, center content |

---

## Implementation Phases

### Phase 1: Create Responsive Utilities

#### 1.1 Create New File: `src/ui/useResponsive.ts`

Create a custom hook that provides responsive utilities using `useWindowDimensions`.

> [!IMPORTANT]
> On Mac, users can resize windows dynamically. The `useWindowDimensions` hook handles this automatically, but ensure components don't create expensive re-renders on resize.


```typescript
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
```

#### 1.2 (Optional) Create Responsive Context Provider

For apps with many components using `useResponsive`, consider a Context to reduce hook calls:

```typescript
// src/ui/ResponsiveContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useResponsive } from './useResponsive';

type ResponsiveValue = ReturnType<typeof useResponsive>;

const ResponsiveContext = createContext<ResponsiveValue | null>(null);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const responsive = useResponsive();
  return (
    <ResponsiveContext.Provider value={responsive}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveContext() {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) throw new Error('useResponsiveContext must be used within ResponsiveProvider');
  return ctx;
}
```

> [!TIP]
> Wrap your app with `<ResponsiveProvider>` in `app/_layout.tsx` and use `useResponsiveContext()` instead of `useResponsive()` in child components for better performance.

#### 1.3 Modify: `src/ui/theme.ts`

Add breakpoints and max-width constants to the theme file for components that don't use hooks:

```typescript
// Add at the end of theme.ts, before the final export

export const responsive = {
  breakpoints: {
    phone: 0,
    tablet: 600,
    desktop: 1024,
  },
  maxWidths: {
    tabBar: 600,
    modal: 600,
    wideModal: 800,
    content: 700,
    chatBubble: 500,
    onboardingSlide: 500,
  },
} as const;
```

#### 1.4 Style Memoization Best Practice

When applying responsive styles, always memoize computed style objects to prevent unnecessary re-renders:

```typescript
// ❌ Bad - creates new object every render
<View style={[styles.container, isDesktop && { maxWidth: contentWidth }]} />

// ✅ Good - memoized style object
const containerStyle = useMemo(() => ([
  styles.container,
  isDesktop && { maxWidth: contentWidth, alignSelf: 'center' as const }
]), [isDesktop, contentWidth]);

<View style={containerStyle} />
```

---

### Phase 2: Fix Tab Bar Components

#### 2.1 Modify: `app/_layout.tsx`

**Current Code (line 27 and 337):**
```typescript
const { width } = Dimensions.get('window');
// ...
tabBarContainer: {
  width: width * 0.9,
  // ...
}
```

**Updated Code:**

1. Remove static Dimensions import usage
2. Use `useResponsive` hook inside `FloatingTabBar` component
3. Apply dynamic width with max constraint

```typescript
// Remove: const { width } = Dimensions.get('window');
// Add import:
import { useResponsive } from '../src/ui/useResponsive';

// Inside FloatingTabBar component:
function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { tabBarWidth } = useResponsive(); // Add this
  // ...rest of existing code

  return (
    <View
      style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={[
        styles.tabBarContainer, 
        { 
          width: tabBarWidth, // Changed from width * 0.9
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
        }
      ]}>
        {/* ...existing children */}
      </View>
    </View>
  );
}

// Update styles - remove static width:
const styles = StyleSheet.create({
  tabBarContainer: {
    // Remove: width: width * 0.9,
    height: 64,
    borderRadius: 32,
    // ...rest unchanged
  },
});
```

#### 2.2 Modify: `src/ui/components/FloatingTabBar.tsx`

**Current Code (line 8 and 90):**
```typescript
const { width } = Dimensions.get('window');
// ...
container: {
  width: width * 0.9,
}
```

**Updated Code:**

```typescript
// Remove: const { width } = Dimensions.get('window');
// Add import:
import { useResponsive } from '../useResponsive';

// Inside FloatingTabBar component:
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { tabBarWidth } = useResponsive(); // Add this
  // ...

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={[
        styles.container,
        {
          width: tabBarWidth, // Changed from width * 0.9
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.70)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
        }
      ]}>
        {/* ...existing children */}
      </View>
    </View>
  );
}

// Update styles - remove static width:
const styles = StyleSheet.create({
  container: {
    // Remove: width: width * 0.9,
    height: 64,
    // ...rest unchanged
  },
});
```

---

### Phase 3: Fix Modal Components

#### 3.1 Modify: `src/ui/components/HelpModal.tsx`

**Current Code (line 15 and 130):**
```typescript
const { width } = Dimensions.get('window');
// ...
modalContent: {
  width: width * 0.9,
}
```

**Updated Code:**

```typescript
// Remove: const { width } = Dimensions.get('window');
// Add import:
import { useResponsive } from '../useResponsive';

// Inside HelpModal component:
export const HelpModal = ({ visible, onClose }: HelpModalProps) => {
  const { isDark, colors } = useTheme();
  const { modalWidth } = useResponsive(); // Add this

  // ...existing code

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={isDark ? 80 : 95} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        
        <View style={[
          styles.modalContent, 
          { 
            width: modalWidth, // Changed from width * 0.9
            backgroundColor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.8)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }
        ]}>
          {/* ...existing children */}
        </View>
      </View>
    </Modal>
  );
};

// Update styles - remove static width:
const styles = StyleSheet.create({
  modalContent: {
    // Remove: width: width * 0.9,
    maxHeight: '80%',
    // ...rest unchanged
  },
});
```

#### 3.2 Modify: `src/ui/components/AddTaskModal.tsx`

This is a full-screen modal that needs centering on wide screens.

**Add import and hook usage:**

```typescript
import { useResponsive } from '../useResponsive';

export function AddTaskModal({ visible, onClose, onSaveSuccess }: AddTaskModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive(); // Add this
  const { addItem, items } = useItemsStore();
  // ...existing code

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[
          styles.container, 
          { 
            backgroundColor: colors.background,
            alignItems: isDesktop ? 'center' : undefined, // Center on desktop
          }
        ]}>
          <View style={[
            styles.innerContainer,
            isDesktop && { width: contentWidth, maxWidth: 700 }
          ]}>
            {/* Move all existing content inside this View */}
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              {/* ...existing header content */}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              {/* ...existing content */}
            </KeyboardAvoidingView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Add new style:
const styles = StyleSheet.create({
  // ...existing styles
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});
```

#### 3.3 Modify: `src/ui/components/AddNoteModal.tsx`

Apply the same pattern as AddTaskModal:

```typescript
import { useResponsive } from '../useResponsive';

export function AddNoteModal({ visible, onClose, onSaveSuccess }: AddNoteModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive(); // Add this
  // ...existing code

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[
          styles.container, 
          { 
            backgroundColor: colors.background,
            alignItems: isDesktop ? 'center' : undefined,
          }
        ]}>
          <View style={[
            styles.innerContainer,
            isDesktop && { width: contentWidth, maxWidth: 700 }
          ]}>
            {/* All existing content */}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Add new style:
const styles = StyleSheet.create({
  // ...existing styles
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});
```

#### 3.4 Modify: `src/ui/components/CalendarModal.tsx`

Add max-width constraint for the modal content:

```typescript
import { useResponsive } from '../useResponsive';

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isVisible,
  onClose,
  items,
  onItemPress,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, wideModalWidth } = useResponsive(); // Add this
  // ...existing code

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={[
        styles.modal,
        isDesktop && styles.modalDesktop // Add desktop-specific style
      ]}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      propagateSwipe
    >
      <View style={[
        styles.modalContent, 
        { 
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
        isDesktop && { 
          width: wideModalWidth,
          maxWidth: 800,
          alignSelf: 'center',
          height: '90%',
          borderRadius: theme.borderRadius.xl,
        }
      ]}>
        {/* ...existing children */}
      </View>
    </Modal>
  );
};

// Add new style:
const styles = StyleSheet.create({
  // ...existing styles
  modalDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

#### 3.5 Modify: `src/ui/components/EditItemModal.tsx`

Apply the same pattern as AddTaskModal for editing items:

```typescript
import { useResponsive } from '../useResponsive';

export function EditItemModal({ visible, onClose, item, onSaveSuccess }: EditItemModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive();
  // ...existing code

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[
          styles.container, 
          { 
            backgroundColor: colors.background,
            alignItems: isDesktop ? 'center' : undefined,
          }
        ]}>
          <View style={[
            styles.innerContainer,
            isDesktop && { width: contentWidth, maxWidth: 700 }
          ]}>
            {/* All existing content */}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
```

---

### Phase 4: Fix Screen Layouts

#### 4.1 Modify: `app/onboarding.tsx`

**Current Code (line 45 and 669):**
```typescript
const { width } = Dimensions.get('window');
// ...
slide: {
  width,
  // ...
}
```

**Updated Code:**

```typescript
// Remove: const { width } = Dimensions.get('window');
// Add import:
import { useWindowDimensions } from 'react-native';
import { useResponsive } from '../src/ui/useResponsive';

// Update OnboardingScreen component:
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions(); // Dynamic width for FlatList
  const { isDesktop, onboardingSlideWidth, maxWidths } = useResponsive();
  // ...existing code

  const renderSlide = ({ item, index }: { item: string; index: number }) => {
    const isActive = index === currentIndex;
    
    // Wrap each screen in a container that limits width on desktop
    const slideContent = (() => {
      switch (item) {
        case 'hero':
          return <HeroScreen isActive={isActive} colors={colors} isDark={isDark} />;
        // ...other cases
      }
    })();

    return (
      <View style={[
        styles.slideContainer,
        { width }, // FlatList item must be full screen width
      ]}>
        <View style={[
          styles.slideContent,
          isDesktop && { maxWidth: maxWidths.onboardingSlide }
        ]}>
          {slideContent}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ...existing LinearGradient */}

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        extraData={currentIndex}
        // Remove getItemLayout if using static width, or update it:
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* ...existing footer */}
    </View>
  );
}

// Update styles:
const styles = StyleSheet.create({
  // ...existing styles
  
  // Update slide style:
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 180,
    width: '100%',
  },
  
  // Remove width from slide style (now handled dynamically)
  slide: {
    // Remove: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 180,
  },
});
```

**Important:** Each individual screen component (HeroScreen, CaptureScreen, etc.) should also have their content constrained. Update them to accept an optional `maxWidth` prop or use internal constraints.

#### 4.2 Modify: `app/(tabs)/capture.tsx`

Add max-width constraint to the chat container:

```typescript
import { useResponsive } from '../../src/ui/useResponsive';

export default function CaptureScreen({ onClose }: CaptureScreenProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive(); // Add this
  // ...existing code

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Wrap content in centered container for desktop */}
        <View style={[
          styles.contentWrapper,
          isDesktop && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }
        ]}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            {/* ...existing header content */}
          </View>

          {/* ...Help Modal, AddTask Modal */}

          {/* Chat Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            // ...existing props
          >
            {/* ...existing content */}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ChatInputBar - Also needs max-width */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={isDesktop ? { alignItems: 'center' } : undefined}
      >
        <View style={isDesktop ? { width: contentWidth, maxWidth: 700 } : undefined}>
          <ChatInputBar
            onSend={handleSend}
            onVoicePress={startRecording}
            onPlusPress={handlePlusPress}
            onCancelRecording={cancelRecording}
            onSendRecording={stopAndSendRecording}
            isRecording={isRecording}
            isProcessing={isProcessing}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Toast - center on desktop */}
      {toastMessage && (
        <Animated.View 
          style={[
            styles.toast, 
            { 
              // ...existing styles
              maxWidth: isDesktop ? 400 : undefined,
              alignSelf: isDesktop ? 'center' : undefined,
            }
          ]}
        >
          {/* ...existing toast content */}
        </Animated.View>
      )}
    </View>
  );
}

// Add new style:
const styles = StyleSheet.create({
  // ...existing styles
  contentWrapper: {
    flex: 1,
  },
});
```

#### 4.4 Modify: `app/(tabs)/index.tsx` (Daily Brief)

Add max-width constraint to the Daily Brief screen:

```typescript
import { useResponsive } from '../../src/ui/useResponsive';
import { useMemo } from 'react';

export default function DailyBriefScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive();
  // ...existing code

  const containerStyle = useMemo(() => ([
    styles.container,
    { backgroundColor: colors.background },
    isDesktop && { alignItems: 'center' as const }
  ]), [colors.background, isDesktop]);

  const contentStyle = useMemo(() => ([
    styles.content,
    isDesktop && { maxWidth: contentWidth, width: '100%' as const }
  ]), [isDesktop, contentWidth]);

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          {/* ...existing header content */}
        </View>

        {/* ...existing ScrollView and content */}
      </View>
    </View>
  );
}
```

#### 4.5 Modify: `app/(tabs)/upcoming.tsx`

Add max-width constraint to the Upcoming screen:

```typescript
import { useResponsive } from '../../src/ui/useResponsive';
import { useMemo } from 'react';

export default function UpcomingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive();
  // ...existing code

  const containerStyle = useMemo(() => ([
    styles.container,
    { backgroundColor: colors.background },
    isDesktop && { alignItems: 'center' as const }
  ]), [colors.background, isDesktop]);

  const contentStyle = useMemo(() => ([
    styles.content,
    isDesktop && { maxWidth: contentWidth, width: '100%' as const }
  ]), [isDesktop, contentWidth]);

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        {/* ...existing FlatList and content */}
      </View>
    </View>
  );
}
```

#### 4.6 Desktop Sidebar Padding

When content is constrained on desktop, the sides will be empty. Consider adding a subtle background treatment:

```typescript
// In main tab screens, add to the outer container on desktop:
isDesktop && {
  paddingHorizontal: 24,
  backgroundColor: isDark ? '#0a0a0a' : '#f5f5f7', // Subtle backdrop
}
```

#### 4.7 Modify: `src/ui/components/ChatMessage.tsx`
  },
});
```

#### 4.3 Modify: `src/ui/components/ChatMessage.tsx`

**Current Code (line 114):**
```typescript
bubble: {
  maxWidth: '85%',
}
```

**Updated Code:**

The `ChatMessage` component doesn't use hooks, so we need to use a different approach. Either:

**Option A: Use useResponsive hook (recommended)**
```typescript
import { useResponsive } from '../useResponsive';

export function ChatMessage({ message }: ChatMessageProps) {
  const { colors, isDark } = useTheme();
  const { isDesktop, maxWidths } = useResponsive();
  const isUser = message.role === 'user';

  // Calculate max width for bubble
  const bubbleMaxWidth = isDesktop ? maxWidths.chatBubble : '85%';

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      <View
        style={[
          styles.bubble,
          { maxWidth: bubbleMaxWidth }, // Dynamic max width
          isUser
            ? [styles.bubbleUser, { backgroundColor: isDark ? '#2C2C2E' : colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F5' }],
        ]}
      >
        {/* ...existing content */}
      </View>
      {/* ...existing timestamp */}
    </View>
  );
}

// Update styles - remove maxWidth from bubble:
const styles = StyleSheet.create({
  bubble: {
    // Remove: maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  // ...rest unchanged
});
```

---

### Phase 5: Fix Animation Components

#### 5.1 Modify: `src/ui/components/TaskCelebration.tsx`

**Current Code (line 5):**
```typescript
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
```

**Updated Code:**

Since this component uses dimensions for particle positioning, we need dynamic values:

```typescript
// Remove: const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useWindowDimensions } from 'react-native';

// Move Particle component inside TaskCelebration or pass dimensions as props
interface ParticleProps {
  index: number;
  screenWidth: number;
  screenHeight: number;
}

const Particle = ({ index, screenWidth, screenHeight }: ParticleProps) => {
  // Use screenWidth and screenHeight instead of SCREEN_WIDTH and SCREEN_HEIGHT
  const initialX = Math.random() * screenWidth;
  const initialY = -50 - Math.random() * 100;
  
  const targetY = screenHeight * 0.4 + Math.random() * screenHeight * 0.5;
  const targetX = initialX + (Math.random() - 0.5) * 150;
  
  // ...rest of existing Particle code
};

export const TaskCelebration = ({ isVisible, onComplete }: TaskCelebrationProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (isVisible) {
      setParticles(Array.from({ length: PARTICLE_COUNT }, (_, i) => i));

      const timeout = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
        setParticles([]);
      }, 4000);

      return () => clearTimeout(timeout);
    } else {
      setParticles([]);
    }
  }, [isVisible, onComplete]);

  if (!isVisible && particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((i) => (
        <Particle 
          key={i} 
          index={i} 
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
};
```

#### 5.2 Modify: `src/ui/components/GlassyHeader.tsx`

**Current Code (line 12):**
```typescript
const { width } = Dimensions.get('window');
```

This width is captured but not used in the component. Simply remove the unused import:

```typescript
// Remove this line entirely:
// const { width } = Dimensions.get('window');
```

---

## Testing Checklist

### Test on Each Screen Size
Run the app and resize the window (on Mac) to test at:
- [ ] Phone width (~375px)
- [ ] Tablet width (~768px)
- [ ] Desktop width (~1440px)

### Mac-Specific Tests

> [!IMPORTANT]
> Mac users can dynamically resize windows. These tests are critical for a smooth Mac experience.

#### Window Resizing
- [ ] Resize window rapidly from phone to desktop width - no lag or jank
- [ ] Resize window to minimum allowed size - UI remains usable
- [ ] Maximize window - content stays centered and constrained
- [ ] Snap window to half-screen - layout adapts correctly

#### Keyboard Navigation (Mac)
- [ ] Tab key navigates between interactive elements
- [ ] Enter/Return activates focused buttons
- [ ] Escape closes modals
- [ ] Cmd+W doesn't unexpectedly close the app (if applicable)

#### Multi-Window (if applicable)
- [ ] Opening multiple windows works correctly
- [ ] Each window has independent responsive state

### Component-Specific Tests

#### Tab Bar
- [ ] Tab bar is centered and has max-width of 600px on desktop
- [ ] Tab bar still spans 90% width on phone
- [ ] All tab icons are still tappable
- [ ] Hover states work on Mac (if implemented)

#### Help Modal
- [ ] Modal is centered and constrained to 600px max on desktop
- [ ] Content is readable and not stretched
- [ ] Close button works
- [ ] Click outside modal closes it

#### Onboarding
- [ ] Slides are centered with constrained width on desktop
- [ ] Pagination dots remain visible
- [ ] Swiping still works (trackpad gesture)
- [ ] CTA button width is appropriate
- [ ] Keyboard arrow keys navigate slides (if implemented)

#### Capture/Chat Screen
- [ ] Chat messages have constrained width on desktop
- [ ] Input bar is centered and constrained
- [ ] Voice recording UI works
- [ ] Toast notifications are centered
- [ ] Text selection works with mouse

#### Daily Brief & Upcoming Screens
- [ ] Content is centered with max-width on desktop
- [ ] Lists remain scrollable
- [ ] Item interactions work (check, edit, delete)

#### Other Modals
- [ ] AddTaskModal content is centered on desktop
- [ ] AddNoteModal content is centered on desktop
- [ ] EditItemModal content is centered on desktop
- [ ] CalendarModal is appropriately sized and centered

#### Animations
- [ ] TaskCelebration confetti covers screen appropriately
- [ ] Confetti responds to window resize

---

## Risk Assessment

### Potential Issues

| Risk | Impact | Mitigation |
|------|--------|------------|
| FlatList performance with dynamic width | Onboarding may stutter | Use `getItemLayout` with dynamic width calculation |
| Particle animation jank | Visual glitches | Memoize Particle component, limit particle count |
| Modal centering on different platforms | Inconsistent UX | Test thoroughly on iOS, Android, and Mac |
| Breaking existing phone/tablet layouts | Regression | Conditional styling only applies at desktop breakpoint |

### Rollback Strategy
If issues arise, the changes are isolated to:
1. One new utility file (`useResponsive.ts`)
2. Theme additions (non-breaking)
3. Component-specific style changes (can be reverted individually)

### Performance Considerations
- `useWindowDimensions` is optimized and batches updates
- Avoid creating new style objects on every render - use conditional spreading
- Memoize expensive calculations in animations

---

## File Change Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `src/ui/useResponsive.ts` | **NEW** | P0 |
| `src/ui/ResponsiveContext.tsx` | **NEW** (Optional) | P3 |
| `src/ui/theme.ts` | Modify | P0 |
| `app/_layout.tsx` | Modify | P1 |
| `src/ui/components/FloatingTabBar.tsx` | Modify | P1 |
| `src/ui/components/HelpModal.tsx` | Modify | P1 |
| `src/ui/components/AddTaskModal.tsx` | Modify | P2 |
| `src/ui/components/AddNoteModal.tsx` | Modify | P2 |
| `src/ui/components/EditItemModal.tsx` | Modify | P2 |
| `src/ui/components/CalendarModal.tsx` | Modify | P2 |
| `app/onboarding.tsx` | Modify | P1 |
| `app/(tabs)/index.tsx` | Modify | P1 |
| `app/(tabs)/upcoming.tsx` | Modify | P1 |
| `app/(tabs)/capture.tsx` | Modify | P2 |
| `src/ui/components/ChatMessage.tsx` | Modify | P2 |
| `src/ui/components/TaskCelebration.tsx` | Modify | P3 |
| `src/ui/components/GlassyHeader.tsx` | Modify (cleanup) | P3 |

---

## Implementation Order

1. **Phase 1**: Create `useResponsive.ts` and update `theme.ts`
2. **Phase 2**: Fix tab bar components (most visible issue)
3. **Phase 3**: Fix modal components
4. **Phase 4**: Fix screen layouts (onboarding, capture)
5. **Phase 5**: Fix animation components

Each phase can be tested independently before moving to the next.