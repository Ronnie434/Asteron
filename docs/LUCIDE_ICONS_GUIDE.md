# Lucide Icons Guide

## Overview
The app now has **two icon libraries** available:
1. **Ionicons** (from `@expo/vector-icons`) - iOS-style icons
2. **Lucide React Native** - Modern, consistent icon set

## Installation
```bash
npm install lucide-react-native
```

## Basic Usage

### Import Icons
```tsx
import { Calendar, Clock, Sparkles, Mic, Check } from 'lucide-react-native';
```

### Use in Components
```tsx
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { colors } = useTheme();
  
  return (
    <Calendar 
      size={24} 
      color={colors.primary} 
      strokeWidth={2}
    />
  );
}
```

## Common Icons Mapping

Here's how Lucide icons map to your current Ionicons:

| Purpose | Ionicons | Lucide Alternative |
|---------|----------|-------------------|
| AI/Magic | `sparkles` | `Sparkles` |
| Voice | `mic` | `Mic` |
| Calendar | `calendar-outline` | `Calendar` |
| Time/Alarm | `alarm-outline` | `Clock` or `AlarmClock` |
| Checkmark | `checkmark-circle` | `CheckCircle` or `Check` |
| Forward Arrow | `chevron-forward` | `ChevronRight` |
| Edit/Create | `create-outline` | `Edit` or `Pencil` |
| Flag | `flag-outline` | `Flag` |
| Moon | `moon` | `Moon` |
| Sun | `sunny` | `Sun` |
| Close | `close` | `X` |
| Home | `home` | `Home` |
| Chat | `chatbubble-outline` | `MessageCircle` |
| Person | `person-outline` | `User` |

## Props

Lucide icons accept these props:
- `size` - Number (default: 24)
- `color` - String (hex, rgb, or named color)
- `strokeWidth` - Number (default: 2)
- `absoluteStrokeWidth` - Boolean (maintains stroke width at any size)

## Example: Replacing an Icon

### Before (Ionicons)
```tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="calendar-outline" size={20} color={colors.primary} />
```

### After (Lucide)
```tsx
import { Calendar } from 'lucide-react-native';

<Calendar size={20} color={colors.primary} strokeWidth={2} />
```

## Benefits of Lucide

1. **Consistency** - All icons follow the same design language
2. **Tree-shakeable** - Only imports icons you use
3. **Customizable** - Easy to adjust stroke width
4. **Modern** - Clean, minimalist design
5. **Type-safe** - Full TypeScript support

## When to Use Which Library

### Use Ionicons when:
- You need platform-specific icons (iOS/Android)
- Working with existing code that uses Ionicons
- Need filled icon variants

### Use Lucide when:
- Creating new components
- Want consistent stroke-based icons
- Need fine control over stroke width
- Prefer a more modern, minimal aesthetic

## Popular Lucide Icons for Your App

```tsx
// Navigation & Actions
import { 
  Home, Calendar, User, Settings, Menu, X, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp 
} from 'lucide-react-native';

// Communication & Media
import { 
  MessageCircle, Mic, Phone, Video, Mail, Send 
} from 'lucide-react-native';

// Time & Scheduling
import { 
  Clock, AlarmClock, Timer, CalendarDays, CalendarCheck 
} from 'lucide-react-native';

// Status & Feedback
import { 
  Check, CheckCircle, X, XCircle, AlertCircle, 
  Info, AlertTriangle 
} from 'lucide-react-native';

// AI & Special
import { 
  Sparkles, Zap, Star, Heart, Bookmark, Flag 
} from 'lucide-react-native';

// Editing & Creation
import { 
  Edit, Pencil, Plus, Minus, Trash, Save 
} from 'lucide-react-native';
```

## Example Component

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, Flag } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export function TaskCard() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Team Meeting
      </Text>
      
      <View style={styles.metadata}>
        <View style={styles.metaItem}>
          <Calendar size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Today
          </Text>
        </View>
        
        <View style={styles.metaItem}>
          <Clock size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            2:00 PM
          </Text>
        </View>
        
        <View style={styles.metaItem}>
          <Flag size={16} color={colors.accent} strokeWidth={2} />
          <Text style={[styles.metaText, { color: colors.accent }]}>
            High
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
});
```

## Resources

- [Lucide Icons Directory](https://lucide.dev/icons/)
- [Lucide React Native Docs](https://github.com/lucide-icons/lucide/tree/main/packages/lucide-react-native)
