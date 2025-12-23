import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { theme } from '../theme';
import { Typography } from './Typography';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'text';
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}

export function Button({
  variant = 'primary',
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'secondary' && { backgroundColor: colors.primaryLight },
        variant === 'text' && styles.text,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#FFFFFF' : colors.primary} 
          size="small"
        />
      ) : (
        <Typography
          variant="headline"
          color={
            variant === 'primary' 
              ? '#FFFFFF' 
              : colors.primary
          }
        >
          {label}
        </Typography>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
});
