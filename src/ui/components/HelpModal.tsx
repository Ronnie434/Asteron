import React from 'react';
// HelpModal component
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Mic, Calendar, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { Typography } from './Typography';
import { theme } from '../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const HelpModal = ({ visible, onClose }: HelpModalProps) => {
  const { isDark, colors } = useTheme();

  const TipItem = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <View style={[styles.tipContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
      <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.tipContent}>
        <Typography variant="subhead" style={styles.tipTitle}>{title}</Typography>
        <Typography variant="caption1" color={colors.textSecondary}>{description}</Typography>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView 
            intensity={isDark ? 80 : 95} 
            tint={isDark ? 'dark' : 'light'} 
            style={StyleSheet.absoluteFill} 
        />
        
        <View style={[
            styles.modalContent, 
            { 
                backgroundColor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.8)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Typography variant="headline" style={styles.title}>
                Using Asteron
              </Typography>
              <Typography variant="caption1" color={colors.textSecondary}>
                Your Executive AI Assistant
              </Typography>
            </View>
            <TouchableOpacity 
                onPress={onClose} 
                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Typography variant="body" style={styles.introText}>
              Asteron is designed to organize your life with zero friction. Just speak comfortably.
            </Typography>

            <View style={styles.section}>
              <Typography variant="caption1" color={colors.textSecondary} style={styles.sectionHeader}>
                CORE CAPABILITIES
              </Typography>
              
              <TipItem 
                icon={Mic} 
                title="Natural Voice" 
                description="Tap the mic and say: 'Remind me to call Mom tomorrow at 5pm' or 'Add gym every Mon, Wed, Fri'." 
              />
              
              <TipItem 
                icon={Calendar} 
                title="Smart Scheduling" 
                description="Try: 'Move all today's tasks to Friday' or 'Check off the gym for tomorrow'." 
              />
              
              <TipItem 
                icon={CheckCircle2} 
                title="Batch Control" 
                description="Say: 'Delete call lawyer and buy milk' to handle multiple items at once." 
              />

               <TipItem 
                icon={Sparkles} 
                title="Strategic Focus" 
                description="Ask: 'What do I have to do today?' or 'Summarize my week'." 
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.primaryLight }]}>
              <Typography variant="caption1" style={{ textAlign: 'center', lineHeight: 18 }}>
                ✨ <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Asteron sees 30 days ahead. You can ask about next month's schedule or reschedule things far in advance.
              </Typography>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
  },
  introText: {
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.8,
  },
  section: {
    gap: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 8,
    letterSpacing: 1,
    fontSize: 11,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    marginBottom: 2,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
});
