/** Marka renkli birincil buton — renkler tema token'larından gelir. */
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** true ise buton soluklaşır ve basılamaz (prototip Btn disabled karşılığı). */
  disabled?: boolean;
  /** true ise etiket yerine yükleniyor göstergesi; basılamaz. */
  loading?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const blocked = disabled || loading;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && !blocked ? theme.colors.brandDark : theme.colors.brand,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.md,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.card} />
      ) : (
        <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.md, fontWeight: '600' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
