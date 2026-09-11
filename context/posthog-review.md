# PostHog Review

Reviewed: 2026-09-11

Status: Both findings resolved on 2026-09-11. RootLayout now passes current server-session identity to PostHogIdentify, whose effect reacts to user changes and resets on logout/account switches. Per-call server clients disable process exception autocapture; explicit captureException remains enabled. Wizard configuration is preserved.

## Scope

Existing PostHog Wizard setup and subsequent configuration, identity, and event-helper changes. User confirmed Wizard initialization is already complete. Preserve that setup. Benchmark: the event-tracking request, feature 03 in build-plan.md, and the PostHog rules in code-standards.md and library-docs.md.

## Findings

### P1 - Browser identity is not reset by sign-out

Location: `components/auth/PostHogIdentify.tsx:17`, `actions/auth.ts:140`.

The identity component is mounted in the root layout and checks the session only in an effect with an empty dependency list. The sign-out form invokes a Server Action that clears auth cookies and redirects to `/`, without resetting browser PostHog state. Next preserves the root client component during navigation, so the effect does not run again. Subsequent anonymous activity remains attributed to the signed-out user until a later remount/session check. Existing tests do not cover sign-out through the mounted identity component.

### P2 - Per-call exception autocapture leaks process listeners

Location: `lib/posthog-server.ts:54`.

Every server capture/identify call creates a PostHog instance with `enableExceptionAutocapture: true`. The installed SDK adds a process-level uncaught-exception listener at construction, but shutdown does not remove it. Repeated requests retain clients and accumulate handlers.

Confirmed with the installed posthog-node package in an isolated process: creating and shutting down 12 clients increased uncaughtException listeners from 0 to 12 and produced MaxListenersExceededWarning. Used a placeholder key and mocked network; no real event was sent.

## Review Layers

- Plan alignment: issues found. Logout reset is required by feature 03 but is absent from the actual sign-out transition. Approved product event helpers have no call sites yet because their product features remain unbuilt.
- System integrity: configuration supports the Wizard's existing project-token variable and preferred key variable. One browser initialization entry point; root layout stays a Server Component. No visual changes reviewed.
- Production readiness: issues found. The two lifecycle defects remain open. Passing config tests mock the SDK and do not cover process listener cleanup or browser logout transitions.

## Verification and Open Questions

- Latest implementation validation: all 16 auth/navigation/config tests, lint, and TypeScript passed. This review added the isolated real-SDK listener reproduction; application code was not changed.
- User logs show OAuth callback redirect and dashboard HTTP 200. Agent-driven provider consent, browser session transitions, and live analytics delivery remain unverified.
- Pageviews are disabled per local library guidance; SDK click autocapture remains enabled by default. Confirm whether the four-event rule applies only to custom product events or also to Wizard automatic events before changing collection settings.
- Follow-up validation: all 20 regression tests, lint, and production build passed. The real-SDK test confirms 12 create/shutdown cycles add no process exception listeners. Tests cover server identity becoming null after logout, mounted effect transitions, account switching, and explicit error reporting. Real browser/provider consent and live analytics delivery remain unverified.
