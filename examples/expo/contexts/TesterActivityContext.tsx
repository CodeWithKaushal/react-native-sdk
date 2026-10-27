import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { sdkLogReducer } from '@/utils/sdkLogs';
import { activityReducer, type ActivityUpdate, type TesterActivity } from '@/utils/testerActivity';

type ActivityContextValue = {
  entries: TesterActivity[];
  sdkEntries: TesterActivity[];
  clearSdk: () => void;
  add: (entry: Omit<TesterActivity, 'id' | 'timestamp'>) => string;
  finish: (update: Omit<Extract<ActivityUpdate, { type: 'finish' }>, 'type'>) => void;
  clear: () => void;
};
const ActivityContext = createContext<ActivityContextValue | null>(null);

/** Memory only. Kept above setup/provider remounts, bounded for this app session. */
export function TesterActivityProvider({ children }: { children: ReactNode }) {
  const [entries, dispatch] = useReducer(activityReducer, []);
  const [sdkEntries, dispatchSdk] = useReducer(sdkLogReducer, []);
  const sequence = useRef(0);
  const add = useCallback((entry: Omit<TesterActivity, 'id' | 'timestamp'>) => {
    const id = `${Date.now()}-${++sequence.current}`;
    const update: ActivityUpdate = { type: 'add', entry: { ...entry, id, timestamp: Date.now() } };
    dispatch(update);
    dispatchSdk(update);
    return id;
  }, []);
  const finish = useCallback((update: Omit<Extract<ActivityUpdate, { type: 'finish' }>, 'type'>) => { dispatch({ type: 'finish', ...update }); dispatchSdk({ type: 'finish', ...update }); }, []);
  const clear = useCallback(() => { dispatch({ type: 'clear' }); dispatchSdk({ type: 'clear' }); }, []);
  const clearSdk = useCallback(() => dispatchSdk({ type: 'clear' }), []);
  const value = useMemo(() => ({ entries, sdkEntries, add, finish, clear, clearSdk }), [entries, sdkEntries, add, finish, clear, clearSdk]);
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}
export function useTesterActivity() {
  const value = useContext(ActivityContext);
  if (!value) throw new Error('TesterActivityProvider is required');
  return value;
}
