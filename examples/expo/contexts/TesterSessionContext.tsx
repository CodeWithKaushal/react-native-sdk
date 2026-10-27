import { Encatch } from '@encatch/react-native-sdk';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  clearStoredTesterSetup,
  emptyTesterSetup,
  persistTesterSetup,
  type TesterSetupValues,
} from '@/contexts/TesterConfigContext';

type TesterSessionContextValue = {
  setupValues: TesterSetupValues;
  isSdkReady: boolean;
  isAnonymous: boolean;
  setAnonymous: (value: boolean) => void;
  userSelectionRequested: boolean;
  consumeUserSelection: () => void;
  continueToUserSelection: (values: TesterSetupValues) => Promise<void>;
  updateSetup: (values: TesterSetupValues) => Promise<void>;
  /** Clears saved setup and returns to the pre-login configuration screen. */
  changeSetup: () => Promise<void>;
};

const TesterSessionContext = createContext<TesterSessionContextValue | null>(null);

export function TesterSessionProvider({
  initialSetup,
  onSetupChange,
  children,
}: {
  initialSetup: TesterSetupValues;
  onSetupChange: (values: TesterSetupValues) => void;
  children: React.ReactNode;
}) {
  const [setupValues, setSetupValues] = useState(initialSetup);
  const [isAnonymous, setAnonymous] = useState(false);
  const [userSelectionRequested, setUserSelectionRequested] = useState(false);
  const consumeUserSelection = useCallback(() => setUserSelectionRequested(false), []);

  const updateSetup = useCallback(
    async (values: TesterSetupValues) => {
      await persistTesterSetup(values);
      // stop() only stops tracking; the native singleton otherwise keeps the old key/host.
      if (Encatch.isInitialized && (
        values.apiKey !== setupValues.apiKey ||
        values.environment !== setupValues.environment ||
        values.interceptorFormId !== setupValues.interceptorFormId
      )) {
        await Encatch.clearAll();
      }
      setAnonymous(false);
      setSetupValues(values);
      onSetupChange(values);
    },
    [onSetupChange, setupValues]
  );

  const continueToUserSelection = useCallback(async (values: TesterSetupValues) => {
    await updateSetup(values);
    setUserSelectionRequested(true);
  }, [updateSetup]);

  const changeSetup = useCallback(async () => {
    await clearStoredTesterSetup();
    await Encatch.clearAll();
    setAnonymous(false);
    setUserSelectionRequested(false);
    const next = emptyTesterSetup();
    setSetupValues(next);
    onSetupChange(next);
  }, [onSetupChange]);

  const value = useMemo(
    () => ({
      setupValues,
      isAnonymous,
      setAnonymous,
      userSelectionRequested,
      consumeUserSelection,
      continueToUserSelection,
      isSdkReady: setupValues.apiKey.trim().length > 0,
      updateSetup,
      changeSetup,
    }),
    [changeSetup, setupValues, updateSetup, isAnonymous, userSelectionRequested, consumeUserSelection, continueToUserSelection]
  );

  return <TesterSessionContext.Provider value={value}>{children}</TesterSessionContext.Provider>;
}

export function useTesterSession() {
  const ctx = useContext(TesterSessionContext);
  if (!ctx) {
    throw new Error('useTesterSession must be used within TesterSessionProvider');
  }
  return ctx;
}
