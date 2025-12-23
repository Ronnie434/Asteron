import { View, TextInput, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../../src/ui/theme';
import { Card } from '../../src/ui/components/Card';
import { Chip } from '../../src/ui/components/Chip';
import { Typography } from '../../src/ui/components/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CaptureMock() {
  const router = useRouter();

  return (
    <View style={styles.container}>
       {/* Ideally BlurView, but simplistic for now or if packages missing */}
       <BlurView intensity={20} style={styles.blur} tint="light" />
       
       <View style={styles.content}>
         <Card style={styles.inputCard}>
           <View style={styles.inputRow}>
             <TextInput 
               placeholder="Tell me anything..." 
               placeholderTextColor="#9CA3AF"
               style={styles.input}
               autoFocus
               multiline
             />
             <View style={styles.micButton}>
               <Ionicons name="mic" size={24} color={theme.colors.primary} />
             </View>
           </View>
           
           <View style={styles.chipsRow}>
             <Chip label="Due: Jan 3" onPress={() => {}} />
             <Chip label="Remind: Dec 31 9:00 AM" onPress={() => {}} />
             <Chip label="Priority: High" onPress={() => {}} />
           </View>
         </Card>
         
         <View style={styles.tips}>
            <Typography variant="caption" style={{ textAlign: 'center', marginTop: 20 }}>
              Tap outside to cancel
            </Typography>
         </View>
       </View>

       {/* Tap outside handler could go here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 100, // Top offset like notification
    paddingHorizontal: theme.spacing.md,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    width: '100%',
  },
  inputCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accentBlue,
    paddingBottom: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.text,
    minHeight: 40,
  },
  micButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tips: {
    alignItems: 'center',
  }
});
