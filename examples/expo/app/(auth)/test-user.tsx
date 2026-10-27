import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Encatch, useEncatch } from '@encatch/react-native-sdk';
import { Action, Card, Field, Notice, Page, UserRow, styles, usePageColors } from '@/components/TesterOnboarding';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { useTestUsers } from '@/contexts/TestUsersContext';
import { getEnvironmentEndpoints } from '@/constants/environments';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { generateTestUser, identifyTestUser, startAnonymousSession } from '@/utils/testSessions';

function TestUserSelection() {
  const { setupValues, setAnonymous } = useTesterSession();
  const { users, isLoading, addUser } = useTestUsers();
  const { isInitialized, isIdentified, userName } = useEncatch();
  const colors = usePageColors();
  const { landscape } = useResponsiveLayout();
  const [mode, setMode] = useState<'identified' | 'anonymous'>('identified');
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clearing, setClearing] = useState(false);
  const operation = useRef(false);
  const busy = starting || !!pendingUser || clearing;

  useEffect(() => {
    if (pendingUser && isIdentified && userName === pendingUser && Encatch.userName === pendingUser && Encatch.userId) {
      setAnonymous(false);
      router.replace('/(tabs)');
    }
  }, [pendingUser, isIdentified, userName, setAnonymous]);

  useEffect(() => {
    if (!pendingUser) return;
    const timer = setTimeout(() => {
      operation.current = false;
      setPendingUser(null);
      setError('User identification has not been confirmed. Check your connection and SDK setup before retrying.');
    }, 20000);
    return () => clearTimeout(timer);
  }, [pendingUser]);

  const back = () => router.navigate('/(auth)/login');
  const clearFields = () => {
    setNewUsername(''); setNewEmail(''); setNewDisplayName('');
    setError('');
    setNotice('New-user fields cleared. Saved profiles are kept.');
  };
  const clearUserState = async () => {
    if (operation.current || creating) return;
    operation.current = true;
    setClearing(true);
    setError(''); setNotice('');
    try {
      await Encatch.resetUser();
      setAnonymous(false);
      setSelectedUsername(null);
      setPendingUser(null);
      setMode('identified');
      setShowNewUser(false);
      clearFields();
      setNotice('SDK identity and user selection cleared. Setup and saved profiles are kept.');
    } catch { setError('Could not clear the SDK user state. Please try again.'); }
    finally { operation.current = false; setClearing(false); }
  };
  const generate = () => {
    setNotice('');
    const user = generateTestUser();
    setNewUsername(user.username);
    setNewDisplayName(user.displayName);
    setNewEmail(user.email);
    setError('');
  };
  const create = async () => {
    if (!newUsername.trim() || creating) return;
    setCreating(true);
    setNotice('');
    setError('');
    try {
      await addUser({ username: newUsername.trim(), email: newEmail.trim(), displayName: newDisplayName.trim() });
      setSelectedUsername(newUsername.trim());
      setShowNewUser(false);
      setNewUsername(''); setNewEmail(''); setNewDisplayName('');
    } catch { setError('Could not save the test user. Please try again.'); }
    finally { setCreating(false); }
  };
  const start = async () => {
    if (operation.current || !isInitialized) return;
    const user = users.find((entry) => entry.username === selectedUsername);
    if (mode === 'identified' && !user) return;
    operation.current = true;
    setStarting(true);
    setNotice('');
    setError('');
    try {
      setAnonymous(false);
      if (mode === 'anonymous') {
        await startAnonymousSession(Encatch);
        setAnonymous(true);
        router.replace('/(tabs)');
      } else if (user) {
        await identifyTestUser(Encatch, user);
        // The SDK queues identification; navigation waits for confirmed identity above.
        setPendingUser(user.username);
      }
    } catch {
      operation.current = false;
      setError('Could not start the test session. Check your setup and try again.');
    } finally { setStarting(false); }
  };

  if (!isInitialized || isLoading) {
    return <Page step={2}><Card><ActivityIndicator color={colors.accent} /><Text style={[styles.description, { color: colors.muted }]}>Preparing the SDK…</Text></Card></Page>;
  }
  const creatingUser = showNewUser || users.length === 0;
  return (
    <Page step={2} footer={<View style={{ flexDirection: landscape ? 'row-reverse' : 'column', gap: 8 }}>
      <View style={landscape ? { flex: 1 } : undefined}>
      {mode === 'identified' && creatingUser
        ? <Action title={creating ? 'Saving user…' : 'Save test user'} onPress={() => void create()} disabled={!newUsername.trim() || busy} busy={creating} />
        : <Action title={mode === 'anonymous' ? starting ? 'Starting session…' : 'Continue anonymously' : starting || pendingUser ? 'Identifying user…' : 'Identify & continue'} onPress={() => void start()} disabled={creating || clearing || (mode === 'identified' && !selectedUsername)} busy={starting || !!pendingUser} />}
      </View>
      <Pressable accessibilityRole="button" disabled={busy || creating} onPress={back} style={[styles.textButton, landscape && { flex: 1, alignItems: 'center', alignSelf: 'stretch' }]}><Text style={[styles.link, { color: colors.accent }]}>← Back to SDK setup</Text></Pressable>
    </View>}>
      <Card>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Test user</Text>
          <Text style={[styles.badge, { color: colors.success, backgroundColor: colors.background }]}>{getEnvironmentEndpoints(setupValues.environment).label} · setup saved</Text>
        </View>
        <Text style={[styles.description, { color: colors.muted }]}>Choose an identified user or test an anonymous session.</Text>
        <Action title={clearing ? 'Clearing user state…' : 'Clear user state'} secondary onPress={() => void clearUserState()} disabled={starting || !!pendingUser || creating} busy={clearing} />
        <Text style={[styles.hint, { color: colors.muted }]}>Reset the SDK identity and this step. Your saved setup and user profiles stay on this device.</Text>
        <View accessibilityRole="radiogroup" style={styles.envRow}>
          {(['identified', 'anonymous'] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === mode, disabled: busy || creating }} disabled={busy || creating}
            onPress={() => { setMode(value); setError(''); setNotice(''); }} style={[styles.envChip, { borderColor: mode === value ? colors.accent : colors.border, backgroundColor: mode === value ? colors.selected : colors.surface }]}>
            <Text style={[styles.envLabel, { color: mode === value ? colors.accent : colors.muted }]}>{value === 'identified' ? 'Test user' : 'Anonymous'}</Text>
          </Pressable>)}
        </View>

        {mode === 'anonymous' ? <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue without identifying</Text>
          <Text style={[styles.description, { color: colors.muted }]}>The SDK starts a session without a username, email, or profile. This option clears the previous SDK identity and does not call identifyUser.</Text>
          <Text style={[styles.hint, { color: colors.muted }]}>Anonymous sessions still use the SDK's device and session identifiers.</Text>
        </> : <>
          {!!users.length && <View accessibilityRole="radiogroup" style={styles.userList}>
            {users.map((user) => <UserRow key={user.username} user={user} selected={selectedUsername === user.username} disabled={busy || creating} onPress={() => { setSelectedUsername(user.username); setError(''); }} />)}
          </View>}
          {!creatingUser ? <Action title="+ New test user" secondary onPress={() => setShowNewUser(true)} disabled={busy} /> : <View style={[styles.newUserBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.label, { color: colors.text }]}>{users.length ? 'New test user' : 'Create your first test user'}</Text>
            <Action title="Generate random user" secondary onPress={generate} disabled={creating || busy} />
            <Action title="Clear fields" secondary onPress={clearFields} disabled={creating || busy} />
            <Text style={[styles.hint, { color: colors.muted }]}>Generate sample details, edit them if needed, then save.</Text>
            <Field label="Username" placeholder="e.g. tester_01" value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" editable={!creating && !busy} />
            <Field label="Display name" optional placeholder="e.g. Test User" value={newDisplayName} onChangeText={setNewDisplayName} editable={!creating && !busy} />
            <Field label="Email" optional placeholder="e.g. tester@example.com" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" editable={!creating && !busy} />
            {!!users.length && <Action title="Cancel" secondary onPress={() => setShowNewUser(false)} disabled={creating || busy} />}
          </View>}
          {selectedUsername && !creatingUser && <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.push({ pathname: '/edit-profile', params: { username: selectedUsername } })} style={styles.textButton}>
            <Text style={[styles.link, { color: colors.accent }]}>Edit selected user's profile</Text>
          </Pressable>}
          {!creatingUser && <>
            <Text style={[styles.hint, { color: colors.muted }]}>{selectedUsername ? `Continue as ${selectedUsername}.` : 'Select a saved user to continue.'}</Text>
          </>}
        </>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: colors.success }]}>{notice}</Text>}
        {!!error && <Notice message={error} error />}
      </Card>
    </Page>
  );
}

export default function TestUserScreen() {
  const { isSdkReady } = useTesterSession();
  return isSdkReady ? <TestUserSelection /> : <Redirect href="/(auth)/login" />;
}
