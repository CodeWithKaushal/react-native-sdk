import { useEffect } from 'react';
import { formatSdkPayload } from '@/utils/sdkLogs';
import { observeSdkNetwork } from '@/utils/sdkNetwork';
import { useTesterActivity } from '@/contexts/TesterActivityContext';

/** Observe the example's SDK HTTP operations, including requests initiated by form WebViews. */
export function TesterActivityObserver() {
  const { add, finish } = useTesterActivity();
  useEffect(() => observeSdkNetwork((request) => {
    const id = add({ kind: 'sdk', name: request.name, status: 'running', environment: request.environment,
      session: 'SDK request', detail: '', formId: request.formId, target: request.target,
      requestMethod: request.method, requestUrl: request.url, requestPayload: formatSdkPayload(request.body) });
    return (response) => finish({ id, status: response.error || (response.httpStatus !== undefined && response.httpStatus >= 400) ? 'error' : 'returned',
      durationMs: response.durationMs, httpStatus: response.httpStatus, detail: response.error || '',
      responsePayload: response.error ? formatSdkPayload({ error: response.error, ...(response.body !== undefined ? { body: response.body } : {}) }) : response.body !== undefined ? formatSdkPayload(response.body) : undefined });
  }), [add, finish]);
  return null;
}
