import { useMemo } from 'react';
import { mergeEnvFormIds, useTesterConfig } from '@/contexts/TesterConfigContext';

/** One shared ID for Home and Inline tabs. Empty input never falls back to a saved ID. */
export function useActiveFormId() {
  const { formId, setFormId } = useTesterConfig();
  const suggestedIds = useMemo(() => mergeEnvFormIds(formId), [formId]);
  return {
    suggestedIds,
    manualFormId: formId,
    selectedFormId: formId,
    setManualFormId: setFormId,
    setSelectedFormId: setFormId,
    activeFormId: formId.trim(),
  };
}
