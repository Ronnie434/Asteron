import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert, Image, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';

import { 
  Sun, Moon, Smartphone, X, CheckCircle, ChevronRight, 
  ShieldCheck, FileText, Info, Trash, LogOut, Mail, Calendar
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useItemsStore } from '../../src/store/useItemsStore';
import { GradientSparkles } from '../../src/ui/components/RainbowSparkles';
import * as WebBrowser from 'expo-web-browser';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';
import DateTimePicker from '@react-native-community/datetimepicker';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light Mode', description: 'Always use light theme', Icon: Sun },
  { value: 'dark', label: 'Dark Mode', description: 'Always use dark theme', Icon: Moon },
  { value: 'system', label: 'System', description: 'Follow system theme', Icon: Smartphone },
];

// Extracted outside of SettingsScreen to prevent re-creation on each render
const SettingRow = ({ 
  Icon, 
  title, 
  subtitle,
  value,
  onToggle,
  showArrow = false,
  danger = false,
  onPress,
  colors,
}: {
  Icon: typeof Sun;
  title: string;
  subtitle?: string;
  value?: boolean;
  onToggle?: (val: boolean) => void;
  showArrow?: boolean;
  danger?: boolean;
  onPress?: () => void;
  colors: any;
}) => (
  <TouchableOpacity 
    style={styles.row}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress && !onToggle}
  >
    <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
      <Icon 
        size={20} 
        color={danger ? colors.danger : colors.primary} 
        strokeWidth={2}
      />
    </View>
    <View style={styles.rowContent}>
      <Typography 
        variant="body" 
        color={danger ? colors.danger : colors.text}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="footnote" color={colors.textSecondary}>
          {subtitle}
        </Typography>
      )}
    </View>
    {onToggle && (
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E5EA', true: colors.success }}
        thumbColor="#FFFFFF"
      />
    )}
    {showArrow && (
      <ChevronRight size={20} color={colors.textTertiary} />
    )}
  </TouchableOpacity>
);

