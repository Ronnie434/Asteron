import { View, Modal, StyleSheet, Dimensions } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Typography } from './Typography';

interface CaptureSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectVoice: () => void;
}

export function CaptureSelectionModal({ 
  visible, 
  onClose, 
  onSelectManual, 
  onSelectVoice 
}: CaptureSelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.container}>
          <Typography variant="title2" style={{ marginBottom: 20, textAlign: 'center' }}>
            New Capture
          </Typography>

          <View style={styles.row}>
            {/* Manual Entry */}
            <TouchableOpacity 
              style={styles.option} 
              onPress={onSelectManual}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="create-outline" size={32} color={theme.colors.primary} />
              </View>
              <Typography variant="headline" style={{ marginTop: 12 }}>Manual</Typography>
            </TouchableOpacity>

            {/* AI Voice Mode */}
            <TouchableOpacity 
              style={styles.option} 
              onPress={onSelectVoice}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="mic" size={32} color={theme.colors.primary} />
              </View>
              <Typography variant="headline" style={{ marginTop: 12 }}>Voice Mode</Typography>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...theme.shadows.elevated,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  option: {
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    width: 120,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
