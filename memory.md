# Memory - Feature 07 Resume Extraction and Credit Blocker

Last updated: 2026-09-15 17:38 +01:00 (Africa/Lagos)

## What was built

- Features 01-07 are implemented. Feature 07 adds authenticated private resume extraction, GPT-4o JSON validation, and an unsaved profile draft for explicit review/save.
- Main extraction files: `lib/resume-extraction.ts`, `app/api/resume/extract/route.ts`, `lib/profile.ts`, `components/profile/ResumeCard.tsx`, and `components/profile/ProfilePageContent.tsx`.
- Repaired PDF worker loading through `serverExternalPackages` in `next.config.ts`. Added stage-specific diagnostics in `lib/extraction-diagnostic.ts`.
- Added real parser/model-validation/diagnostic tests in `tests/profile.test.mjs`, a valid PDF fixture in `tests/fixtures/resume-pdf.cjs`, and a production endpoint check in `tests/resume-runtime.mjs`. The existing backend fixture now supports extraction checks.
- Updated `context/progress-tracker.md`, `context/ui-registry.md`, and `context/library-docs.md`.

## Decisions made

- User requested saving the current state after confirming the current failure is exhausted API credit. No further application fixes were requested in the final turn.
- Resume extraction preserves the account email and returns a draft; only explicit user save persists profile fields.
- Continue using existing local credentials and the linked InsForge ECO project. Never persist or print credentials.
- Foundation and profile-completion migrations were already applied. Do not reapply them.
- Preserve the PostHog Wizard integration and prior auth/navigation fixes.

## Problems solved

- Next.js bundling broke PDF.js relative worker resolution. Externalizing `pdf-parse` and `pdfjs-dist` resolved it, verified through the actual production endpoint.
- Original logs printed only `Error`. Diagnostics now identify the failed stage and provider status/code without logging provider messages or model response content.
- Previous tests mocked all extraction logic. New tests exercise the actual PDF parser and model-response validation; the production endpoint test stubs only external services.

## Current state

- All 38 auth/profile/PostHog regression tests passed. Production build, TypeScript in the build, changed-file lint, and full lint excluding generated test output passed.
- The actual production extraction endpoint returned a validated profile from a real test PDF with external services stubbed.
- The user's latest live request passed authentication, private PDF download, parsing, and the minimum-text check, then failed at profile extraction with provider HTTP 429 and `credit_balance_exhausted`.
- Exhausted API credit is the confirmed current blocker. Successful live model extraction and form population are still unverified; do not claim a complete live success until retried with credit.
- Review found two remaining application improvements: billing failures return a generic 500/retry message, and default SDK retries can unnecessarily repeat billing-related 429 requests. These findings are recorded, not fixed.
- Feature 08 Resume PDF Generation from Profile is next. Generate Resume is still disabled; Dashboard and Find Jobs remain intentional placeholders.
- The user's dev server was running at `http://localhost:3000`; recheck availability next session.
- Work is uncommitted, including prior auth/homepage changes. Preserve unrelated edits. Git may require command-scoped `-c safe.directory=C:/Users/ayomi/OneDrive/Desktop/job_pilot`.

## Next session starts with

1. Restore this memory and follow the user's next request. Feature 07 needs a live retry once API credits are available; Feature 08 is the next planned implementation.
2. Read context files in AGENTS.md order and relevant installed Next.js docs before code changes. Load relevant skills and mandatory InsForge MCP docs for integration changes.
3. Run regressions with `node --test tests/auth.test.mjs tests/profile.test.mjs tests/posthog.test.mjs`.
4. For an isolated production runtime check, set `JOBPILOT_TEST_DIST_DIR=test-results/resume-next` for both `npm run build` and `node tests/resume-runtime.mjs`. The test starts its own server on a free port and stops it afterward.
5. The build needs network access for the existing Google font. OneDrive or differing process permissions can cause EPERM/EBUSY under `.next`; use isolated output rather than resetting source. Next.js may add test-output paths to tsconfig during isolated builds; remove only those generated changes afterward.
6. Full lint after isolated builds: `npm run lint -- --ignore-pattern 'test-results/**'`. Existing UI browser checks use `tests/profile-browser.mjs` with Playwright and Microsoft Edge.

## Open questions

- Will a live extraction return valid profile JSON once credits are available? This has not yet been tested.
- Billing-specific UI/status handling and avoiding retries for exhausted credit remain follow-up improvements.
- Functional cross-user storage access, full live save/reload/logout/account-switch flows, and live PostHog delivery remain incompletely verified. The latest live extraction log establishes only the stages described above.
- Privacy-policy and terms content remains pending.
