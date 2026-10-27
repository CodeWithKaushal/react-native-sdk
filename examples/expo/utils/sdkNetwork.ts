export type SdkRequest = {
  name: string;
  url: string;
  method: string;
  environment: string;
  body: unknown;
  formId?: string;
  target?: string;
};
export type SdkResponse = { httpStatus?: number; durationMs: number; body?: unknown; error?: string };
type NetworkObserver = (request: SdkRequest) => (response: SdkResponse) => void;

const HOSTS: Record<string, string> = { 'api.encatch.com': 'prod', 'api.dev.encatch.com': 'dev', 'api.uat.encatch.com': 'uat' };
const OPERATIONS: Record<string, string> = {
  'identify-user': 'Identify user', 'track-event': 'Track event', 'track-screen': 'Track screen',
  'show-form': 'Show form', 'submit-form': 'Submit form', 'dismiss-form': 'Dismiss form',
  upload: 'Upload file', 'refine-text': 'Refine text', 'qna-with-ai/stream': 'AI conversation', ping: 'Session ping',
};
const PREFIX = '/engage-product/encatch/api/v2/encatch/';

export function parseNetworkBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return body.length > 16000 ? body.slice(0, 16000) + '… truncated' : body; }
  }
  if (body && typeof body === 'object') {
    const form = body as { getParts?: () => Array<Record<string, unknown>>; forEach?: (callback: (value: unknown, key: string) => void) => void };
    // Keep upload metadata, never copy file bytes, base64, or local file URIs.
    if (typeof form.getParts === 'function') {
      return Object.fromEntries(form.getParts().map((part) => [String(part.fieldName), typeof part.string === 'string' ? part.string : { fileName: part.name, type: part.type, file: '[file contents omitted]' }]));
    }
    if (typeof form.forEach === 'function') {
      const result: Record<string, unknown> = {};
      form.forEach((value, key) => { result[key] = typeof value === 'string' ? value : { file: '[file contents omitted]' }; });
      return result;
    }
  }
  return body ?? null;
}

export function describeSdkRequest(url: string, method: string, rawBody: unknown): SdkRequest | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const environment = HOSTS[parsed.hostname];
  if (!environment || parsed.protocol !== 'https:' || !parsed.pathname.startsWith(PREFIX)) return null;
  const endpoint = parsed.pathname.slice(PREFIX.length);
  const name = OPERATIONS[endpoint];
  if (!name) return null;
  let body: unknown;
  try { body = parseNetworkBody(rawBody); } catch { body = '[request body unavailable]'; }
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  // Lifecycle telemetry is deliberately excluded from the operations panel.
  if (endpoint === 'track-event' && typeof data.eventName === 'string' && data.eventName.startsWith('form:')) return null;
  const formId = [data.formSlugOrId, data.feedbackConfigurationId, data.formConfigurationId, data.formId].find((value) => typeof value === 'string' && value) as string | undefined;
  const device = data.$deviceInfo as Record<string, unknown> | undefined;
  const target = endpoint === 'track-event' ? data.eventName : endpoint === 'track-screen' ? device?.$urlOrScreenName : formId;
  return { name, method: method.toUpperCase(), url: parsed.origin + parsed.pathname, environment, body, formId, target: typeof target === 'string' ? target : undefined };
}

/** Example-only transport observation; request arguments and SDK implementations stay intact. */
export function observeSdkNetwork(observer: NetworkObserver, runtime: Pick<typeof globalThis, 'fetch' | 'XMLHttpRequest'> = globalThis) {
  const originalFetch = runtime.fetch;
  const prototype = runtime.XMLHttpRequest?.prototype;
  const originalOpen = prototype?.open;
  const originalSend = prototype?.send;
  const requests = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
  let fetchDepth = 0;
  let active = true;
  const begin = (request: SdkRequest | null) => {
    if (!request || !active) return undefined;
    try { return observer(request); } catch { return undefined; }
  };
  const complete = (callback: ReturnType<typeof begin>, response: SdkResponse) => {
    if (!active) return;
    try { callback?.(response); } catch { /* Logging must not affect SDK traffic. */ }
  };
  const wrappedFetch: typeof fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const request = describeSdkRequest(url, init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET'), init?.body);
    const callback = begin(request);
    const started = Date.now();
    let pending: ReturnType<typeof fetch>;
    // RN's fetch polyfill starts an XHR synchronously. Suppress that duplicate.
    fetchDepth++;
    try { pending = Reflect.apply(originalFetch, runtime, [input, init]); }
    catch (error) {
      complete(callback, { durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally { fetchDepth--; }
    if (!callback) return pending;
    return pending.then((response) => {
      const result = { httpStatus: response.status, durationMs: Date.now() - started };
      complete(callback, result);
      try {
        void response.clone().text().then((body) => complete(callback, { ...result, durationMs: Date.now() - started, body: parseNetworkBody(body) }), () => complete(callback, { ...result, body: '[response body unavailable]' }));
      } catch { complete(callback, { ...result, body: '[response body unavailable]' }); }
      return response;
    }, (error) => {
      complete(callback, { durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      throw error;
    });
  };
  const wrappedOpen = function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    requests.set(this, { method, url: String(url) });
    return Reflect.apply(originalOpen!, this, [method, url, ...rest]);
  } as typeof XMLHttpRequest.prototype.open;
  const wrappedSend = function(this: XMLHttpRequest, body?: Parameters<XMLHttpRequest['send']>[0]) {
    const info = requests.get(this);
    const callback = fetchDepth === 0 && info ? begin(describeSdkRequest(info.url, info.method, body)) : undefined;
    if (!callback) return originalSend!.call(this, body);
    const started = Date.now();
    let done = false;
    const finish = (event: Event) => {
      if (done) return;
      done = true;
      for (const name of ['loadend', 'error', 'abort', 'timeout']) this.removeEventListener(name, finish);
      let responseBody: unknown;
      try { responseBody = this.responseType === 'json' ? this.response : parseNetworkBody(this.responseText); } catch { responseBody = '[response body unavailable]'; }
      complete(callback, { httpStatus: this.status || undefined, durationMs: Date.now() - started, body: responseBody,
        error: event.type === 'error' ? 'Network error' : event.type === 'abort' ? 'Request aborted' : event.type === 'timeout' ? 'Request timed out' : this.status === 0 ? 'No HTTP response' : undefined });
    };
    for (const name of ['loadend', 'error', 'abort', 'timeout']) this.addEventListener(name, finish);
    try { return originalSend!.call(this, body); }
    catch (error) { finish({ type: 'error' } as Event); throw error; }
  } as typeof XMLHttpRequest.prototype.send;
  runtime.fetch = wrappedFetch;
  if (prototype) { prototype.open = wrappedOpen; prototype.send = wrappedSend; }
  return () => {
    active = false;
    if (runtime.fetch === wrappedFetch) runtime.fetch = originalFetch;
    if (prototype?.open === wrappedOpen) prototype.open = originalOpen!;
    if (prototype?.send === wrappedSend) prototype.send = originalSend!;
  };
}
