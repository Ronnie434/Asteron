import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { theme } from '../theme';
import { Typography } from './Typography';

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
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary} 
          size="small"
        />
      ) : (
        <Typography
          variant="headline"
          color={
            variant === 'primary' 
              ? '#FFFFFF' 
              : variant === 'secondary'
                ? theme.colors.primary
                : theme.colors.primary
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
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.primaryLight,
  },
  text: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
});
