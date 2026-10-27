import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Action, Card, Notice, Page, SetupFields, styles, usePageColors } from '@/components/TesterOnboarding';
import { emptyTesterSetup } from '@/contexts/TesterConfigContext';
import { useTesterSession } from '@/contexts/TesterSessionContext';

export default function SdkSetupScreen() {
  const { setupValues, changeSetup, continueToUserSelection, isSdkReady, userSelectionRequested, consumeUserSelection } = useTesterSession();
  const colors = usePageColors();
  const [draft, setDraft] = useState(setupValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  useEffect(() => setDraft(setupValues), [setupValues]);
  // Setup can mount a new SDK provider. Navigate after the replacement tree is ready.
  useEffect(() => {
    if (!isSdkReady || !userSelectionRequested) return;
    consumeUserSelection();
    router.push('/(auth)/test-user');
  }, [isSdkReady, userSelectionRequested, consumeUserSelection]);

  const canSave = !!draft.apiKey.trim() && !!draft.formId.trim();
  const save = async () => {
    if (!canSave || saving || clearing) return;
    setSaving(true);
    setError('');
    try {
      await continueToUserSelection({ ...draft, apiKey: draft.apiKey.trim(), formId: draft.formId.trim(), interceptorFormId: draft.interceptorFormId.trim() });
    } catch { setError('Could not save setup on this device. Please try again.'); }
    finally { setSaving(false); }
  };
  const clear = async () => {
    if (saving || clearing) return;
    setClearing(true);
    setError('');
    try {
      await changeSetup();
      setDraft(emptyTesterSetup());
    } catch { setError('Could not clear saved setup. Please try again.'); }
    finally { setClearing(false); }
  };
  return (
    <Page step={1} footer={<>
      <Action title={saving ? 'Saving setup…' : 'Next: Test user'} onPress={() => void save()} disabled={!canSave || clearing} busy={saving} />
      {!canSave && <Text style={[styles.hint, { color: colors.muted }]}>Enter an API key and form ID to continue.</Text>}
    </>}>
      <Card>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>SDK setup</Text>
        <Text style={[styles.description, { color: colors.muted }]}>Connect your project, then choose how to test on the next page.</Text>
        <SetupFields {...draft} disabled={saving || clearing}
          onApiKeyChange={(apiKey) => setDraft((value) => ({ ...value, apiKey }))}
          onFormIdChange={(formId) => setDraft((value) => ({ ...value, formId }))}
          onInterceptorFormIdChange={(interceptorFormId) => setDraft((value) => ({ ...value, interceptorFormId }))}
          onEnvironmentChange={(environment) => setDraft((value) => ({ ...value, environment }))}
        />
        {!!error && <Notice message={error} error />}
        <Action title={clearing ? 'Clearing setup…' : 'Clear SDK setup'} secondary onPress={() => void clear()} disabled={saving} busy={clearing} />
        <Text style={[styles.hint, { color: colors.muted }]}>Clear removes the saved API key, form IDs, and active SDK state from this device. Saved test-user profiles are kept.</Text>
      </Card>
    </Page>
  );
}
