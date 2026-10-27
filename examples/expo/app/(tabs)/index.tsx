import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Encatch, useEncatch, type ResetMode } from '@encatch/react-native-sdk';
import { Action, Card, Field, usePageColors } from '@/components/TesterOnboarding';
import { FormIdPicker } from '@/components/FormIdPicker';
import { useColorScheme } from '@/components/useColorScheme';
import { useActiveFormId } from '@/hooks/useActiveFormId';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { useTesterActivity } from '@/contexts/TesterActivityContext';
import { useTesterConfig } from '@/contexts/TesterConfigContext';
import { useTestUsers } from '@/contexts/TestUsersContext';
import { getEnvironmentEndpoints } from '@/constants/environments';

const RESET_OPTIONS: { value: ResetMode; label: string; hint: string }[] = [
  { value: 'always', label: 'Always', hint: 'Start a fresh response each time.' },
  { value: 'on-complete', label: 'On complete', hint: 'Keep progress until the response is completed.' },
  { value: 'never', label: 'Never', hint: 'Reuse the existing response state.' },
];
const EVENT_LABELS: Record<string, string> = {
  'form:show': 'Form opened',
  'form:started': 'Form started',
  'form:submit': 'Form submitted',
  'form:complete': 'Form completed',
  'form:close': 'Form closed',
  'form:dismissed': 'Form dismissed',
  'form:error': 'The form reported an error',
};

