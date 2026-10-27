export const ACTIVITY_LIMIT = 100;
export type TrackingMethod = 'trackEvent' | 'trackScreen';
export type FormMethod = 'showForm' | 'dismissForm';
export type ActivityMethod = TrackingMethod | FormMethod;
export type ActivityStatus = 'running' | 'returned' | 'error' | 'received';
export type TesterActivity = {
  id: string;
  kind: 'call' | 'sdk';
  name: string;
  method?: ActivityMethod;
  source?: 'Home' | 'Events' | 'Exact' | 'Any';
  reset?: 'always' | 'on-complete' | 'never';
  status: ActivityStatus;
  timestamp: number;
  durationMs?: number;
  environment: string;
  session: string;
  detail: string;
  formId?: string;
  payload?: string;
  requestUrl?: string;
  requestPayload?: string;
  responsePayload?: string;
  requestMethod?: string;
  httpStatus?: number;
  target?: string;
};
export type ActivityUpdate =
  | { type: 'add'; entry: TesterActivity }
  | { type: 'finish'; id: string; status: 'returned' | 'error'; detail: string; durationMs: number; payload?: string; responsePayload?: string; httpStatus?: number }
  | { type: 'clear' };

export function activityReducer(entries: TesterActivity[], update: ActivityUpdate): TesterActivity[] {
  if (update.type === 'clear') return [];
  if (update.type === 'add') return [update.entry, ...entries].slice(0, ACTIVITY_LIMIT);
  return entries.map((entry) => entry.id === update.id
    ? { ...entry, status: update.status, detail: update.detail, durationMs: update.durationMs, ...(update.payload !== undefined ? { payload: update.payload } : {}), ...(update.responsePayload !== undefined ? { responsePayload: update.responsePayload } : {}), ...(update.httpStatus !== undefined ? { httpStatus: update.httpStatus } : {}) }
    : entry);
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  running: 'Calling SDK', returned: 'Call returned', error: 'Error', received: 'SDK event',
};

export async function executeTrackingCall(method: TrackingMethod, name: string, sdk: {
  trackEvent: (name: string) => Promise<void>;
  trackScreen: (name: string) => Promise<void>;
}, finish: (status: 'returned' | 'error', detail: string) => void): Promise<void> {
  try {
    await sdk[method](name);
    finish('returned', 'The SDK call returned. Network delivery and retries are handled internally; delivery is not confirmed here.');
  } catch (error) {
    finish('error', error instanceof Error ? error.message : 'The SDK call threw an error.');
  }
}

export async function executeInlineCall(method: FormMethod, formId: string, reset: 'always' | 'on-complete' | 'never', sdk: {
  showForm: (formId: string, options: { reset: 'always' | 'on-complete' | 'never' }) => Promise<void>;
  dismissForm: (formId?: string) => Promise<void>;
}, finish: (status: 'returned' | 'error', detail: string) => void): Promise<void> {
  try {
    if (method === 'showForm') await sdk.showForm(formId, { reset });
    else await sdk.dismissForm(formId);
    finish('returned', method === 'showForm'
      ? 'Show call returned. Check the inline preview and SDK form events to confirm the form opened.'
      : 'Dismiss call returned. Check the inline preview and SDK form events for the result.');
  } catch (error) {
    finish('error', error instanceof Error ? error.message : 'The inline SDK call threw an error.');
  }
}
