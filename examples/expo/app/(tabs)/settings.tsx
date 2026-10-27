import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEncatch } from '@encatch/react-native-sdk';
import { TesterScreen } from '@/components/TesterScreen';
import { Action, Card, usePageColors } from '@/components/TesterOnboarding';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { useTesterConfig } from '@/contexts/TesterConfigContext';
import { getEnvironmentEndpoints } from '@/constants/environments';
import { useTestUsers } from '@/contexts/TestUsersContext';

export default function SettingsScreen() {
  const { userName, isInitialized } = useEncatch();
  const { changeSetup, setupValues, isAnonymous } = useTesterSession();
  const { formId, interceptorFormId } = useTesterConfig();
  const { getUser, users } = useTestUsers();
  const colors = usePageColors();
  const endpoints = getEnvironmentEndpoints(setupValues.environment);
  const profile = userName ? getUser(userName) : undefined;
  const [details, setDetails] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const clear = async () => {
    if (clearing) return;
    setClearing(true); setError('');
    try { await changeSetup(); }
    catch { setError('Could not clear setup. Please try again.'); }
    finally { setClearing(false); }
  };
  const title = [styles.title, { color: colors.text }];
  const hint = [styles.body, { color: colors.muted }];
  const row = (label: string, value: string) => <View style={[styles.valueRow, { borderBottomColor: colors.border }]}><Text style={[styles.meta, { color: colors.muted }]}>{label}</Text><Text selectable style={[styles.value, { color: colors.text }]}>{value}</Text></View>;
  return <TesterScreen contentStyle={styles.stack}>
    <View style={styles.intro}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>ENCATCH SDK TESTER</Text>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Settings</Text>
      <Text style={hint}>Manage your SDK connection and choose who you test as.</Text>
    </View>
    <Card>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={title}>SDK setup</Text>
        <Text style={[styles.badge, { backgroundColor: colors.selected, color: colors.accent }]}>{endpoints.label}</Text>
      </View>
      <Text style={[styles.meta, { color: isInitialized ? colors.success : colors.warning }]}>{isInitialized ? '● SDK initialized' : '○ SDK starting'}</Text>
      {row('API key', setupValues.apiKey ? 'Configured · ••••••••' : 'Not configured')}
      {row('Feedback configuration ID', formId.trim() || 'Not selected')}
      {row('Interceptor form ID', interceptorFormId.trim() || 'Not configured')}
      <Action title="Change SDK setup" disabled={clearing} onPress={() => router.navigate('/(auth)/login')} />
      <Text style={hint}>Edit the environment, API key, or form IDs in SDK setup.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={styles.linkButton}><Text style={[styles.link, { color: colors.accent }]}>{details ? '− Hide connection details' : '+ Connection details'}</Text></Pressable>
      {details && <View style={[styles.connection, { backgroundColor: colors.background }]}>
        {row('API endpoint', endpoints.apiBaseUrl)}
        {row('Form host', endpoints.webHost)}
      </View>}
    </Card>
    <Card>
      <Text accessibilityRole="header" style={title}>Test user</Text>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: colors.selected }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{isAnonymous ? 'A' : (profile?.displayName || userName || 'U').slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.flex}>
          <Text style={[styles.userName, { color: colors.text }]}>{isAnonymous ? 'Anonymous session' : profile?.displayName || userName || 'Test user'}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{isAnonymous ? 'No user identified' : 'Identified user'}</Text>
        </View>
      </View>
      {!isAnonymous && !!userName && row('Username', userName)}
      {!isAnonymous && !!profile?.email && row('Email', profile.email)}
      <Action title="Change test user" disabled={clearing} onPress={() => router.navigate('/(auth)/test-user')} />
      <Text style={hint}>Choose a saved user, generate a new one, or continue anonymously.</Text>
      <Text style={[styles.meta, { color: colors.muted }]}>{users.length} saved {users.length === 1 ? 'profile' : 'profiles'} on this device</Text>
      {!isAnonymous && !!userName && <Action title="Edit current profile" secondary disabled={clearing} onPress={() => router.push({ pathname: '/edit-profile', params: { username: userName } })} />}
    </Card>
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: resetOpen }} disabled={clearing} onPress={() => setResetOpen(!resetOpen)} style={styles.linkButton}><Text style={[styles.link, { color: colors.muted }]}>{resetOpen ? '− Reset saved setup' : '+ Reset saved setup'}</Text></Pressable>
      {resetOpen && <>
        <Text style={hint}>Remove saved connection settings and reset SDK state. Saved test-user profiles are kept.</Text>
        <Action title={clearing ? 'Clearing setup…' : 'Clear SDK setup'} secondary busy={clearing} onPress={() => void clear()} />
      </>}
      {!!error && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.error }]}>{error}</Text>}
    </Card>
  </TesterScreen>;
}
const styles = StyleSheet.create({
  stack: { gap: 20 }, intro: { gap: 12 }, flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  heading: { fontSize: 26, fontWeight: '700' }, title: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22 }, meta: { fontSize: 12, lineHeight: 19 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: '600' },
  valueRow: { gap: 5, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  value: { fontSize: 14, lineHeight: 22, flexShrink: 1 },
  connection: { padding: 14, borderRadius: 10, gap: 12 },
  linkButton: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  link: { fontSize: 14, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
});
