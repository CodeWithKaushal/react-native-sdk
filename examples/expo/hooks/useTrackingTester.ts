import { useRef, useState } from 'react';
import { Encatch, useEncatch } from '@encatch/react-native-sdk';
import { useTesterActivity } from '@/contexts/TesterActivityContext';
import { useTesterSession } from '@/contexts/TesterSessionContext';
import { executeTrackingCall, type TrackingMethod } from '@/utils/testerActivity';

export function useTrackingTester() {
  const { isInitialized, userName } = useEncatch();
  const { isAnonymous, setupValues } = useTesterSession();
  const { add, finish } = useTesterActivity();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (method: TrackingMethod, value: string) => {
    const name = value.trim();
    if (lock.current || !isInitialized || !name) return;
    lock.current = true;
    setBusy(true);
    const started = Date.now();
    const id = add({ kind: 'call', source: 'Events', method, name, status: 'running', environment: setupValues.environment,
      session: isAnonymous ? 'Anonymous' : userName || 'Identified user', detail: 'Calling the SDK…' });
    try {
      await executeTrackingCall(method, name, Encatch, (status, detail) => finish({ id, status, detail, durationMs: Date.now() - started }));
    } finally { lock.current = false; setBusy(false); }
  };
  return { run, busy, isInitialized };
}
