import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function SettingsScreen() {
  const [quietHours, setQuietHours] = useState(true);
  const [dailyBrief, setDailyBrief] = useState(true);

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
          color={danger ? theme.colors.danger : theme.colors.primary} 
        />
      </View>
      <View style={styles.rowContent}>
        <Typography 
          variant="body" 
          color={danger ? theme.colors.danger : theme.colors.text}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="footnote" color={theme.colors.textSecondary}>
            {subtitle}
          </Typography>
        )}
      </View>
      {onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E5E5EA', true: theme.colors.success }}
          thumbColor="#FFFFFF"
        />
      )}
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={styles.container}
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

        {/* Notifications */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
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
          <Typography variant="caption1" color={theme.colors.textTertiary}>
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
    paddingBottom: 150,
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
});
