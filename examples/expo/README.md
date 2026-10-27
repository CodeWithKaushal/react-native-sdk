# Expo example

Expo app for testing the `@encatch/react-native-sdk` SDK from this repository.

## Setup

1. Copy `.env.example` to `.env` and set your API key:

   ```bash
   cp .env.example .env
   # Edit .env: set EXPO_PUBLIC_ENCATCH_API_KEY
   ```

2. From the repository root, install dependencies and build the SDK:

   ```bash
   pnpm install
   pnpm build
   ```

## Run

```bash
pnpm dev
# or: pnpm start
```

Then press `i` for iOS simulator or `a` for Android emulator.

## Setup and test-user flow

1. **SDK setup:** Choose the environment, enter the API key and feedback
   configuration ID, then tap **Next: Test user**.
2. **Test user:** Select a saved user, or choose **New test user**. The
   **Generate random user** button fills editable sample details using an
   `example.com` email address; save the user before identifying.
3. Choose **Anonymous** → **Continue anonymously** to test without identifying.
   This calls the SDK's public `resetUser()` followed by `startSession()`;
   it never calls `identifyUser()` or creates an anonymous-looking username.
   Device/session tracking still applies. Anonymous access is held in memory
   for this tester session, rather than saved as a user profile.

Identified sessions also reset the previous identity before calling
`identifyUser()`, and wait for the SDK's confirmed identity before opening Home.
Use **Logout** / **End session** to return to test-user selection, or
**Back to SDK setup** to edit the project configuration. SDK source is unchanged.

### Clear controls

These follow the separation between SDK reset and stored-configuration cleanup in
`encatch-e2e/src/pages/encatch-test/index.tsx`, using native APIs:

- **Clear SDK setup** (step 1): removes this example's saved connection keys and
  calls the React Native SDK's `clearAll()` to reset SDK configuration, identity,
  and device/session state. Saved test-user profiles are retained.
- **Clear user state** (step 2): calls `resetUser()`, deselects the user, and clears
  the current new-user draft. Connection settings and saved profiles are retained.
- **Clear fields** (new-user form): empties the draft without changing SDK state
  or saved profiles.

Changing an initialized SDK's API key, environment, or interceptor configuration
also resets the native singleton before remounting the provider. `stop()` alone
only stops tracking and would keep the previous configuration. A form-ID-only
change preserves identity and device state.

Checks from the repository root:

```bash
node examples/expo/tests/activeFormId.test.cjs
node examples/expo/tests/testSessions.test.cjs
node examples/expo/tests/setupLifecycle.test.cjs
```

## Home testing workspace

Home shows the selected environment and the current identified/anonymous session.
The main **Show form** action uses the visible ID, shared with both Inline tabs;
**Clear form ID** disables form actions until another ID is entered or selected.

Expand **Advanced form tests** for:

- Response reset modes: `always`, `on-complete`, and `never`.
- Editable text-question prefill (question ID/slug plus answer), with a clear action.
- The configured native interceptor test.

The Events card sends `home_viewed` and links to the dedicated Events and Inline
tabs. The Latest action panel shows request progress and public form events;
a completed SDK call is not treated as confirmation that a form opened or an
event was delivered. Form errors swallowed internally by the SDK remain in its
existing debug console output.

Run shared form-ID checks with
`node examples/expo/tests/activeFormId.test.cjs`.

## Navigation and responsive layout

- Bottom tabs: **Home**, **Latest action**, **Events**, **Exact**, **Any**, and **Settings**, with
  selected-state labels and safe-area padding. The tab bar hides for the keyboard.
- The header's **…** menu contains user switching, SDK setup, form theme, and
  session exit. Form theme applies to SDK forms; the tester follows system theme.
- SDK setup and test-user pages keep Next / Save / Continue in a footer. Back and
  Continue share a row in short landscape layouts. The footer hides while typing.
- Screen padding, cards, and field/action rows adapt to narrow widths and font
  scaling. Content stays scrollable and has a readable maximum width on tablets.
- Native tester fields request that OS autofill be disabled for API keys and
  sample profiles; device password managers may still offer their own prompts.

## Events and activity history

Events uses the same cards, colors, and responsive spacing as Home. Choose
**Event** or **Screen view**, tap a preset to fill the input, or enter a custom
name. **Send event** / **Track screen** makes one SDK call; **Repeat latest call**
reuses the last submitted method and name. Screen tests do not navigate the app.

The Events page's **Latest action** card shows the latest manual event/screen
call and its status. **Repeat latest call** reuses that method and name.

The **Latest action** footer tab and header **SDK request logs** menu show actual
native SDK API traffic: **Show form**, **Submit form**, **Upload file**,
**Track event**, **Track screen**, **Dismiss form**, identification, text/AI,
and session ping requests. Lifecycle-only `track-event` telemetry such as
`form:show`, `form:started`, and section changes is excluded.

