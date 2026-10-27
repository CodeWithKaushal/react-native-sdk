import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageColors } from '@/components/TesterOnboarding';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function TesterScreen({ children, contentStyle, bottomInset = false }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle>; bottomInset?: boolean }) {
  const colors = usePageColors();
  const { padding, insets } = useResponsiveLayout();
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <View style={[{ padding, paddingBottom: 32 + (bottomInset ? insets.bottom : 0), width: '100%', maxWidth: 760, alignSelf: 'center' }, contentStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
