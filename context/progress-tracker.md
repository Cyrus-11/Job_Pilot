# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 - Foundation
**Last completed:** 04 Database Schema (2026-09-11)
**Next:** 05 Profile Page - Full UI

**Latest maintenance:** Resolved both PostHog review findings (2026-09-11): session-driven browser identity reset and listener-free per-call server clients. Existing Wizard configuration is preserved.

---

## Progress

### Phase 1 - Foundation

- [x] 01 Homepage - UI complete; session-aware redirects depend on 02 Auth
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 - Profile Page

- [ ] 05 Profile Page - Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 - Find Jobs Page

- [ ] 09 Find Jobs Page - Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 - Job Details Page

- [ ] 12 Job Details Page - Full UI
- [ ] 13 Company Research Agent

### Phase 5 - Dashboard

- [ ] 14 Dashboard Page - Full UI
- [ ] 15 Stats Bar - Real Data
- [ ] 16 Recent Activity - Real Data
- [ ] 17 Analytics Charts - PostHog Data

---

## Decisions Made During Build

- Homepage follows `context/designs/landing-page.png`, including its dark buttons, flat section borders, gradient CTA sections, illustration panels, and striped separators. Shared app card rules still apply to future authenticated pages.
- Homepage stays a Server Component and composes named UI components in `components/homepage` and `components/layout`; no additional runtime dependencies were installed.
- Reused public assets by actual contents: `jobs-lists.png` is the dashboard preview, `dashboard-demo.png` is the agent log, and `user-icon.png` is the jobs table. `agnet-log.png` is invalid image data and is unused. The portrait was extracted from the provided design into `public/images/testimonial-portrait.png`.
- Kept the design's exact marketing copy and demonstration artwork, including references to URL import, tailoring, cover letters, and application tracking. Those are illustrative only; this feature does not add the out-of-scope functionality mentioned in that copy.
- Start for free/Get Started target `/login`; Find Your First Match targets `/find-jobs`. Auth, dashboard, jobs, profile, and legal destination pages are not implemented yet. Privacy/terms links target `/privacy-policy` and `/terms-and-conditions`; real legal content remains pending.
- Corrected the Inter variable collision: Next font supplies `--font-inter`; Tailwind `@theme inline` maps `--font-sans` to it.
- Auth follows the latest InsForge MCP docs and installed `@insforge/sdk`. The Next SSR flow uses server-side OAuth initialization with a temporary httpOnly PKCE verifier cookie, `/callback` for code exchange, `/api/auth/refresh` for session refresh, and Next 16 `proxy.ts` for protected route redirects.
- Homepage CTAs now become session-aware through route behavior: `/login` redirects authenticated users to `/dashboard`, while protected app paths redirect unauthenticated users to `/login`.
- PostHog uses `instrumentation-client.ts` for browser initialization with `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, disables automatic pageview capture, and keeps the root layout as a Server Component with a narrow client identify component.
- Product analytics are constrained through typed helper functions in `lib/posthog-client.ts` and `lib/posthog-server.ts`. The only capturable product events remain `job_search_started`, `job_found`, `profile_completed`, and `company_researched`.
- Auth still identifies users with PostHog after OAuth succeeds and resets the browser user when the local session disappears. Non-product auth and landing CTA events were removed to keep the event stream aligned with `code-standards.md`.
- Feature 04 created the first InsForge migration at `migrations/20260911141928_create-jobpilot-foundation-schema.sql`, adding `profiles`, `agent_runs`, `jobs`, and `agent_logs` with owner-scoped RLS, constrained status/source/profile values, dashboard-oriented indexes, and a `profiles_updated_at` trigger. Runtime grants are authenticated-only and column-limited for updates; `agent_logs` is append-only for clients.
- Feature 04 also created a private `resumes` storage bucket. Storage RLS is enabled on `storage.objects`, with path-scoped policies for keys under `{user_id}/...`. Future resume uploads must persist both `resume_pdf_url` and `resume_pdf_key`.
- Feature 04 verification: InsForge CLI applied one migration, migration history shows version `20260911141928`, all four app tables inspect with RLS enabled through MCP, and the `resumes` bucket lists as private. Direct `storage.objects` RLS boolean query returned true; policy catalog queries against `pg_policy`/`pg_policies` hung through the CLI and were stopped, so storage policy verification relies on migration history plus the RLS enabled check.

---

## Notes

- PostHog lifecycle fixes (2026-09-11): RootLayout now reads the current server user and passes only identity fields to PostHogIdentify. Its effect depends on identity fields, so the cookie-driven Server Action rerender resets browser analytics after logout without a remount or cached browser-auth lookup. Account switches reset before identifying the new user. This makes the homepage dynamically rendered. Per-call server clients explicitly disable process exception autocapture while preserving manual captureException.
- Lifecycle verification: All 20 tests, lint, and production build passed, including a real-SDK regression proving no process exception listener growth after 12 client shutdowns. Restarted the existing JobPilot dev server on port 3000 to clear old listeners. Browser consent and live analytics delivery remain unverified. Both findings in context/posthog-review.md are resolved.

- PostHog review (2026-09-11): User confirmed initialization was already performed with the Wizard. Preserve the existing integration. `context/posthog-review.md` records two open findings: browser identity is not reset during the actual sign-out transition, and per-call exception autocapture retains server process listeners after shutdown. Historical notes claiming logout reset is complete are superseded by this review. No application fixes were applied during review.

- PostHog config repair (2026-09-11): `lib/posthog-config.ts` resolves the preferred key or the existing project-token variable consistently for browser initialization, client helpers, login identity, and server capture. Missing key/host now skips analytics with a browser development warning instead of throwing during initialization. `.env.example` documents the preferred key. Local credentials were preserved.
- PostHog repair verification: All 16 auth/navigation/config tests, lint, and TypeScript checks passed. Verified that the existing local environment resolves a complete analytics config without exposing credentials and that `/login` returns HTTP 200. SDK delivery is mocked in regression tests; no live analytics event or OAuth consent was performed.

- Routing repair (2026-09-11): Added `/dashboard`, `/find-jobs`, and `/profile` under `app/(workspace)` so navigation and successful OAuth no longer land on absent pages. A shared server layout verifies the current user; each page clearly states its feature is not available yet. The authenticated navbar exposes the existing sign-out action. Full feature milestones above remain incomplete.
- Removed footer links to unpublished privacy and terms pages until real content is supplied. Historical notes below describing absent destinations predate this repair.
- Routing verification: All nine auth/navigation tests, lint, TypeScript, and production build passed. Live HTTP requests on `http://localhost:3000` returned 200 for homepage/login and followed all three protected destinations to login for anonymous visitors. Authenticated rendering was checked with mocked verified users; full Google/GitHub consent was not performed.