The compact inspector shows request method, pending/HTTP/error status, elapsed
time, and event name / screen path / form ID. Tap a row, then select **Request** or **Response** to inspect the URL and
request body, response status/body, or a transport error. The two bodies have
independent size limits and scrollable inspectors. Search and **Clear logs**
remain available. The newest 100 requests are held in memory for this app session;
manual tester activity has a separate buffer.

The example observes `fetch` and `XMLHttpRequest` only for the Encatch SDK API
hosts and endpoints, including SDK requests initiated by native form WebViews.
Fetch-backed XHR is deduplicated. Requests, original responses, errors, upload
progress callbacks, and SDK retry behavior are preserved; cleanup restores the
original transports. Headers are not logged, credential-named fields are
redacted, file bytes/local URIs are omitted, and each displayed payload is bounded.
Networking performed entirely inside a WebView page is outside this native
transport inspector. SDK source remains unchanged.

Checks:

```bash
node examples/expo/tests/testerActivity.test.cjs
node examples/expo/tests/sdkLogs.test.cjs
node examples/expo/tests/sdkNetwork.test.cjs
```

## Inline form testing

**Exact** pins the inline slot to the selected form ID. **Any** uses a wildcard
slot: unmatched forms render here, while exact slots take priority. Both pages
share the form ID with Home, with a manual input, saved suggestions, and
**Clear form ID**. The inline preview is mounted only while its tab is focused.

Choose **Always**, **On complete**, or **Never** for response reset, then tap
**Show inline form**. The page distinguishes a show request from the SDK's actual
`form:show` event. **Dismiss inline form** becomes available after an open event.
Changing tabs or editing the form ID removes the preview; reopening requires another show call.

Show and dismiss calls remain in each Inline page's **Latest inline action**
card, with their source, form ID, reset mode, timestamp, duration, and returned/error
status. **View SDK logs** opens the **Latest action** footer tab, which contains
actual SDK API requests and their responses, including submit and upload operations. A returned show call alone does not
confirm that a form opened. The SDK itself is unchanged.

## Settings

**Change SDK setup** opens the saved configuration for editing.
**Change test user** opens saved/new/anonymous selection. Settings shows the
active form IDs, a masked API key, SDK initialization state, and the current
user. Connection endpoints and **Reset saved setup** controls are collapsible;
clearing setup keeps saved test-user profiles.

## Features

- **Login** — Mock login calls `identifyUser(username)`
- **Home** — Track event: `home_viewed`
- **Events** — Preset/custom event and screen calls, latest action, repeat call, and session activity history
- **Settings** — Logout calls `resetUser()`
- **Screen tracking** — Expo Router auto-tracks via `navigationType="expo-router"`
- **Billing** — Destination for `completionCta` `app_navigate` routes (`billing`, `billing/upgrade`)
- **CTA navigation** — `CtaNavigationHandler` maps `form:ctaTriggered` events to `/billing` or `/route-not-found`

## Manual test checklist

1. **Setup:** Copy `.env` with `EXPO_PUBLIC_ENCATCH_API_KEY` (and optional form IDs). Run the app and log in.
2. **Exact inline:** **Inline (Exact)** → show embedded form.
3. **Wildcard inline:** **Inline (Any)** → enter a form id → show embedded form.
4. **Home modal:** **Home** → show form → opens as modal overlay.
5. **Interceptor:** **Home** → interceptor test → blocked WebView, native modal carousel.
6. **app_navigate (billing):** Configure a thank-you screen with `completionCta.inApp: { action: "app_navigate", route: "billing" }` (or `"billing/upgrade"`). Complete the form and tap the CTA. Expect the overlay to close (SDK) and navigation to **Billing**.
7. **app_navigate (404):** Use a form with an unmapped route such as `"does/not/exist"`. Complete and tap the CTA. Expect **Route not found** with the requested route, then **Go back**.
8. **exit_form + app_navigate + delay:** `exit_form` with `action: "app_navigate"`, `route: "billing"`, and `autoTriggerDelayMs: 5000`. Submit from an inline tab — form clears immediately; ~5s later navigation to Billing (SDK timer, no host timer).

## Environment variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_ENCATCH_API_KEY` | Optional default API key for the setup screen (overridden by saved local value) |
| `EXPO_PUBLIC_ENCATCH_API_BASE_URL` | API base URL (default: https://api.encatch.com) |
| `EXPO_PUBLIC_ENCATCH_WEB_HOST` | WebView host (default: https://form.encatch.com) |
| `EXPO_PUBLIC_ENCATCH_FORM_ID` | Optional comma-separated defaults for the form id picker |

On launch, the setup screen asks for **API key** and **feedback configuration ID** (required). Both are saved locally and restored on the next launch until you tap **Clear saved setup** in Settings. You can change the form id on Home / Inline tabs without rebuilding. Set an optional **interceptor test form ID** on setup to enable the native interceptor carousel demo.
