<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/ui-tokens.md
4. context/ui-rules.md
5. context/ui-registry.md
6. context/code-standards.md
7. context/library-docs.md
8. context/build-plan.md
9. context/progress-tracker.md

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes
- Update `progress-tracker.md` and `ui-registry.md` after every feature
- Before any third party library — load its installed skill first,
  then read `context/library-docs.md` for project-specific rules
- If the same problem persists after one corrective prompt —
  stop immediately and run /recover

## InsForge SDK Documentation - Overview

JobPilot uses InsForge as its backend-as-a-service platform for:

- Database: PostgreSQL with PostgREST API
- Authentication: email/password plus Google and GitHub OAuth
- Storage: file upload and download
- AI: OpenRouter key provisioning and model catalog for OpenAI-compatible integrations
- Functions: serverless function deployment
- Realtime: WebSocket pub/sub for database and client events

### Mandatory InsForge MCP Rule

Before writing or editing any InsForge integration code, call the InsForge MCP `fetch-docs` or `fetch-sdk-docs` tool for the relevant area. Use `fetch-docs` with `docType: "instructions"` first for essential backend setup.

Use SDKs for application logic:

- Authentication flows, profiles, login, logout
- Database CRUD
- Storage uploads and downloads
- AI integration through OpenRouter or OpenAI-compatible APIs
- Serverless function invocation
- Payments checkout and customer portal sessions, if added later

Use MCP tools for infrastructure:

- Project scaffolding with `download_template`
- Backend setup and metadata
- Database schema management
- Storage bucket management
- Serverless function deployment
- Frontend deployment

### TypeScript SDK Setup

For new InsForge projects, use the MCP `download_template` tool first so the backend URL and anon key are preconfigured. Then install the SDK:

```bash
npm install @insforge/sdk@latest
```

Create the SDK client with `createClient()`:

```typescript
import { createClient } from "@insforge/sdk";

const client = createClient({
  baseUrl: "https://vxsy82bi.us-east.insforge.app",
  anonKey: "your-anon-key-here",
});
```

InsForge SDK calls return `{ data, error }`. Database inserts require array format, for example `insert([{ ... }])`.

Current API base URL from the InsForge MCP docs: `https://vxsy82bi.us-east.insforge.app`.

### Important InsForge Notes

- For auth, use auth SDK docs for custom UI or framework-specific auth component docs for prebuilt UI.
- Serverless functions have one endpoint and do not support nested route paths.
- Storage uploads go to buckets; store returned URLs in the database.
- AI integrations should call OpenRouter directly with `baseURL: "https://openrouter.ai/api/v1"` and a server-side `OPENROUTER_API_KEY`.
- Keep Tailwind CSS locked to 3.4 for InsForge starter guidance unless project-specific context explicitly overrides it.

## Available Skills

- `/architect` — before any complex feature. Think before building.
- `/imprint` — after any new UI component. Capture patterns.
- `/review` — before demo or when something feels off.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **ECO** (API base `https://vxsy82bi.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