- Homepage includes Navbar, Hero, DashboardPreview, Features/FeatureDetails, Testimonial, ClosingCta/CtaLinks, and Footer. Patterns captured in `ui-registry.md` with homepage color additions in `ui-tokens.md`.
- Browser review at 1440, 768, 390, and 320px verified that all six rendered images load, Inter is applied, no horizontal overflow occurs, and no runtime exceptions occur. Tablet/mobile features stack with copy before imagery. All links have keyboard focus indicators; the header includes a skip link.
- Homepage review: reference sections and architecture match the implementation plan. Session-aware routing and destination pages remain explicit dependencies rather than implemented features.
- Final validation: `npm run lint` and a clean `npm run build` passed. Build cleanup required removing the generated `.next` cache because OneDrive marked generated directories as read-only reparse points; the clean build needed network access to fetch Inter. No source reset was performed.
- Configured `app/globals.css` with all tokens from `ui-tokens.md` using Tailwind v4 `@theme` and base styles for the page background, primary text, font, and borders.
- Root layout loads Inter through `next/font/google` using `--font-sans`. Existing `@tailwindcss/postcss` configuration required no changes.
- Validation: `npm run lint` and `npm run build` passed. The production build required network access to download Inter from Google Fonts.
- Auth includes `lib/insforge-client.ts`, `lib/insforge-server.ts`, `lib/insforge-config.ts`, `actions/auth.ts`, `app/(auth)/login/page.tsx`, `components/auth/LoginForm.tsx`, `app/(auth)/callback/route.ts`, `app/api/auth/refresh/route.ts`, `lib/auth.ts`, and `proxy.ts`.
- Auth validation: `npm run lint` and `npm run build` passed. The build shows `/login`, `/callback`, and `/api/auth/refresh` as dynamic routes plus Proxy enabled.
- Auth recovery (2026-09-09): Corrected `.env.local` where `NEXT_PUBLIC_INSFORGE_URL` contained an API key instead of the backend URL. Verified the existing anon key against InsForge MCP; opaque anon keys are valid and must not be assumed to be JWTs. Added HTTP(S) URL validation and blank-key checks in `lib/insforge-config.ts`.
- Recovery verification: Seven configuration cases, lint, and TypeScript checks passed. Live Google and GitHub SDK initialization succeeded. Both login Server Actions returned provider redirect headers and httpOnly, SameSite=Lax PKCE verifier cookies. Unauthenticated `/dashboard` redirects to `/login`. Restarted the dev server at `http://localhost:3001` with network access because the earlier sandboxed server could not reach InsForge.
- Full provider consent, callback exchange, and authenticated session persistence still require an interactive account login. `/dashboard` is not implemented yet, so a successful login currently redirects to an unbuilt page.
- Auth review fixes (2026-09-10): Proxy now runs on `/login`, forwards refreshed request cookies before rendering, and copies SDK cookie changes to its final response, including login redirects after failed refresh. The login page awaits `searchParams`, maps only `oauth_callback` to a readable message, and initializes the existing form error state with an accessible alert.
- Regression coverage: `node --test tests/auth.test.mjs` passes six tests covering matcher scope, refresh-only login through verified dashboard redirect, rotated cookies, revoked-cookie cleanup without repeated refresh, anonymous login, callback alerts, and rejection of arbitrary URL error text. Backend responses are mocked; no live account session is required. Lint and TypeScript checks pass. A live HTTP check at `http://localhost:3001` confirms the callback alert renders only on the error URL.
- Production validation after the review fixes: `npm run build` passed, with `/login`, `/callback`, and `/api/auth/refresh` dynamic and Proxy enabled.
- PostHog initialization validation (2026-09-11): `npm run lint`, `node --test tests/auth.test.mjs`, `npx tsc --noEmit`, and `npm run build` all passed. Future agent/profile features should use the typed PostHog helpers instead of calling `posthog.capture` directly.
