# Progress Tracker

## Feature 07 Repair (2026-09-15)

- Externalized `pdf-parse` and `pdfjs-dist` in Next.js so PDF worker resolution uses the installed packages.
- Extraction errors now include the failed stage, PDF worker message, provider status/code/request ID, and validation issue paths without logging model response content or provider messages.
- Added actual PDF parsing, model JSON validation, and diagnostic regression tests. All 38 auth/profile/PostHog tests passed.
- Verified the actual production `/api/resume/extract` endpoint with a valid text PDF and stubbed external services using `node tests/resume-runtime.mjs`. Production build and changed-file lint passed. Live OpenAI/account verification remains outstanding.
- `JOBPILOT_TEST_DIST_DIR=test-results/resume-next` supports an isolated build/start for runtime checks while the user's dev server is running. Set it for both build and test commands.

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 - Profile Page
**Last completed:** 08 Resume PDF Generation from Profile (2026-09-15)
**Next:** 09 Find Jobs Page - Full UI

**Feature 08 complete (2026-09-15):** Added authenticated resume generation through `POST /api/resume/generate`. The route reads the current user's saved profile, requires the saved profile to be complete, asks GPT-4o for polished resume content, renders a PDF with `@react-pdf/renderer`, uploads it to the private `resumes` bucket at `{user.id}/resume.pdf`, and updates only `resume_pdf_url` / `resume_pdf_key` on the profile. The Profile resume card now enables Generate Resume from Profile, shows generation loading/error/success states, and asks users to save unsaved profile changes before generating so the PDF reflects persisted data.

Feature 08 verification: 41 auth/profile/PostHog regression tests passed, including generation auth, incomplete-profile rejection, storage metadata updates, and generation-failure preservation of the existing resume. TypeScript and lint passed. The isolated production build passed with `JOBPILOT_TEST_DIST_DIR=test-results/resume-next`, and `node tests/resume-runtime.mjs` verified actual Next.js production routes for extraction and generation with external services stubbed.

**Feature 08 review fix (2026-09-15):** Resolved the React console warning about state updates before/after mount in profile client flows. `ResumeCard.tsx` and `ProfilePageContent.tsx` now guard async post-await state updates with a mounted ref set in `useEffect`. `tests/profile-browser.mjs` now captures browser `console.error` messages in addition to `pageerror`, so React lifecycle warnings fail browser validation. Verification passed: focused profile tests, TypeScript, lint with `test-results/**` ignored, isolated production build, and the profile browser flow with console-error capture.

**Feature 07 live status (2026-09-15):** Implementation and PDF worker repair are complete. The user's latest live request passed authentication, private resume download, PDF parsing, and the minimum-text check, then received provider HTTP 429 with `credit_balance_exhausted` during profile extraction. Exhausted API credit is the confirmed current blocker. Successful live model extraction and form population remain unverified until credits are available; do not mark that end-to-end check as passed.

**Outstanding review findings (2026-09-15):** Billing failures still return a generic HTTP 500 and a retry message; the SDK's default retry policy can retry the provider's 429 response unnecessarily. These follow-up improvements were reviewed but not implemented. The user requested recording the current state, not further application changes.

**Feature 07 complete (2026-09-12):** Added authenticated resume extraction through `POST /api/resume/extract`. The route reads the current user's private stored PDF from InsForge Storage, extracts text with `pdf-parse`, sends the text to GPT-4o with JSON mode, validates the result against the shared profile schema, and returns a profile draft without saving it. The profile UI now shows Extract from Resume after a resume exists and merges the extracted data into the unsaved form draft for review.

Feature 07 verification: initial implementation passed 35 auth/profile/PostHog regression tests, lint, TypeScript, production build, and isolated Playwright profile browser checks. The worker repair increased coverage to 38 passing tests and verified the actual production extraction endpoint with a real PDF and stubbed external services. Build and lint passed. The user's later live request confirms progress through private download and parsing; successful live model output remains blocked by API credit as noted above.

**Resume review fix (2026-09-12):** Added View resume next to Download after upload and on return visits. View opens the private PDF in a new tab through the existing authenticated endpoint with inline disposition; Download retains attachment disposition. Both modes enforce owner-key checks and no-store caching.

Resume-view verification: all 11 focused profile tests, lint, TypeScript, production build, and the isolated Playwright flow passed. Browser checks cover the View link after reload, inline PDF response, and responsive layouts at four widths. Live-account PDF viewing was not exercised. The build required network access for the existing Google font.

**Latest verification (2026-09-12):** All 32 auth/profile/PostHog tests, lint, TypeScript, and production build passed. Desktop/mobile browser checks passed against an isolated backend. The real-backend dev server was started at `http://localhost:3000`; `/login` returned 200 and anonymous `/profile` returned 307 to `/login?next=%2Fprofile`. Live-account save/upload verification remains outstanding.

**Latest maintenance:** Resolved both PostHog review findings (2026-09-11): session-driven browser identity reset and listener-free per-call server clients. Existing Wizard configuration is preserved.
**Latest auth repair:** Preserved protected-route destinations through OAuth and made homepage CTAs reflect logged-in state (2026-09-11).

---

## Progress

### Phase 1 - Foundation

