import { Redirect, Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useEncatch } from '@encatch/react-native-sdk';

import { Text, View } from '@/components/Themed';
import { usePageColors } from '@/components/TesterOnboarding';
import { TesterScreen } from '@/components/TesterScreen';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { popToPreviousOrHome } from '@/navigation/ctaDestinationNavigation';

/** Sample destination for completionCta `app_navigate` billing routes. */
export default function BillingScreen() {
  const router = useRouter();
  const { isInitialized, isIdentified } = useEncatch();
  const colors = usePageColors();
  const { isAnonymous } = useTesterSession();

  if (!isInitialized) return null;
  if (!isIdentified && !isAnonymous) return <Redirect href="/(auth)/login" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Billing' }} />
      <TesterScreen bottomInset>
        <SymbolView
          name={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }}
          tintColor={colors.accent}
          size={64}
        />
        <Text style={[styles.title, { color: colors.text }]}>Billing</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          This screen is the in-app destination for completionCta routes such as
          &quot;billing&quot; or &quot;billing/upgrade&quot;.
        </Text>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => popToPreviousOrHome(router)}>
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </TesterScreen>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 24,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
  },
  body: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 22,
  },
  separator: {
    marginVertical: 24,
    height: 1,
    width: '100%',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
