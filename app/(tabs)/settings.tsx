import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert, Image, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; icon: string }[] = [
  { value: 'light', label: 'Light Mode', description: 'Always use light theme', icon: 'sunny' },
  { value: 'dark', label: 'Dark Mode', description: 'Always use dark theme', icon: 'moon' },
  { value: 'system', label: 'System', description: 'Follow system theme', icon: 'phone-portrait' },
];

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const [quietHours, setQuietHours] = useState(true);
  const [dailyBrief, setDailyBrief] = useState(true);
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
      animationType="fade"
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
          <View style={styles.modalHeader}>
            <Typography variant="headline">Choose Theme</Typography>
            <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
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
                <Ionicons 
                  name={option.icon as any} 
                  size={22} 
                  color={themeMode === option.value ? '#FFFFFF' : colors.primary} 
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
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
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
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Typography 
              variant="footnote" 
              color={colors.accent}
              style={styles.membershipText}
            >
              Pro Member
            </Typography>
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={colors.textTertiary} 
        />
      </TouchableOpacity>
    </Card>
  );

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your items.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ]
    );
  };

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle,
    value,
    onToggle,
    showArrow = false,
    danger = false,
    onPress,
  }: {
    icon: string;
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
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={danger ? colors.danger : colors.primary} 
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
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
      pointerEvents="box-none"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Typography variant="largeTitle">Settings</Typography>
        </View>

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
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Typography variant="body">Theme</Typography>
            </View>
            <Typography variant="body" color={colors.textSecondary} style={{ marginRight: 4 }}>
              {getThemeLabel()}
            </Typography>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
            icon="moon"
            title="Quiet Hours"
            subtitle="10 PM – 7 AM"
            value={quietHours}
            onToggle={setQuietHours}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="sunny"
            title="Daily Brief"
            subtitle="Every morning at 8 AM"
            value={dailyBrief}
            onToggle={setDailyBrief}
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
            icon="shield-checkmark"
            title="Privacy Policy"
            showArrow
            onPress={() => {}}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="document-text"
            title="Terms of Service"
            showArrow
            onPress={() => {}}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="information-circle"
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
            icon="trash"
            title="Delete All Data"
            danger
            showArrow
            onPress={handleDeleteData}
          />
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Typography variant="caption1" color={colors.textTertiary}>
            Your data is stored locally on this device.
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: theme.spacing.lg,
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
    marginTop: theme.spacing.xxl,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.elevated,
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
});
