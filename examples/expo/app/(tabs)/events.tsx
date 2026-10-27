import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Action, Card, Field, usePageColors } from '@/components/TesterOnboarding';
import { TesterScreen } from '@/components/TesterScreen';
import { TesterActivityCard } from '@/components/TesterActivityCard';
import { useTesterActivity } from '@/contexts/TesterActivityContext';
import { useTrackingTester } from '@/hooks/useTrackingTester';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import type { TrackingMethod } from '@/utils/testerActivity';

const MODES: { method: TrackingMethod; label: string; hint: string }[] = [
  { method: 'trackEvent', label: 'Event', hint: 'Send an event name to test event targeting and automatic form triggers.' },
  { method: 'trackScreen', label: 'Screen view', hint: 'Send a screen path without navigating. Expo Router also tracks actual navigation automatically.' },
];
const PRESETS = {
  trackEvent: ['button_clicked', 'feature_used', 'purchase_started', 'survey_viewed', 'home_viewed'],
  trackScreen: ['/home', '/dashboard', '/settings', '/dashboard/encatch-test'],
};

export default function EventsScreen() {
  const colors = usePageColors();
  const { entries, sdkEntries } = useTesterActivity();
  const { run, busy, isInitialized } = useTrackingTester();
  const { isAnonymous, setupValues } = useTesterSession();
  const [method, setMethod] = useState<TrackingMethod>('trackEvent');
  const [eventName, setEventName] = useState('test_event');
  const [screenName, setScreenName] = useState('/dashboard/encatch-test');
  const value = method === 'trackEvent' ? eventName : screenName;
  const change = method === 'trackEvent' ? setEventName : setScreenName;
  const latest = entries.find((entry) => entry.method === 'trackEvent' || entry.method === 'trackScreen');
  const send = (m = method, name = value) => { Keyboard.dismiss(); void run(m, name); };
  return <TesterScreen contentStyle={styles.stack}>
    <View style={styles.stack}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>ENCATCH SDK TESTER</Text>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Test events & screens</Text>
      <Text style={[styles.body, { color: colors.muted }]}>Choose a preset or enter a name, send the call, then review what happened.</Text>
      <Text style={[styles.meta, { color: colors.accent }]}>{setupValues.environment.toUpperCase()} · {isAnonymous ? 'Anonymous session' : 'Identified session'}</Text>
    </View>
    <Card>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Send a test call</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {MODES.map((mode) => <Pressable key={mode.method} accessibilityRole="radio" accessibilityState={{ checked: mode.method === method, disabled: busy }} disabled={busy} onPress={() => setMethod(mode.method)}
          style={[styles.mode, { borderColor: method === mode.method ? colors.accent : colors.border, backgroundColor: method === mode.method ? colors.selected : colors.surface }]}>
          <Text style={[styles.modeText, { color: method === mode.method ? colors.accent : colors.muted }]}>{mode.label}</Text>
        </Pressable>)}
      </View>
      <Text style={[styles.body, { color: colors.muted }]}>{MODES.find((mode) => mode.method === method)?.hint}</Text>
      <Text style={[styles.label, { color: colors.text }]}>Quick presets · tap to fill</Text>
      <View style={styles.presets}>
        {PRESETS[method].map((name) => <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: value === name, disabled: busy }} accessibilityLabel={`Use ${name}`} disabled={busy} onPress={() => change(name)}
          style={[styles.preset, { borderColor: value === name ? colors.accent : colors.border, backgroundColor: value === name ? colors.selected : colors.surface }]}>
          <Text style={[styles.presetText, { color: value === name ? colors.accent : colors.text }]}>{name}</Text>
        </Pressable>)}
      </View>
      <Field label={method === 'trackEvent' ? 'Event name' : 'Screen path'} value={value} onChangeText={change} autoCapitalize="none" placeholder={method === 'trackEvent' ? 'e.g. button_clicked' : 'e.g. /dashboard'} editable={!busy} returnKeyType="done" onSubmitEditing={() => { if (!busy && value.trim()) send(); }} />
      <Action title={busy ? 'Calling SDK…' : method === 'trackEvent' ? 'Send event' : 'Track screen'} onPress={() => send()} busy={busy} disabled={!value.trim() || !isInitialized} />
      <Pressable accessibilityRole="button" disabled={busy || !value} onPress={() => change('')} style={styles.clear}><Text style={[styles.label, { color: colors.accent, opacity: busy || !value ? 0.4 : 1 }]}>Clear {method === 'trackEvent' ? 'event name' : 'screen path'}</Text></Pressable>
      {!isInitialized && <Text style={[styles.body, { color: colors.warning }]}>Waiting for SDK initialization.</Text>}
      <Text style={[styles.meta, { color: colors.muted }]}>These SDK methods accept a name only. Calls may trigger forms according to your project rules.</Text>
    </Card>
    <View style={styles.rowBetween}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Latest action</Text>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/activity')} style={styles.clear}><Text style={[styles.label, { color: colors.accent }]}>SDK logs ({sdkEntries.length})</Text></Pressable>
    </View>
    {latest ? <>
      <TesterActivityCard entry={latest} />
      <Action title="Repeat latest call" secondary disabled={busy || !isInitialized || !latest.method} onPress={() => { if (latest.method === 'trackEvent' || latest.method === 'trackScreen') send(latest.method, latest.name); }} />
    </> : <Card><Text style={[styles.body, { color: colors.muted }]}>No test calls yet. Send an event or screen view to see its status here.</Text></Card>}
    <Text style={[styles.meta, { color: colors.muted }]}>Call returned means the SDK method finished, not that the server received it. The Latest action tab shows actual SDK API requests and responses.</Text>
  </TesterScreen>;
}
const styles = StyleSheet.create({
  stack: { gap: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  heading: { fontSize: 26, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22 },
  meta: { fontSize: 12, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  mode: { flex: 1, minWidth: 100, minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 14, fontWeight: '700' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { maxWidth: '100%', minHeight: 44, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  presetText: { fontSize: 13, flexShrink: 1 },
  clear: { minHeight: 44, paddingVertical: 12, justifyContent: 'center' },
});
