import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert, Image, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';

import { 
  Sun, Moon, Smartphone, X, CheckCircle, ChevronRight, 
  ShieldCheck, FileText, Info, Trash
} from 'lucide-react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useItemsStore } from '../../src/store/useItemsStore';
import { GradientSparkles } from '../../src/ui/components/RainbowSparkles';
import * as WebBrowser from 'expo-web-browser';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light Mode', description: 'Always use light theme', Icon: Sun },
  { value: 'dark', label: 'Dark Mode', description: 'Always use dark theme', Icon: Moon },
  { value: 'system', label: 'System', description: 'Follow system theme', Icon: Smartphone },
];

import { useSettingsStore } from '../../src/store/useSettingsStore';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { quietHoursEnabled, setQuietHoursEnabled, dailyBriefEnabled, setDailyBriefEnabled } = useSettingsStore();
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
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





  const UserProfileSection = () => (
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
              RP
            </Typography>
          </LinearGradient>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Typography variant="headline" style={styles.userName}>
            Ronak Patel
          </Typography>
          <View style={styles.membershipBadge}>
            <GradientSparkles size={14} />
            <Typography 
              variant="footnote" 
              color={colors.accent}
              style={styles.membershipText}
            >
              Pro Member
            </Typography>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </Card>
  );

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

  const SettingRow = ({ 
    Icon, 
    title, 
    subtitle,
    value,
    onToggle,
    showArrow = false,
    danger = false,
    onPress,
  }: {
    Icon: typeof Sun;
    title: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: (val: boolean) => void;
    showArrow?: boolean;
    danger?: boolean;
    onPress?: () => void;
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
            subtitle="10 PM – 7 AM"
            value={quietHoursEnabled}
            onToggle={setQuietHoursEnabled}
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={Sun}
            title="Daily Brief"
            subtitle="Every morning at 8 AM"
            value={dailyBriefEnabled}
            onToggle={setDailyBriefEnabled}
          />
        </Card>

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
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={FileText}
            title="Terms of Service"
            showArrow
            onPress={() => openLegalDocument('https://asteron.app/#terms')}
          />
          <View style={styles.separator} />
          <SettingRow
            Icon={Info}
            title="Version"
            subtitle="1.0.0"
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
          <Typography variant="footnote" color={colors.textSecondary}>
            Your intelligent personal assistant
          </Typography>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Typography variant="caption1" color={colors.textTertiary}>
            Your data is stored locally on this device.
          </Typography>
        </View>
      </ScrollView>
    </View>
  );
}

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
    width: 80,
    height: 80,
    marginBottom: theme.spacing.md,
    borderRadius: 18,
  },
  appName: {
    marginBottom: theme.spacing.xs,
  },
});
