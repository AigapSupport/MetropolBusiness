/** Akış ilerleme çubuğu — prototip screens-metropol-cards.jsx > Flow'daki adım barı. */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface FlowStepBarProps {
  step: number;
  total: number;
}

export function FlowStepBar({ step, total }: FlowStepBarProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { gap: theme.spacing.sm - 2 }]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            { backgroundColor: index < step ? theme.colors.brand : theme.colors.line },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  segment: { flex: 1, height: 5, borderRadius: 999 },
});