export default function HomeScreen() {
  const colors = usePageColors();
  const { add, finish } = useTesterActivity();
  const layout = useResponsiveLayout();
  const dark = useColorScheme() === 'dark';
  const { userName, isInitialized, on } = useEncatch();
  const { isAnonymous, setupValues } = useTesterSession();
  const { getUser } = useTestUsers();
  const { interceptorFormId } = useTesterConfig();
  const { activeFormId, manualFormId, setManualFormId, suggestedIds } = useActiveFormId();
  const suggestions = [...new Set([...suggestedIds, ...(setupValues.formId ? [setupValues.formId] : [])])];
  const profile = userName ? getUser(userName) : undefined;
  const [advanced, setAdvanced] = useState(false);
  const [questionId, setQuestionId] = useState('');
  const [answer, setAnswer] = useState('');
  const [reset, setReset] = useState<ResetMode>('always');
  const [busy, setBusy] = useState<'form' | 'prefill' | 'interceptor' | 'event' | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const operation = useRef(false);
  const eventCount = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => on((event) => {
    if (!EVENT_LABELS[event]) return;
    eventCount.current += 1;
    setFeedback({ text: EVENT_LABELS[event], error: event === 'form:error' });
  }), [on]);

  const request = async (kind: NonNullable<typeof busy>) => {
    if (operation.current || !isInitialized) return;
    if ((kind === 'form' || kind === 'prefill') && !activeFormId) return;
    if (kind === 'prefill' && (!questionId.trim() || !answer.trim())) return;
    if (kind === 'interceptor' && !interceptorFormId) return;
    operation.current = true;
    Keyboard.dismiss();
    setBusy(kind);
    const before = eventCount.current;
    const started = Date.now();
    const activityId = add({ kind: 'call', source: 'Home', method: kind === 'event' ? 'trackEvent' : 'showForm',
      name: kind === 'event' ? 'home_viewed' : kind === 'prefill' ? 'Show form with prefill' : kind === 'interceptor' ? 'Show interceptor form' : 'Show form',
      formId: kind === 'event' ? undefined : kind === 'interceptor' ? interceptorFormId : activeFormId,
      reset: kind === 'event' ? undefined : reset, status: 'running', environment: setupValues.environment,
      session: isAnonymous ? 'Anonymous' : userName || 'Identified user', detail: 'Calling the SDK…' });
    setFeedback({ text: kind === 'event' ? 'Calling trackEvent(home_viewed)…' : 'Requesting the form…' });
    try {
      if (kind === 'event') {
        await Encatch.trackEvent('home_viewed');
      } else {
        // Only the prefill action should stage a text answer for this request.
        Encatch.clearPendingResponses();
        if (kind === 'prefill') Encatch.addToResponse(questionId.trim(), answer);
        await Encatch.showForm(kind === 'interceptor' ? interceptorFormId : activeFormId, { reset });
      }
      finish({ id: activityId, status: 'returned', durationMs: Date.now() - started, detail: kind === 'event' ? 'Event call returned. Server delivery is not confirmed.' : 'Form call returned. Check SDK form events and the preview for the result.' });
      if (mounted.current && eventCount.current === before) {
        setFeedback({ text: kind === 'event'
          ? 'Event call finished. Delivery is handled by the SDK.'
          : kind === 'interceptor'
            ? 'Interceptor call finished. Check the native carousel for the form.'
            : 'Form call finished. Awaiting a form-open event; check Inline tabs if a form slot is registered.' });
      }
    } catch (error) {
      finish({ id: activityId, status: 'error', durationMs: Date.now() - started, detail: error instanceof Error ? error.message : 'The SDK call threw an error.' });
      if (mounted.current) setFeedback({ text: 'The call failed. Check the form ID, connection, and SDK setup.', error: true });
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const title = [styles.cardTitle, { color: colors.text }];
  const hint = [styles.hint, { color: colors.muted }];
  const link = [styles.link, { color: colors.accent }];

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.container, { paddingHorizontal: layout.padding }]}>
        <View style={styles.intro}>
          <View style={styles.headingRow}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>ENCATCH SDK TESTER</Text>
            <Text style={[styles.badge, { backgroundColor: colors.surface, color: colors.accent }]}>{getEnvironmentEndpoints(setupValues.environment).label}</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Your testing workspace</Text>
          <Text style={hint}>Open a form, try a prefill, or send a test event.</Text>
        </View>

        <Card>
          <View style={styles.sessionRow}>
            <View style={[styles.avatar, { backgroundColor: colors.selected }]}>
              <Text style={[styles.avatarText, { color: colors.accent }]}>{isAnonymous ? 'A' : (profile?.displayName || userName || 'U').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.sessionName, { color: colors.text }]}>{isAnonymous ? 'Anonymous session' : profile?.displayName || userName || 'Test user'}</Text>
              <Text style={hint}>{isAnonymous ? 'No user identified · device/session tracking is active' : userName}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.sessionActions}>
            {!isAnonymous && userName && <Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => router.push({ pathname: '/edit-profile', params: { username: userName } })}><Text style={link}>Edit profile</Text></Pressable>}
            <Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => router.push('/(auth)/test-user')}><Text style={link}>Change test user</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => router.push('/(auth)/login')}><Text style={link}>SDK setup</Text></Pressable>
          </View>
        </Card>

        <Card>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={title}>Show a form</Text>
            <Text style={[styles.codeLabel, { color: colors.muted }]}>showForm()</Text>
          </View>
          <Text style={hint}>Use a feedback configuration ID or select a saved suggestion.</Text>
          <FormIdPicker formIds={suggestions} value={manualFormId} onChange={setManualFormId} textColor={colors.text} borderColor={colors.border} placeholderColor={colors.muted} disabled={!!busy} />
          <Action title={busy === 'form' ? 'Requesting form…' : 'Show form'} onPress={() => void request('form')} disabled={!activeFormId || (!!busy && busy !== 'form')} busy={busy === 'form'} />
          <Pressable accessibilityRole="button" disabled={!manualFormId || !!busy} style={styles.linkButton} onPress={() => { setManualFormId(''); setFeedback(null); }}><Text style={[link, (!manualFormId || !!busy) && styles.disabled]}>Clear form ID</Text></Pressable>
          {!activeFormId && <Text style={hint}>Enter a form ID to enable form testing.</Text>}
          <Text style={hint}>Forms open in a modal unless an Inline tab has registered a matching slot.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={() => setAdvanced(!advanced)} style={[styles.advancedToggle, { borderColor: colors.border }]}>
            <Text style={link}>{advanced ? '− Hide advanced tests' : '+ Advanced form tests'}</Text>
          </Pressable>
          {advanced && <View style={styles.advancedContent}>
            <Text style={title}>Response reset</Text>
            <View accessibilityRole="radiogroup" style={styles.resetOptions}>
              {RESET_OPTIONS.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: reset === option.value, disabled: !!busy }} disabled={!!busy} onPress={() => setReset(option.value)}
                style={[styles.resetOption, { borderColor: reset === option.value ? colors.accent : colors.border, backgroundColor: reset === option.value ? colors.selected : colors.surface }]}>
                <Text style={[styles.optionText, { color: reset === option.value ? colors.accent : colors.muted }]}>{option.label}</Text>
              </Pressable>)}
            </View>
            <Text style={hint}>{RESET_OPTIONS.find((option) => option.value === reset)?.hint}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={title}>Prefill a text answer</Text>
            <Text style={hint}>Use a text question's ID or slug from the selected form.</Text>
            <Field label="Question ID or slug" placeholder="e.g. feedback_comment" value={questionId} onChangeText={setQuestionId} autoCapitalize="none" editable={!busy} />
            <Field label="Text answer" placeholder="Enter a sample answer" value={answer} onChangeText={setAnswer} multiline editable={!busy} />
            <Action title={busy === 'prefill' ? 'Requesting prefilled form…' : 'Show form with prefill'} secondary onPress={() => void request('prefill')} disabled={!activeFormId || !questionId.trim() || !answer.trim() || (!!busy && busy !== 'prefill')} busy={busy === 'prefill'} />
            <Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => { setQuestionId(''); setAnswer(''); Encatch.clearPendingResponses(); }}><Text style={link}>Clear prefill</Text></Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={title}>Native interceptor</Text>
            <Text style={hint}>{interceptorFormId ? 'Request the configured interceptor form in the native carousel.' : 'Add an interceptor form ID in SDK setup to enable this test.'}</Text>
            {!!interceptorFormId && <Text selectable style={[styles.formId, { color: colors.text }]}>{interceptorFormId}</Text>}
            <Action title={busy === 'interceptor' ? 'Requesting interceptor…' : 'Test interceptor'} secondary onPress={() => void request('interceptor')} disabled={!interceptorFormId || (!!busy && busy !== 'interceptor')} busy={busy === 'interceptor'} />
          </View>}
        </Card>

        <Card>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={title}>Events & inline tests</Text>
            <Text style={[styles.codeLabel, { color: colors.muted }]}>trackEvent()</Text>
          </View>
          <Text style={hint}>Send home_viewed, or open a dedicated testing tab.</Text>
          <Action title={busy === 'event' ? 'Sending event…' : 'Send home_viewed'} secondary onPress={() => void request('event')} disabled={!!busy && busy !== 'event'} busy={busy === 'event'} />
          <View style={styles.shortcuts}>
            {[
              { label: 'More events →', route: '/(tabs)/events' },
              { label: 'Inline exact →', route: '/(tabs)/inline-exact' },
              { label: 'Inline any →', route: '/(tabs)/inline-wildcard' },
            ].map((item) => <Pressable key={item.route} accessibilityRole="button" disabled={!!busy} onPress={() => router.push(item.route as '/(tabs)/events' | '/(tabs)/inline-exact' | '/(tabs)/inline-wildcard')} style={[styles.shortcut, { borderColor: colors.border }]}><Text style={link}>{item.label}</Text></Pressable>)}
          </View>
        </Card>
      </ScrollView>
      {feedback && <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.flex}>
          <Text style={[styles.feedbackTitle, { color: feedback.error ? colors.error : colors.accent }]}>Latest action</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.feedbackText, { color: colors.text }]}>{feedback.text}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss action feedback" onPress={() => setFeedback(null)} style={styles.dismiss}><Text style={[styles.link, { color: colors.muted }]}>×</Text></Pressable>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  container: { padding: 20, paddingBottom: 32, gap: 18, width: '100%', maxWidth: 720, alignSelf: 'center' },
  intro: { gap: 10, paddingVertical: 4 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  heading: { fontSize: 27, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 20 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  codeLabel: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionName: { fontSize: 16, fontWeight: '600' },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  divider: { height: 1 },
  sessionActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20 },
  linkButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  disabled: { opacity: 0.45 },
  advancedToggle: { minHeight: 48, borderTopWidth: 1, justifyContent: 'center', paddingTop: 10 },
  advancedContent: { gap: 14 },
  resetOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resetOption: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
  optionText: { fontSize: 12, fontWeight: '600' },
  formId: { fontSize: 12, lineHeight: 18 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcut: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8, borderWidth: 1 },
  feedback: { marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  feedbackTitle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  feedbackText: { fontSize: 12, lineHeight: 18 },
  dismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
