import { StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { theme } from '../theme';
import { Typography } from './Typography';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={[
        styles.chip,
        selected && styles.selected,
      ]}
    >
      <Typography
        variant="footnote"
        color={selected ? '#FFFFFF' : theme.colors.text}
        style={{ fontWeight: '500' }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    marginRight: 8,
    marginBottom: 8,
  },
  selected: {
    backgroundColor: theme.colors.primary,
  },
});
