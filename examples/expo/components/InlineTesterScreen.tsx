import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { EncatchInlineForm, useEncatch, type ResetMode } from '@encatch/react-native-sdk';
import { Action, Card, usePageColors } from '@/components/TesterOnboarding';
import { FormIdPicker } from '@/components/FormIdPicker';
import { InlineFormScrollScreen } from '@/components/InlineFormScrollScreen';
import { TesterActivityCard } from '@/components/TesterActivityCard';
import { useActiveFormId } from '@/hooks/useActiveFormId';
import { useInlineTester } from '@/hooks/useInlineTester';
import { useTesterActivity } from '@/contexts/TesterActivityContext';

const RESETS: { value: ResetMode; label: string; hint: string }[] = [
  { value: 'always', label: 'Always', hint: 'Start a fresh response for every show call.' },
  { value: 'on-complete', label: 'On complete', hint: 'Keep progress until the response is completed.' },
  { value: 'never', label: 'Never', hint: 'Reuse existing response state.' },
];

export function InlineTesterScreen({ mode }: { mode: 'Exact' | 'Any' }) {
  const colors = usePageColors();
  const focused = useIsFocused();
  const { on } = useEncatch();
  const { activeFormId, manualFormId, setManualFormId, suggestedIds } = useActiveFormId();
  const { run, busy, isInitialized } = useInlineTester(mode);
  const { entries } = useTesterActivity();
  const [reset, setReset] = useState<ResetMode>('always');
  const [formState, setFormState] = useState('Ready for a show call.');
  const [openedId, setOpenedId] = useState<string | null>(null);
  const scrollToFormRef = useRef<() => void>(() => {});
  const formY = useRef(0);
  const handleScrollReady = useCallback((scroll: () => void) => { scrollToFormRef.current = scroll; }, []);
  const getFormY = useCallback(() => formY.current, []);
  const latest = entries.find((entry) => entry.source === mode);
  useEffect(() => { setOpenedId(null); setFormState('Ready for a show call.'); }, [activeFormId, focused]);
  useEffect(() => on((name, payload) => {
    if (!focused || !activeFormId || (mode === 'Exact' && payload.formId && payload.formId !== activeFormId)) return;
    if (name === 'form:show') { setOpenedId(payload.formId || activeFormId); setFormState('SDK reported: form opened.'); }
    if (name === 'form:complete') setFormState('SDK reported: form completed.');
    if (name === 'form:error') setFormState('SDK reported a form error. Check Latest action.');
    if (name === 'form:close' || name === 'form:dismissed') { setOpenedId(null); setFormState('SDK reported: form closed.'); }
  }), [on, focused, mode, activeFormId]);
  const show = () => { Keyboard.dismiss(); setFormState('Show requested. Waiting for an SDK form event.'); void run('showForm', activeFormId, reset); };
  return <InlineFormScrollScreen backgroundColor={colors.background} contentContainerStyle={styles.container} getFormScrollY={getFormY} onScrollToFormReady={handleScrollReady}>
    <View style={styles.intro}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>ENCATCH SDK TESTER</Text>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Inline {mode.toLowerCase()} forms</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{mode === 'Exact' ? 'Pin the preview to one form ID and test it inside this page.' : 'Use a catch-all preview to test any form ID inside this page.'}</Text>
    </View>
    <Card>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Choose a form</Text>
      <Text style={[styles.body, { color: colors.muted }]}>Paste a feedback configuration ID or choose a suggestion. This ID is shared with Home and both Inline tabs.</Text>
      <FormIdPicker formIds={suggestedIds} value={manualFormId} onChange={setManualFormId} textColor={colors.text} borderColor={colors.border} placeholderColor={colors.muted} disabled={!!busy} />
      <Text style={[styles.label, { color: colors.text }]}>Response reset</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {RESETS.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: reset === item.value, disabled: !!busy }} disabled={!!busy} onPress={() => setReset(item.value)} style={[styles.option, { borderColor: reset === item.value ? colors.accent : colors.border, backgroundColor: reset === item.value ? colors.selected : colors.surface }]}><Text style={[styles.label, { color: reset === item.value ? colors.accent : colors.muted }]}>{item.label}</Text></Pressable>)}
      </View>
      <Text style={[styles.meta, { color: colors.muted }]}>{RESETS.find((item) => item.value === reset)?.hint}</Text>
      <Action title={busy === 'showForm' ? 'Requesting form…' : 'Show inline form'} onPress={show} busy={busy === 'showForm'} disabled={!activeFormId || !isInitialized || busy === 'dismissForm'} />
      <Action title={busy === 'dismissForm' ? 'Dismissing form…' : 'Dismiss inline form'} secondary busy={busy === 'dismissForm'} disabled={!openedId || !isInitialized || busy === 'showForm'} onPress={() => { Keyboard.dismiss(); void run('dismissForm', openedId || activeFormId, reset); }} />
      <Pressable accessibilityRole="button" disabled={!manualFormId || !!busy} onPress={() => setManualFormId('')} style={styles.linkButton}><Text style={[styles.label, { color: colors.accent, opacity: !manualFormId || busy ? 0.4 : 1 }]}>Clear form ID</Text></Pressable>
      {!activeFormId && <Text style={[styles.body, { color: colors.warning }]}>Enter a form ID to enable the preview and show action.</Text>}
      <Text style={[styles.meta, { color: colors.muted }]}>{mode === 'Exact' ? 'This slot catches only the selected ID. Other IDs use a matching slot or the modal.' : 'This slot catches forms without an exact match. Exact slots take priority.'} The preview is active only while this tab is open.</Text>
    </Card>
    <View onLayout={(event) => { formY.current = event.nativeEvent.layout.y; }} style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.previewHeading}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Inline preview</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.muted }]}>{activeFormId ? formState : 'No form ID selected.'}</Text>
        {!!activeFormId && <Text selectable style={[styles.meta, { color: colors.muted }]}>{mode === 'Exact' ? 'Pinned ID' : 'Requested ID'}: {activeFormId}</Text>}
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/activity')} style={styles.linkButton}><Text style={[styles.label, { color: colors.accent }]}>View SDK logs</Text></Pressable>
      </View>
      {focused && !!activeFormId && <EncatchInlineForm key={activeFormId} formId={mode === 'Exact' ? activeFormId : undefined} minHeight={100} style={styles.form} onOverlayOpenChange={(open) => { if (open) scrollToFormRef.current(); }} />}
      {!openedId && <Text style={[styles.empty, { color: colors.muted }]}>Tap Show inline form to load the preview. A returned call alone does not confirm that a form opened.</Text>}
    </View>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Latest inline action</Text>
      {latest ? <TesterActivityCard entry={latest} expanded /> : <Card><Text style={[styles.body, { color: colors.muted }]}>No calls from Inline {mode.toLowerCase()} yet. Show a form to begin.</Text></Card>}
    </View>
  </InlineFormScrollScreen>;
}
const styles = StyleSheet.create({
  container: { paddingVertical: 24, gap: 20 },
  intro: { gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  heading: { fontSize: 26, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22 },
  meta: { fontSize: 12, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { flex: 1, minWidth: 76, minHeight: 46, padding: 10, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkButton: { minHeight: 44, paddingVertical: 12, justifyContent: 'center', alignSelf: 'flex-start' },
  preview: { borderRadius: 16, borderWidth: 1 },
  previewHeading: { padding: 16, gap: 8 },
  form: { width: '100%' },
  empty: { padding: 16, fontSize: 14, lineHeight: 22 },
});
