import React, { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ENCATCH_ENVIRONMENTS, getEnvironmentEndpoints, type EncatchEnvironment } from '@/constants/environments';
import { useColorScheme } from '@/components/useColorScheme';
import { useKeyboardVisible, useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { StoredTestUser } from '@/contexts/TestUsersContext';

export function usePageColors() {
  const dark = useColorScheme() === 'dark';
  return {
    background: dark ? '#101722' : '#F3F6FB',
    surface: dark ? '#192333' : '#FFFFFF',
    text: dark ? '#EEF3FC' : '#17243B',
    muted: dark ? '#AAB9CE' : '#536580',
    border: dark ? '#3B4B63' : '#D6DFEC',
    accent: dark ? '#A4C1FF' : '#2457C6',
    selected: dark ? '#223A60' : '#EDF3FF',
    primary: '#2457C6',
    success: dark ? '#9CDCC1' : '#20734F',
    warning: dark ? '#F7CF83' : '#8B5708',
    error: dark ? '#FFB0A9' : '#AF3028',
  };
}

export function Action({ title, onPress, disabled, busy, secondary = false }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
}) {
  const colors = usePageColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? colors.surface : colors.primary, borderColor: secondary ? colors.border : colors.primary },
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {busy && <ActivityIndicator color={secondary ? colors.accent : '#FFFFFF'} />}
      <Text style={[styles.buttonText, { color: secondary ? colors.accent : '#FFFFFF' }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, optional, ...props }: TextInputProps & { label: string; optional?: boolean }) {
  const colors = usePageColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}{optional ? <Text style={{ color: colors.muted }}> · optional</Text> : ''}</Text>
      <TextInput
        accessibilityLabel={`${label}${optional ? ', optional' : ''}`}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        {...props}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }, props.style]}
      />
    </View>
  );
}

export function Page({ children, step, footer }: { children: ReactNode; step: 1 | 2; footer?: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  const colors = usePageColors();
  const layout = useResponsiveLayout();
  const keyboardVisible = useKeyboardVisible();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.page, { padding: layout.padding, paddingTop: layout.landscape ? 8 : layout.padding + 8, gap: layout.landscape ? 12 : 20 }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brand, { backgroundColor: colors.primary }, layout.landscape && { width: 32, height: 32, borderRadius: 9 }]}><Text style={styles.brandLetter}>E</Text></View>
            <View style={styles.flex}>
              {!layout.landscape && <Text style={[styles.eyebrow, { color: colors.accent }]}>DEVELOPER WORKSPACE</Text>}
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text, fontSize: layout.landscape ? 20 : layout.compact ? 22 : 26 }]}>Encatch SDK Tester</Text>
            </View>
          </View>
          {!layout.landscape && <Text style={[styles.subtitle, { color: colors.muted }]}>Connect your project. Choose a test user. Start testing.</Text>}
          <View style={styles.steps}>
            {['SDK setup', 'Test user'].map((label, index) => (
              <View key={label} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: index + 1 <= step ? colors.primary : colors.surface, borderColor: index + 1 <= step ? colors.primary : colors.border }]}>
                  <Text style={[styles.stepNumberText, { color: index + 1 <= step ? '#FFFFFF' : colors.muted }]}>{index + 1 < step ? '✓' : index + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, { color: index + 1 <= step ? colors.text : colors.muted }]}>{label}</Text>
                {index === 0 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
          {children}
          <Text style={[styles.footer, { color: colors.muted }]}>Setup and test users are saved on this device.</Text>
        </ScrollView>
        {!!footer && !keyboardVisible && <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }}>
          <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: layout.padding, paddingVertical: layout.landscape ? 8 : 12, gap: 8 }}>{footer}</View>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = usePageColors();
  const { cardPadding } = useResponsiveLayout();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: cardPadding }, style]}>{children}</View>;
}

