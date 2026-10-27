import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useEncatch, Encatch, type Theme } from '@encatch/react-native-sdk';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { getEnvironmentEndpoints } from '@/constants/environments';
import { Action, usePageColors } from '@/components/TesterOnboarding';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const THEMES: { value: Theme; label: string }[] = [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }];

export function TesterHeaderActions() {
  const { setTheme } = useEncatch();
  const { isAnonymous, setAnonymous, setupValues } = useTesterSession();
  const colors = usePageColors();
  const { insets, padding } = useResponsiveLayout();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [theme, setLocalTheme] = useState<Theme>(Encatch.theme);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    if (leaving) return;
    setLeaving(true); setError('');
    try {
      await Encatch.resetUser();
      setAnonymous(false); setOpen(false);
      router.replace('/(auth)/test-user');
    } catch { setError('Could not end the session. Please try again.'); }
    finally { setLeaving(false); }
  };
  const go = (path: '/(auth)/login' | '/(auth)/test-user' | '/(tabs)/activity') => { setOpen(false); router.navigate(path); };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Open session and navigation menu" accessibilityState={{ expanded: open }} onPress={() => { setLocalTheme(Encatch.theme); setOpen(true); }} style={styles.menuButton}>
        <Text style={[styles.menuIcon, { color: colors.text }]}>⋯</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => { if (!leaving) setOpen(false); }} statusBarTranslucent>
        <View style={[styles.overlay, { paddingLeft: insets.left, paddingRight: insets.right }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close session menu" disabled={leaving} onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: Math.max(180, height - insets.top - 20) }]}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding, paddingBottom: Math.max(insets.bottom, 12) + padding, gap: 16 }}>
              <View style={styles.heading}>
                <View style={styles.flex}>
                  <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Session menu</Text>
                  <Text style={[styles.hint, { color: colors.muted }]}>{getEnvironmentEndpoints(setupValues.environment).label} · {isAnonymous ? 'Anonymous' : 'Identified user'}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close menu" disabled={leaving} onPress={() => setOpen(false)} style={styles.close}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable>
              </View>
              <Action title="SDK request logs" secondary disabled={leaving} onPress={() => go('/(tabs)/activity')} />
              <Action title="Change test user" secondary disabled={leaving} onPress={() => go('/(auth)/test-user')} />
              <Action title="SDK setup" secondary disabled={leaving} onPress={() => go('/(auth)/login')} />
              <Text style={[styles.label, { color: colors.text }]}>Form theme</Text>
              <View accessibilityRole="radiogroup" style={styles.themes}>
                {THEMES.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: theme === item.value, disabled: leaving }} disabled={leaving} onPress={() => { setLocalTheme(item.value); setTheme(item.value); }} style={[styles.theme, { borderColor: theme === item.value ? colors.accent : colors.border, backgroundColor: theme === item.value ? colors.selected : colors.surface }]}><Text style={[styles.label, { color: theme === item.value ? colors.accent : colors.text }]}>{item.label}</Text></Pressable>)}
              </View>
              <Text style={[styles.hint, { color: colors.muted }]}>Changes the appearance of SDK forms.</Text>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: leaving, busy: leaving }} disabled={leaving} onPress={() => void logout()} style={[styles.end, { borderColor: colors.border }]}><Text style={[styles.label, { color: colors.error }]}>{leaving ? 'Ending session…' : isAnonymous ? 'End anonymous session' : 'Log out'}</Text></Pressable>
              {!!error && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: colors.error }]}>{error}</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  menuButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  menuIcon: { fontSize: 30, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 21, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 26 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  theme: { flex: 1, minWidth: 72, minHeight: 46, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  end: { minHeight: 50, padding: 14, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1 },
});
