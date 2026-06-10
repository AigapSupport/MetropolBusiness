/** Marka renkli birincil buton — renkler tema token'larından gelir. */
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
}

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.colors.brandDark : theme.colors.brand,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.md, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
