import { useRef, useState } from 'react';
import { Encatch, useEncatch, type ResetMode } from '@encatch/react-native-sdk';
import { useTesterActivity } from '@/contexts/TesterActivityContext';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { executeInlineCall, type FormMethod } from '@/utils/testerActivity';

export function useInlineTester(source: 'Exact' | 'Any') {
  const { isInitialized, userName } = useEncatch();
  const { isAnonymous, setupValues } = useTesterSession();
  const { add, finish } = useTesterActivity();
  const lock = useRef(false);
  const [busy, setBusy] = useState<FormMethod | null>(null);
  const run = async (method: FormMethod, value: string, reset: ResetMode) => {
    const formId = value.trim();
    if (lock.current || !isInitialized || !formId) return;
    lock.current = true; setBusy(method);
    const started = Date.now();
    const id = add({ kind: 'call', source, method, name: `${method === 'showForm' ? 'Show' : 'Dismiss'} inline ${source.toLowerCase()} form`,
      formId, reset: method === 'showForm' ? reset : undefined, status: 'running', environment: setupValues.environment,
      session: isAnonymous ? 'Anonymous' : userName || 'Identified user', detail: `Calling ${method}…` });
    try {
      await executeInlineCall(method, formId, reset, Encatch, (status, detail) => finish({ id, status, detail, durationMs: Date.now() - started }));
    } finally { lock.current = false; setBusy(null); }
  };
  return { run, busy, isInitialized };
}
