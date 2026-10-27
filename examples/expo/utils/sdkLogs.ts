import { activityReducer, type ActivityUpdate, type TesterActivity } from './testerActivity';

/** SDK logs have their own cap, so manual tester actions cannot evict them. */
export function sdkLogReducer(entries: TesterActivity[], update: ActivityUpdate): TesterActivity[] {
  if (update.type === 'add' && update.entry.kind !== 'sdk') return entries;
  return activityReducer(entries, update);
}

export function formatSdkPayload(payload: unknown): string {
  const seen = new WeakSet<object>();
  const result = JSON.stringify(payload, (key, value) => {
    if (/^(xapikey|apikey|authorization|accesstoken|refreshtoken|secret|password|usersignature|signature)$/i.test(key.replace(/[-_$]/g, ''))) return '[redacted]';
    if (typeof value === 'bigint') return String(value);
    if (value instanceof Error) return { name: value.name, message: value.message };
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[circular]';
      seen.add(value);
    }
    return value;
  }, 2) ?? '{}';
  return result.length > 16000 ? result.slice(0, 16000) + '\n… truncated' : result;
}

export function getSdkFormId(payload: { formId?: string; data?: Record<string, unknown> }): string | undefined {
  if (payload.formId) return payload.formId;
  const id = payload.data?.feedbackConfigurationId;
  return typeof id === 'string' && id ? id : undefined;
}
