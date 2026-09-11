# Memory - Feature 04 and InsForge Setup

Last updated: 2026-09-11 19:30 +01:00 (Africa/Lagos)

## What was built

- Completed Feature 04 Database Schema after the user approved the architect decisions and implementation plan.
- Created and applied `migrations/20260911141928_create-jobpilot-foundation-schema.sql` to the linked InsForge backend. It creates `profiles`, `agent_runs`, `jobs`, and `agent_logs`, including constraints, indexes, owner RLS, runtime grants, and the profile update trigger.
- Created the private `resumes` bucket and applied storage policies for user-owned paths.
- Updated `context/architecture.md`, `context/progress-tracker.md`, and `context/ui-registry.md`. No UI was added in Feature 04.
- Authenticated the InsForge CLI, installed the CLI globally, linked the project, and installed InsForge skills. Linking also updated `AGENTS.md`.

## Decisions made

- The user explicitly requested InsForge CLI and skills for backend tasks. Use `npx -y @insforge/cli` per the installed skill. Skills are available under `C:/Users/ayomi/.agents/skills/`.
- Detailed schema and storage decisions are in the migration and context files. Future resume work must persist both the storage URL and object key; `resume_pdf_key` was added to the architecture.
- Preserve the existing PostHog Wizard setup and the completed review fixes documented in `context/posthog-review.md`.
- Credentials are intentionally omitted. Use existing local configuration; never print or commit secrets or `.insforge/project.json`.

## Problems solved

- InsForge CLI authentication and project linking succeeded. The linked project is named ECO; use existing project configuration rather than creating another backend or reapplying the foundation migration.
- Storage policy catalog queries through the CLI hung and were interrupted. Migration application/history and the storage RLS enabled flag succeeded, but direct policy inspection remains incomplete.
- InsForge agent-memory and feedback commands also hung and were stopped. No successful remote memory save was confirmed; this local file is the handoff.

## Current state

- Features 01-04 are complete. The schema is applied remotely, not merely drafted locally. Feature 05 Profile Page - Full UI is next; profile saving, resume processing, job discovery, research, and dashboard functionality remain pending.
- Feature 04 verification: migration history confirmed the applied version; MCP inspected all four app tables with RLS enabled; CLI confirmed the private bucket and enabled storage RLS. `npm run lint` passed.
- Cross-user access and authenticated storage operations have not been verified end to end. Storage policy catalog inspection remains a verification gap.
- Previous PostHog validation passed all 20 tests, lint, and production build. Both review findings were fixed. Live analytics delivery and real browser logout/account-switch verification remain outstanding.
- Authenticated dashboard, find-jobs, and profile routes currently contain placeholders. User logs previously showed successful OAuth callback and dashboard HTTP 200.
- Work remains uncommitted with extensive pre-existing changes. Preserve unrelated edits. Git may require command-scoped `-c safe.directory=C:/Users/ayomi/OneDrive/Desktop/job_pilot`.
- A dev server previously ran on port 3000; availability was not rechecked during Feature 04. Port 3001 was stopped at the user's request.

## Next session starts with

1. Restore this memory and follow the user's next request. The next planned feature is 05 Profile Page - Full UI, with mock data and no save logic; feature 06 handles persistence.
2. Before implementation, read the nine context files in AGENTS.md order and relevant installed Next.js docs. Follow the architect skill for complex features, and record new UI patterns with imprint.
3. For backend work, use installed InsForge skills and required MCP documentation. Do not repeat CLI installation, login, or the applied migration unless evidence shows configuration is missing.

## Open questions

- Direct storage policy inspection and functional owner-versus-other-user access checks remain outstanding.
- Live PostHog delivery and browser logout/account-switch transitions remain unverified. The earlier question about whether the four-event rule also restricts Wizard click/error autocapture remains unresolved; pageviews are disabled.
- Privacy-policy and terms content is pending.

## Workspace Notes

- Read UTF-8 markdown with explicit `-Encoding UTF8` in PowerShell.
- OneDrive previously caused EPERM/EBUSY in generated `.next` files. Do not reset source to fix cache issues.
- Network-restricted dev servers previously could not reach InsForge; check connectivity before changing working auth code.
