import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { TESTER_TABS } from '@/constants/navigation';
import { useKeyboardVisible, useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { usePageColors } from '@/components/TesterOnboarding';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TesterTabBar({ state, navigation }: TabBarProps) {
  const colors = usePageColors();
  const { compact, insets } = useResponsiveLayout();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;
  return (
    <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 8), paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {state.routes.map((route, index) => {
          const item = TESTER_TABS.find((tab) => tab.name === route.name);
          if (!item) return null;
          const selected = state.index === index;
          const color = selected ? colors.accent : colors.muted;
          return (
            <Pressable key={route.key} testID={`tab-${route.name}`} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.accessibilityLabel}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.tab, { backgroundColor: selected ? colors.selected : colors.surface }, pressed && styles.pressed]}>
              <SymbolView name={item.icon} tintColor={color} size={compact ? 21 : 23} />
              <Text style={[styles.label, { color, fontSize: compact ? 10 : 12, fontWeight: selected ? '700' : '500' }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, paddingTop: 8 },
  tabs: { width: '100%', maxWidth: 840, alignSelf: 'center', flexDirection: 'row', gap: 2, alignItems: 'stretch' },
  tab: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: 2, paddingVertical: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
