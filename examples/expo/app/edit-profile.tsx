import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEncatch } from '@encatch/react-native-sdk';
import { usePageColors } from '@/components/TesterOnboarding';
import { TesterScreen } from '@/components/TesterScreen';
import {
  buildIdentifyTraits,
  splitDisplayName,
  useTestUsers,
} from '@/contexts/TestUsersContext';

export default function EditProfileScreen() {
  const { username: usernameParam } = useLocalSearchParams<{ username?: string }>();
  const { userName, identifyUser, isIdentified, isInitialized } = useEncatch();
  const { getUser, updateUser } = useTestUsers();
  const colors = usePageColors();

  const username = (usernameParam ?? userName ?? '').trim();
  const stored = username ? getUser(username) : undefined;
  const [email, setEmail] = useState(stored?.email ?? '');
  const [displayName, setDisplayName] = useState(stored?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stored) {
      setEmail(stored.email);
      setDisplayName(stored.displayName);
    }
  }, [stored?.email, stored?.displayName, username]);

  const { firstName, lastName } = splitDisplayName(displayName);

  const handleSave = async () => {
    if (!username) return;
    setSaving(true);
    await updateUser(username, { email: email.trim(), displayName: displayName.trim() });
    if (isIdentified && userName === username) {
      identifyUser(username, buildIdentifyTraits({ email, displayName }));
    }
    setSaving(false);
    router.back();
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!username) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Select a user on the login screen first.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Go to login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <TesterScreen bottomInset>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Identify user</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>
          Username cannot be changed. Email and display name are sent as $set traits.
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>User name</Text>
        <TextInput
          style={[
            styles.input,
            styles.inputReadOnly,
            { color: colors.muted, borderColor: colors.muted },
          ]}
          value={username}
          editable={false}
        />

        <Text style={[styles.label, { color: colors.text }]}>$set — email</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.muted }]}
          placeholder="user@example.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoComplete="off"
        importantForAutofill="no"
        autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: colors.text }]}>$set — display_name</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.muted }]}
          placeholder="Test User"
          placeholderTextColor={colors.muted}
          value={displayName}
          onChangeText={setDisplayName}
        />

        {(firstName || lastName) && (
          <View style={styles.namePreview}>
            <Text style={[styles.hint, { color: colors.muted }]}>
              First name: {firstName || '—'} · Last name: {lastName || '—'}
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
          onPress={() => void handleSave()}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isIdentified && userName === username ? 'Save & identify' : 'Save profile'}
            </Text>
          )}
        </Pressable>
    </TesterScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  inputReadOnly: {
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  namePreview: {
    marginBottom: 8,
  },
  button: {
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2457C6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#2457C6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