- [x] 01 Homepage - UI complete; session-aware redirects depend on 02 Auth
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 - Profile Page

- [x] 05 Profile Page - Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [x] 08 Resume PDF Generation from Profile

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

The entries below retain feature history. Later feature and repair notes supersede older statements about placeholders, static CTAs, and verification gaps; Current Status above is authoritative.

- Feature 06: Profile reads use the verified server session and owner-scoped `profiles.id` queries. Server Actions in `actions/profile.ts` save validated drafts and independently upload the resume, preserving unsaved form edits. No mock identity remains. Account email is read-only and supplied by auth on the server.
- Feature 07: Resume extraction is an API route, not a Server Action, because it performs server-only PDF parsing and OpenAI work. It only reads the authenticated user's existing private resume key, never accepts a client-supplied storage key, and returns validated `ProfileData` for the client to merge as an unsaved draft. The authenticated account email is preserved rather than extracted from the resume.
- Feature 08: Resume generation is also an API route because it performs server-only OpenAI and PDF rendering work. It uses the saved profile only, not the unsaved client draft, and replaces the single active resume at `{user.id}/resume.pdf`. GPT-4o only polishes resume content; the PDF layout is deterministic and validated in the server helper. Generation updates only resume metadata and does not mutate profile fields.
- Profile completion uses ten equally weighted requirements: full name, email, location, current/recent title, experience level, years of experience (zero allowed), skills, desired job titles, remote preference, and work authorization. Phone, links, industries, work history, education, salary, preferred locations, and a resume remain optional. Progress reflects saved data.
- Migration `20260911194325_add-profile-completion.sql` was applied to the existing backend. It adds `completion_percentage`, `missing_fields`, and `first_completed_at` with scoped column grants; it changes no RLS policies. The table had no existing profile rows. The migration is additive, so a paid backend branch was unnecessary under the CLI branch decision guide.
- Resume uploads accept one PDF up to 5 MiB, check extension/MIME/signature on the server, and replace `{user.id}/resume.pdf` in the private `resumes` bucket. The current SDK uses `.upload(key, FileOrBlob)` with implicit replacement. Both returned URL and key are persisted. Downloads use the authenticated `/api/resume/download` route with owner-key validation and `private, no-store` caching. Server Action body limit is 6 MiB to allow multipart overhead.
- A conditional database update claims `first_completed_at` once before the existing best-effort PostHog `profile_completed` helper runs. Repeated saves and incomplete/complete transitions do not repeat the event. Analytics delivery is not transactional or guaranteed if the provider is unavailable.
- Feature 06 replaces static controls with native selects/month inputs, editable/removable tags, and up to three work roles. Generate Resume stays disabled until Feature 08; AI extraction remains Feature 07. The existing `cover_letter_tone` value is preserved in the data contract; no new cover-letter UI was added to the supplied design.

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
- Feature 05 replaced the `/profile` placeholder with the full mock UI from `context/designs/profile.png`: attention banner with 70% progress ring and missing-field tags, resume upload/generation card, and the profile information form with personal, professional, work experience, education, and job preference sections. This feature intentionally adds no save, upload, extraction, or PDF generation logic.
- Feature 05 also adds an authenticated workspace navbar variant matching the profile design, with icon+text navigation and active route underline. The public homepage navbar keeps its existing CTA treatment.
- Auth navigation repair (2026-09-11): Shared safe redirect parsing now preserves protected destinations such as `/profile` through proxy redirect, login form state, OAuth initialization, and callback completion. Homepage rendering checks the current server session so logged-in users see Dashboard-oriented CTAs instead of login prompts.

---

## Notes

- Feature 06 verification: auth/profile regression tests passed, TypeScript and lint passed, and the production build passed. Playwright against an isolated backend exercised initial draft saves, 100% completion, reload persistence, three-role limits, current-role dates, failed-save retention, invalid PDFs, a 2 MiB upload, private download, and preservation of unsaved edits during upload. Screenshots at 1440/768/390/320px showed no overflow or runtime exceptions. The fixture is only injected into the test process and blocks external backend/analytics writes.
- Backend verification: the additive migration succeeded, and direct `pg_catalog.pg_policy` inspection confirmed all four resume storage policies exist. Live owner-versus-other-user storage operations and a complete OAuth/save/upload flow using the user's account have not been performed. The earlier storage policy catalog uncertainty is partially resolved by this inspection.
- Resume storage and DB writes are separate operations. If upload succeeds but metadata saving fails, the UI reports the partial result and requests a retry. Uploading again completes the stable-key link; it cannot roll back an already replaced PDF.
- Run focused tests with `node --test tests/auth.test.mjs tests/profile.test.mjs`. Browser verification uses `npm run build` followed by `npx -y --package @playwright/test -c "node tests/profile-browser.mjs"` (Microsoft Edge installed). Screenshots are in ignored `test-results/profile/`.

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
- Profile UI validation (2026-09-11): `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. The first build attempt hit a transient OneDrive `.next` diagnostics EBUSY lock after compilation/type-checking; rerunning succeeded without cache cleanup.
- Auth navigation repair validation (2026-09-11): `node --test tests/auth.test.mjs`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. Regression coverage now checks `/profile` intent preservation through `/login?next=...` and OAuth callback redirect.