function EnvironmentPicker({ value, onChange, disabled = false }: { value: EncatchEnvironment; onChange: (env: EncatchEnvironment) => void; disabled?: boolean }) {
  const colors = usePageColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>Environment</Text>
      <View accessibilityRole="radiogroup" style={styles.envRow}>
        {ENCATCH_ENVIRONMENTS.map((env) => {
          const selected = env === value;
          return (
            <Pressable key={env} accessibilityRole="radio" accessibilityLabel={getEnvironmentEndpoints(env).label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => onChange(env)}
              style={({ pressed }) => [styles.envChip, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.selected : colors.surface }, pressed && styles.pressed]}>
              <Text style={[styles.envLabel, { color: selected ? colors.accent : colors.muted }]}>{env.toUpperCase()}{selected ? ' ✓' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>{getEnvironmentEndpoints(value).label} project credentials are required.</Text>
    </View>
  );
}

export function SetupFields({ apiKey, formId, interceptorFormId, environment, onApiKeyChange, onFormIdChange, onInterceptorFormIdChange, onEnvironmentChange, disabled = false }: {
  disabled?: boolean;
  apiKey: string;
  formId: string;
  interceptorFormId: string;
  environment: EncatchEnvironment;
  onApiKeyChange: (value: string) => void;
  onFormIdChange: (value: string) => void;
  onInterceptorFormIdChange: (value: string) => void;
  onEnvironmentChange: (value: EncatchEnvironment) => void;
}) {
  const colors = usePageColors();
  const [showKey, setShowKey] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [showEndpoints, setShowEndpoints] = useState(false);
  const endpoints = getEnvironmentEndpoints(environment);
  return (
    <View style={styles.stack}>
      <EnvironmentPicker disabled={disabled} value={environment} onChange={onEnvironmentChange} />
      <View>
        <Field editable={!disabled} label="API key" placeholder="Paste your project API key" value={apiKey} onChangeText={onApiKeyChange} autoCapitalize="none" secureTextEntry={!showKey} />
        <Pressable accessibilityRole="button" accessibilityLabel={showKey ? 'Hide API key' : 'Show API key'} onPress={() => setShowKey(!showKey)} style={styles.textButton}>
          <Text style={[styles.link, { color: colors.accent }]}>{showKey ? 'Hide key' : 'Show key'}</Text>
        </Pressable>
      </View>
      <Field editable={!disabled} label="Feedback configuration ID" placeholder="Paste a form ID" value={formId} onChangeText={onFormIdChange} autoCapitalize="none" />
      <Text style={[styles.hint, { color: colors.muted }]}>Use the ID of the form you want to test.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={() => setAdvanced(!advanced)} style={[styles.disclosure, { borderColor: colors.border }]}>
        <Text style={[styles.link, { color: colors.accent }]}>{advanced ? '−' : '+'} Advanced options{interceptorFormId ? ' · configured' : ''}</Text>
      </Pressable>
      {advanced && <View style={styles.stack}>
        <Field editable={!disabled} label="Interceptor form ID" optional placeholder="Leave empty to disable" value={interceptorFormId} onChangeText={onInterceptorFormIdChange} autoCapitalize="none" />
        <Text style={[styles.hint, { color: colors.muted }]}>Use this to test presenting a form through the native carousel.</Text>
      </View>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showEndpoints }} onPress={() => setShowEndpoints(!showEndpoints)} style={styles.textButton}>
        <Text style={[styles.link, { color: colors.muted }]}>{showEndpoints ? 'Hide connection details' : 'View connection details'}</Text>
      </Pressable>
      {showEndpoints && <View style={[styles.connection, { backgroundColor: colors.background }]}>
        <Text selectable style={[styles.hint, { color: colors.muted }]}>API · {endpoints.apiBaseUrl}</Text>
        <Text selectable style={[styles.hint, { color: colors.muted }]}>Forms · {endpoints.webHost}</Text>
      </View>}
    </View>
  );
}

export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  const colors = usePageColors();
  return <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: error ? colors.error : colors.warning }]}>{message}</Text>;
}

export function UserRow({ user, selected, disabled, onPress }: { user: StoredTestUser; selected: boolean; disabled: boolean; onPress: () => void }) {
  const colors = usePageColors();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.userRow, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.selected : colors.surface }, pressed && styles.pressed]}>
      <View style={[styles.avatar, { backgroundColor: colors.selected }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{(user.displayName || user.username).slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.flex}>
        <Text style={[styles.userName, { color: colors.text }]}>{user.displayName || user.username}</Text>
        {!!user.displayName && <Text style={[styles.userMeta, { color: colors.muted }]}>{user.username}</Text>}
        {!!user.email && <Text style={[styles.userMeta, { color: colors.muted }]}>{user.email}</Text>}
      </View>
      <Text style={[styles.radio, { color: selected ? colors.accent : colors.muted }]}>{selected ? '◉' : '○'}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  page: { flexGrow: 1, padding: 24, paddingTop: 36, gap: 20, width: '100%', maxWidth: 680, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brand: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#FFFFFF', fontWeight: '800', fontSize: 28 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 23 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, alignItems: 'center', paddingVertical: 6, marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '700' },
  stepLabel: { fontSize: 13, fontWeight: '600' },
  stepLine: { width: 28, height: 1, marginHorizontal: 8 },
  columns: { gap: 20, alignItems: 'stretch' },
  wideColumns: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0 },
  setupOnly: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 16 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 },
  stack: { gap: 14 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  envRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  envChip: { flex: 1, minWidth: 64, minHeight: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  envLabel: { fontSize: 12, fontWeight: '700' },
  button: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 14, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 2 },
  link: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  disclosure: { minHeight: 44, borderTopWidth: 1, justifyContent: 'center', paddingTop: 8 },
  connection: { padding: 14, borderRadius: 10, gap: 8 },
  id: { fontSize: 13, lineHeight: 20 },
  userList: { gap: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 70 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600' },
  userMeta: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  radio: { fontSize: 23 },
  newUserBox: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  notice: { fontSize: 13, lineHeight: 20 },
  footer: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingBottom: 12 },
});