import { useSettingsStore } from '../../src/store/useSettingsStore';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut, user, isGuestMode, guestName } = useAuthStore();
  const { 
    quietHoursEnabled, setQuietHoursEnabled, 
    quietHoursStart, setQuietHoursStart,
    quietHoursEnd, setQuietHoursEnd,
    dailyBriefEnabled, setDailyBriefEnabled,
    dailyBriefTime, setDailyBriefTime,
    weeklyBriefEnabled, setWeeklyBriefEnabled,
    weeklyBriefDay, setWeeklyBriefDay,
    weeklyBriefTime, setWeeklyBriefTime
  } = useSettingsStore();
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const formatTimeDisplay = (timeStr: string) => {
    // Convert 24h string "HH:mm" to 12h display
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  const [quietHoursModalVisible, setQuietHoursModalVisible] = useState(false);
  const [dailyBriefModalVisible, setDailyBriefModalVisible] = useState(false);
  const [weeklyBriefModalVisible, setWeeklyBriefModalVisible] = useState(false);

  const formatTimeRange = () => {
    return `${formatTimeDisplay(quietHoursStart)} – ${formatTimeDisplay(quietHoursEnd)}`;
  };

  const ThemeModal = () => (
    <Modal
      visible={themeModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setThemeModalVisible(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setThemeModalVisible(false)}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Draggable Handle Indicator */}
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <Typography variant="headline">Choose Theme</Typography>
            <TouchableOpacity onPress={() => setThemeModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {THEME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                themeMode === option.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setThemeMode(option.value);
                setThemeModalVisible(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.themeOptionIcon,
                { backgroundColor: themeMode === option.value ? 'rgba(255,255,255,0.2)' : colors.primaryLight }
              ]}>
                <option.Icon 
                  size={22} 
                  color={themeMode === option.value ? '#FFFFFF' : colors.primary} 
                  strokeWidth={2}
                />
              </View>
              <View style={styles.themeOptionContent}>
                <Typography 
                  variant="body" 
                  color={themeMode === option.value ? '#FFFFFF' : colors.text}
                >
                  {option.label}
                </Typography>
                <Typography 
                  variant="footnote" 
                  color={themeMode === option.value ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
                >
                  {option.description}
                </Typography>
              </View>
              {themeMode === option.value && (
                <CheckCircle size={24} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          ))}
          
          {/* Safety padding for bottom notch */}
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );

  const UserProfileSection = () => {
    // Get user display name - use guest name if in guest mode
    const displayName = isGuestMode 
      ? guestName 
      : (user?.user_metadata?.full_name || 
         user?.user_metadata?.name || 
         user?.email?.split('@')[0] || 
         'User');
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const subtitle = isGuestMode ? 'Guest Account' : (user?.email || '');
    
    return (
      <Card style={styles.profileCard}>
        <TouchableOpacity 
          style={styles.profileContent}
          activeOpacity={0.7}
          onPress={() => {/* Navigate to profile edit */}}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Typography variant="title2" color="#FFFFFF">
                {initials}
              </Typography>
            </LinearGradient>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Typography variant="headline" style={styles.userName}>
              {displayName}
            </Typography>
            <Typography 
              variant="footnote" 
              color={colors.textSecondary}
              numberOfLines={1}
            >
              {subtitle}
            </Typography>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </Card>
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your items. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await useItemsStore.getState().clearAllItems();
            Alert.alert('Done', 'All data has been deleted.');
          }
        },
      ]
    );
  };

  const openLegalDocument = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open the link.');
    }
  };


  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <GlassyHeader title="Settings" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        <UserProfileSection />

        {/* Appearance */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.sectionLabel}
        >
          APPEARANCE
        </Typography>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setThemeModalVisible(true)}
            activeOpacity={0.6}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              {isDark ? (
                <Moon size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <Sun size={20} color={colors.primary} strokeWidth={2} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Typography variant="body">Theme</Typography>
            </View>
            <Typography variant="body" color={colors.textSecondary} style={{ marginRight: 4 }}>
              {getThemeLabel()}
            </Typography>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>
        <ThemeModal />

        {/* Notifications */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.sectionLabel}
        >
          NOTIFICATIONS
        </Typography>
        <Card style={styles.card}>
          <SettingRow
            Icon={Moon}
            title="Quiet Hours"
            subtitle={formatTimeRange()}
            value={quietHoursEnabled}
            onToggle={(enabled) => {
              setQuietHoursEnabled(enabled);
              if (enabled) {
                setQuietHoursModalVisible(true);
              }
            }}
            onPress={() => setQuietHoursModalVisible(true)}
            colors={colors}
          />
        </Card>
        <QuietHoursModal 
          visible={quietHoursModalVisible} 
          onClose={() => setQuietHoursModalVisible(false)}
          quietHoursStart={quietHoursStart}
          quietHoursEnd={quietHoursEnd}
          setQuietHoursStart={setQuietHoursStart}
          setQuietHoursEnd={setQuietHoursEnd}
          colors={colors}
        />

        {/* Email Briefs */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.sectionLabel}
        >
          EMAIL BRIEFS
        </Typography>
        <Card style={styles.card}>
          <SettingRow
            Icon={Sun}
            title="Daily Brief"
            subtitle={dailyBriefEnabled ? `Every day at ${formatTimeDisplay(dailyBriefTime)}` : 'Get your day at a glance'}
            value={dailyBriefEnabled}
            onToggle={(enabled) => {
              setDailyBriefEnabled(enabled);
              if (enabled) {
                setDailyBriefModalVisible(true);
              }
            }}
            onPress={() => setDailyBriefModalVisible(true)}
            colors={colors}
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={Calendar}
            title="Weekly Brief"
            subtitle={weeklyBriefEnabled 
              ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weeklyBriefDay]} at ${formatTimeDisplay(weeklyBriefTime)}` 
              : 'Plan your week ahead'}
            value={weeklyBriefEnabled}
            onToggle={(enabled) => {
              setWeeklyBriefEnabled(enabled);
              if (enabled) {
                setWeeklyBriefModalVisible(true);
              }
            }}
            onPress={() => setWeeklyBriefModalVisible(true)}
            colors={colors}
          />
        </Card>
        <DailyBriefModal
          visible={dailyBriefModalVisible}
          onClose={() => setDailyBriefModalVisible(false)}
          dailyBriefTime={dailyBriefTime}
          setDailyBriefTime={setDailyBriefTime}
          colors={colors}
        />
        <WeeklyBriefModal
          visible={weeklyBriefModalVisible}
          onClose={() => setWeeklyBriefModalVisible(false)}
          weeklyBriefDay={weeklyBriefDay}
          weeklyBriefTime={weeklyBriefTime}
          setWeeklyBriefDay={setWeeklyBriefDay}
          setWeeklyBriefTime={setWeeklyBriefTime}
          colors={colors}
        />

        {/* About */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
          style={styles.sectionLabel}
        >
          ABOUT
        </Typography>
        <Card style={styles.card}>
          <SettingRow
            Icon={ShieldCheck}
            title="Privacy Policy"
            showArrow
            onPress={() => openLegalDocument('https://asteron.app/#privacy')}
            colors={colors}
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={FileText}
            title="Terms of Service"
            showArrow
            onPress={() => openLegalDocument('https://asteron.app/#terms')}
            colors={colors}
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={Info}
            title="Version"
            subtitle="1.0.0"
            colors={colors}
          />
        </Card>

        {/* Account */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
          style={styles.sectionLabel}
        >
          ACCOUNT
        </Typography>
        <Card style={styles.card}>
          <SettingRow
            Icon={LogOut}
            title="Sign Out"
            subtitle={user?.email || ''}
            showArrow
            onPress={handleSignOut}
            colors={colors}
          />
        </Card>

        {/* Data */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
          style={styles.sectionLabel}
        >
          DATA
        </Typography>
        <Card style={styles.card}>
          <SettingRow
            Icon={Trash}
            title="Delete All Data"
            danger
            showArrow
            onPress={handleDeleteData}
            colors={colors}
          />
        </Card>

        {/* App Branding */}
        <View style={styles.appBrandingContainer}>
          <Image 
            source={require('../../assets/AI_Companion_icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Typography variant="headline" style={styles.appName}>
            Asteron
          </Typography>
          <Typography variant="footnote" color={isDark ? colors.textSecondary : '#4A4A4A'}>
            Your intelligent personal assistant
          </Typography>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Typography variant="caption1" color={isDark ? colors.textTertiary : '#8E8E93'}>
            {isGuestMode 
              ? 'Sign in to save your data securely.' 
              : 'Your data is stored securely in the cloud.'}
          </Typography>
        </View>
      </ScrollView>
    </View>
  );
}

// Extracted Component to prevent re-renders
const QuietHoursModal = ({ 
  visible, 
  onClose, 
  quietHoursStart, 
  quietHoursEnd, 
  setQuietHoursStart, 
  setQuietHoursEnd,
  colors
}: {
  visible: boolean;
  onClose: () => void;
  quietHoursStart: string;
  quietHoursEnd: string;
  setQuietHoursStart: (val: string) => void;
  setQuietHoursEnd: (val: string) => void;
  colors: any;
}) => {
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end' | null>(null);

  const formatTimeDisplay = (timeStr: string) => {
    // Convert 24h string "HH:mm" to 12h display
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getTimeDate = (field: 'start' | 'end') => {
    const timeStr = field === 'start' ? quietHoursStart : quietHoursEnd;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate && activeTimeField) {
      // Format to HH:mm for storage
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      if (activeTimeField === 'start') {
        setQuietHoursStart(timeStr);
      } else {
        setQuietHoursEnd(timeStr);
      }
    }
  };

  const toggleTimePicker = (field: 'start' | 'end') => {
    if (activeTimeField === field) {
      setActiveTimeField(null); // Close if already open
    } else {
      setActiveTimeField(field); // Open new
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <Typography variant="headline">Quiet Hours</Typography>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: theme.spacing.lg }}>
            Notifications will be silenced and rescheduled to the end of this window.
          </Typography>

          <Card style={styles.card}>
            {/* Start Time Row */}
            <TouchableOpacity
              style={[styles.row, { paddingVertical: 16 }]}
              onPress={() => toggleTimePicker('start')}
            >
              <View style={styles.rowContent}>
                <Typography variant="body">Start Time</Typography>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Typography variant="body" color={activeTimeField === 'start' ? colors.primary : colors.text}>
                  {formatTimeDisplay(quietHoursStart)}
                </Typography>
                {/* No chevron needed if we expand inline, or maybe keep it but rotate? kept simple for now */}
              </View>
            </TouchableOpacity>
            
            {activeTimeField === 'start' && (
              <DateTimePicker
                value={getTimeDate('start')}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={onTimeChange}
                themeVariant="light"
                style={{ height: 120, width: '100%' }}
              />
            )}

            <View style={styles.separator} />
            
            {/* End Time Row */}
            <TouchableOpacity
              style={[styles.row, { paddingVertical: 16 }]}
              onPress={() => toggleTimePicker('end')}
            >
              <View style={styles.rowContent}>
                <Typography variant="body">End Time</Typography>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Typography variant="body" color={activeTimeField === 'end' ? colors.primary : colors.text}>
                  {formatTimeDisplay(quietHoursEnd)}
                </Typography>
              </View>
            </TouchableOpacity>

            {activeTimeField === 'end' && (
              <DateTimePicker
                value={getTimeDate('end')}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={onTimeChange}
                themeVariant="light"
                style={{ height: 120, width: '100%' }}
              />
            )}
          </Card>
          
          <View style={{ height: 40 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Daily Brief Modal - Time picker only
const DailyBriefModal = ({
  visible,
  onClose,
  dailyBriefTime,
  setDailyBriefTime,
  colors
}: {
  visible: boolean;
  onClose: () => void;
  dailyBriefTime: string;
  setDailyBriefTime: (time: string) => void;
  colors: any;
}) => {
  const formatTimeDisplay = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getTimeDate = () => {
    const [hours, minutes] = dailyBriefTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setDailyBriefTime(`${hours}:${minutes}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <Typography variant="headline">Daily Brief Time</Typography>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: theme.spacing.lg }}>
            Choose what time you want to receive your daily email brief.
          </Typography>

          <Card style={styles.card}>
            <View style={[styles.row, { justifyContent: 'center', paddingVertical: 8 }]}>
              <DateTimePicker
                value={getTimeDate()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={onTimeChange}
                themeVariant="dark"
                style={{ height: 150, width: '100%' }}
              />
            </View>
          </Card>
          
          <View style={{ height: 40 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Weekly Brief Modal - Day selector + Time picker
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WeeklyBriefModal = ({
  visible,
  onClose,
  weeklyBriefDay,
  weeklyBriefTime,
  setWeeklyBriefDay,
  setWeeklyBriefTime,
  colors
}: {
  visible: boolean;
  onClose: () => void;
  weeklyBriefDay: number;
  weeklyBriefTime: string;
  setWeeklyBriefDay: (day: number) => void;
  setWeeklyBriefTime: (time: string) => void;
  colors: any;
}) => {
  const getTimeDate = () => {
    const [hours, minutes] = weeklyBriefTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setWeeklyBriefTime(`${hours}:${minutes}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <Typography variant="headline">Weekly Brief</Typography>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: theme.spacing.lg }}>
            Choose what day and time you want to receive your weekly email brief.
          </Typography>

          {/* Day Selector */}
          <Typography variant="footnote" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            DAY
          </Typography>
          <Card style={[styles.card, { marginBottom: theme.spacing.md }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
              {DAYS_OF_WEEK.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setWeeklyBriefDay(index)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    marginRight: 8,
                    borderRadius: 20,
                    backgroundColor: weeklyBriefDay === index ? colors.primary : colors.background,
                  }}
                >
                  <Typography 
                    variant="callout" 
                    color={weeklyBriefDay === index ? '#FFFFFF' : colors.text}
                  >
                    {day.slice(0, 3)}
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>

          {/* Time Picker */}
          <Typography variant="footnote" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            TIME
          </Typography>
          <Card style={styles.card}>
            <View style={[styles.row, { justifyContent: 'center', paddingVertical: 8 }]}>
              <DateTimePicker
                value={getTimeDate()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={onTimeChange}
                themeVariant="dark"
                style={{ height: 150, width: '100%' }}
              />
            </View>
          </Card>
          
          <View style={{ height: 40 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120, // Enough space for tab bar and scrolling
  },

  sectionLabel: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconBoxDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  rowContent: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.separator,
    marginLeft: 60,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  // Profile Card Styles
  profileCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: 2,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membershipText: {
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40, 
    ...theme.shadows.elevated,
  },

  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  themeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  themeOptionContent: {
    flex: 1,
  },
  appBrandingContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: 0,
  },
  appIcon: {
    width: 60,
    height: 60,
    marginBottom: theme.spacing.md,
    borderRadius: 14,
  },
  appName: {
    marginBottom: theme.spacing.xs,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingLeft: 60, // Indent to align with text above
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingLeft: 60, // Align with content
  },
});
