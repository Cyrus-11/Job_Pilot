# UI Registry

## Resume Extraction Repair (2026-09-15)

The existing extraction button, loading state, draft review behavior, and error presentation remain the Feature 07 UI contract. Worker loading and server diagnostics were repaired without changing visual patterns.

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Global Foundation

- **Files:** `app/globals.css`, `app/layout.tsx`
- **Theme:** Tailwind v4 `@theme` contains the font, color, and radius tokens from `ui-tokens.md`.
- **Body base classes:** `bg-background font-sans text-text-primary` in `@layer base`.
- **Default border color:** `border-border` applied to all elements and their `::before` / `::after` pseudo-elements in `@layer base`.
- **Font:** Inter loaded through `next/font/google`; `inter.variable` supplies `--font-inter` on `<html>` alongside `h-full antialiased`. Tailwind's `@theme inline` maps `--font-sans` to `var(--font-inter)` to avoid a collision with the generated font variable.
- **Body layout classes:** `min-h-full flex flex-col`.
- **Analytics client boundary:** `components/auth/PostHogIdentify.tsx` is the narrow client component mounted inside `app/layout.tsx`; it performs PostHog identify/reset only and renders no UI.
- **Session updates (2026-09-11):** RootLayout passes server-verified identity fields to PostHogIdentify. Identity changes trigger identify/reset, including logout without remounting. The component no longer fetches browser auth state. Root layout stays server-rendered; no visual styling changed.
- **Analytics configuration (2026-09-11):** Browser initialization and identity helpers share `lib/posthog-config.ts`, accepting either supported key name. Missing analytics settings do not throw during startup; the login form uses the guarded distinct-ID helper. No visual patterns changed.
- Use semantic utilities such as `bg-surface`, `text-text-secondary`, and `border-border` for new components.

## Components

### Database Schema foundation - 2026-09-11

- **Files:** `migrations/20260911141928_create-jobpilot-foundation-schema.sql`, `context/architecture.md`, `context/progress-tracker.md`.
- Feature 04 introduced backend schema and storage infrastructure only. No UI components, classes, tokens, layouts, or visual interaction patterns changed.

### Workspace route placeholders - 2026-09-11

- **Files:** `app/(workspace)/layout.tsx`, `components/layout/PendingPage.tsx`, and the dashboard and find-jobs pages in that route group.
- **Layout:** Existing background and Navbar; main content uses `mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8` with `id="main-content"` for the skip link.
- **Page title:** `text-2xl font-semibold leading-8 text-text-primary`.
- **Status section:** `space-y-3 border-t border-border py-8`; no card, shadow, or decorative radius.
- **Status heading:** `text-base font-semibold leading-6 text-text-primary`; supporting copy uses `max-w-xl text-sm leading-5 text-text-secondary`.
- **Return link:** `landing-nav-link inline-block text-sm`, preserving existing hover and keyboard focus styles.
- **Navbar:** Authenticated workspace pages use the `Authenticated Workspace Navbar` pattern below.
- **Footer:** Only published navigation destinations are linked. Privacy and terms links remain omitted until their content exists.
- These are temporary unavailable states, not the completed dashboard or search UI. Profile is no longer a placeholder.

### Homepage foundation — 2026-09-09

Reference: `context/designs/landing-page.png`. The requested reference governs homepage presentation: dark CTA buttons, flat bordered sections, gradient hero/closing CTA, and striped separators. These are homepage-specific patterns; application cards retain their existing rules.

Shared definitions: `app/globals.css`.

| Property | Classes / tokens |
| --- | --- |
| Page surface | `bg-surface` |
| Section borders | `border-border` |
| Main wrapper | `landing-container` (centered, maximum 1272px, responsive page gutters) |
| Primary button | `landing-button-primary`: `inline-flex items-center justify-center rounded-md border border-surface/20 bg-linear-to-b from-landing-button-top to-landing-button text-accent-foreground` |
| Primary hover | `transition-opacity hover:opacity-85` |
| Secondary button | `landing-button-secondary`: `inline-flex items-center justify-center rounded-md border border-border-muted bg-surface/30 text-landing-heading` |
| Secondary hover | `transition-colors hover:bg-surface/80` |
| Keyboard focus | `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent` |
| Navigation link | `landing-nav-link`: `rounded-sm transition-colors hover:text-accent` plus keyboard focus |
| Gradient | `landing-gradient`: radial gradients using `landing-glow-blue`, `landing-glow-pink`, and `surface`; subtle SVG noise overlay |
| Divider | `landing-divider`: `h-12 bg-surface lg:h-[78px]`; diagonal CSS stripes using `border` token |

### Navbar

File: `components/layout/Navbar.tsx` — updated 2026-09-09.
Last behavior update: 2026-09-11.

- Surface and border: `border-b border-border bg-surface`.
- Navigation: `gap-8 text-sm text-text-dark`; links use `landing-nav-link`.
- CTA: `landing-button-primary px-5 py-2.5 text-sm`.
- Logo: supplied `/logo.png`, `landing-focus w-fit rounded-sm` link.
- Normal-flow navigation moves to a second row on small screens. Includes a keyboard-visible skip link.
- Public navbar primary CTA reads Start for free when logged out and Dashboard when the homepage has a server-verified user session; visual styling does not change.

### Footer

File: `components/layout/Footer.tsx` — updated 2026-09-09.

- Border and spacing: `border-x border-border px-6 py-10 gap-6`.
- Navigation: `gap-6 text-sm text-text-dark`; `landing-nav-link` interactions.
- Same logo asset and focus treatment as Navbar.

### CtaLinks

File: `components/homepage/CtaLinks.tsx` — updated 2026-09-09.
Last behavior update: 2026-09-11.

- Shared CTA pair for Hero and ClosingCta, `gap-4`.
- Both buttons: `px-6 py-3 text-base`; primary includes `gap-1.5` and a decorative triangle.
- Logged-out primary CTA reads Get Started and links to `/login`; logged-in primary CTA reads Go to Dashboard and links to `/dashboard`. Find Your First Match links to `/find-jobs`.

### Hero

File: `components/homepage/Hero.tsx` — updated 2026-09-09.

- Surface: `landing-gradient`; spacing: `px-5 py-14 text-center`.
- Heading: `text-[38px] leading-[1.08] font-bold tracking-[-0.055em] text-landing-heading`, scaling to 64px on desktop.
- Body: `mt-6 text-base leading-[1.65] text-text-secondary`, scaling to 18px.
- Buttons: shared CtaLinks, `mt-6`.

### DashboardPreview

File: `components/homepage/DashboardPreview.tsx` — updated 2026-09-09.

- Panel: `border-t border-border bg-surface-tertiary/60 px-4 py-6`.
- Image: `h-auto w-full`; supplied image includes its own rounding and shadow.
- Asset is `/images/jobs-lists.png` despite its filename; eagerly loaded through Next Image.

### FeatureDetails

File: `components/homepage/FeatureDetails.tsx` — updated 2026-09-09.

- Surface: `bg-surface`; title rail: `border-l border-dashed border-border px-5 py-10`.
- Heading: `text-[32px] leading-[1.12] font-semibold tracking-[-0.045em] text-text-slate`, scaling to 46px.
- Rows: `border-t border-border`; inner padding: `border-l px-5 py-7`.
- Active rail: `border-accent` on the first search item, `border-success` on the second matching item; other rails use `border-border`.
- Item titles: `text-lg leading-7 font-semibold tracking-[-0.02em] text-text-dark`, scaling to 20px.
- Body: `mt-2 text-base leading-[1.65] tracking-[-0.02em] text-text-secondary`, scaling to 18px.

### Features

File: `components/homepage/Features.tsx` — updated 2026-09-09.

- Section borders: `border-b border-border` / `border-y border-border`.
- Illustration panels: `bg-background`, `px-6 py-12` for table; `px-10 py-12` for agent log.
- Images: `h-auto w-full`; preserve supplied image aspect ratios.
- Uses FeatureDetails for both groups; tablet/mobile stack text above images; desktop alternates image position.
- Asset mapping: `/images/user-icon.png` is the jobs table; `/images/dashboard-demo.png` is the agent log.

### Testimonial

File: `components/homepage/Testimonial.tsx` — updated 2026-09-09.

- Section: `border-b border-border px-6 py-14 text-center`.
- Eyebrow: `text-sm font-medium tracking-[0.08em] text-accent`.
- Quote: `text-xl leading-[1.4] font-normal tracking-[-0.025em] text-text-dark`, scaling to 32px.
- Attribution: `mt-6 gap-3 text-left`; name `text-base font-semibold text-text-slate`; role `mt-1 text-sm text-text-secondary`.
- Portrait: `rounded-md object-cover`; `/images/testimonial-portrait.png` extracted from the supplied reference.

### ClosingCta

File: `components/homepage/ClosingCta.tsx` — updated 2026-09-09.

- Section: `landing-gradient border-y border-border px-5 py-16 text-center`.
- Heading: `text-[34px] leading-[1.08] font-semibold tracking-[-0.05em] text-text-slate`, scaling to 54px.
- Body: `mt-7 text-base leading-relaxed text-text-dark`, scaling to 18px.
- Shared CtaLinks with `mt-7`; striped dividers above and below.

### Login Auth Surface

File: `app/(auth)/login/page.tsx` and `components/auth/LoginForm.tsx` - added 2026-09-09.
Last imprinted: 2026-09-10.

| Property | Classes / tokens |
| --- | --- |
| Page background | `bg-background` |
| Auth card | `rounded-xl border border-border bg-surface p-6 shadow-sm` |
| Logo link | `landing-focus mb-8 rounded-sm` |
| Heading | `text-2xl font-semibold leading-8 text-text-primary` |
| Supporting text | `text-sm font-medium leading-5 text-text-secondary` |
| Intro spacing | `mb-6` around the introduction; `mt-2` before supporting text |
| Form spacing | `space-y-3` on the form and provider fieldset; `gap-3` between each provider mark and label |
| Provider button | `min-h-12 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary` |
| Provider mark | `size-6 rounded-full border border-border text-xs font-semibold text-text-dark` |
| Button hover | `transition-colors hover:bg-surface-secondary` |
| Button focus | `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent` |
| Disabled state | `disabled:cursor-not-allowed disabled:opacity-60` |
| Error message | `rounded-md border border-error bg-surface px-3 py-2 text-sm font-medium text-error` |
| Config warning | `rounded-md border border-warning bg-surface px-3 py-2 text-sm font-medium text-text-secondary` |

Pattern notes: Auth entry surfaces should stay compact and work-focused. Provider buttons use neutral surfaces and token borders; provider identity is expressed through text marks rather than hardcoded brand colors.

Auth recovery (2026-09-09): The existing configuration warning and disabled provider buttons also cover malformed backend URLs or blank anon keys. The layout and visual tokens are unchanged.

Auth review fixes (2026-09-10): Callback failures initialize the existing form error state with a fixed, readable message. Callback and action errors share the existing error-message classes and `role="alert"`. Unknown URL error values are never displayed. No visual tokens changed.

Interaction notes: The form exposes `aria-busy` while submitting. Its fieldset disables both providers during submission or when configuration is invalid, using the recorded disabled button treatment. Callback errors initialize the same action state used for sign-in errors, so a subsequent failed attempt replaces the initial message in the existing alert.

### Authenticated Workspace Navbar

File: `components/layout/Navbar.tsx`, `components/layout/WorkspaceNav.tsx` - added 2026-09-11.
Last imprinted: 2026-09-11.

| Property | Classes / tokens |
| --- | --- |
| Header surface | `border-b border-border bg-surface` |
| Header shell | `mx-auto flex min-h-16 w-full max-w-[1440px] flex-col items-center justify-between gap-1 px-5 sm:flex-row sm:px-8` |
| Logo link | `landing-focus w-fit rounded-sm py-4 sm:py-0` |
| Nav group | `flex min-h-16 flex-wrap items-center justify-center gap-6 text-base font-semibold sm:justify-end sm:gap-10` |
| Nav item | `inline-flex min-h-16 items-center gap-2 border-b-2 px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent` |
| Active item | `border-accent text-accent` |
| Inactive item | `border-transparent text-text-dark hover:text-accent` |

Pattern notes: Authenticated app pages use icon+text navigation with active state expressed only through accent text and a bottom border. The public landing navbar remains separate and keeps its Start for free CTA.

### Profile Page Surface

Resume extraction update (2026-09-12): Uploaded resumes now expose Extract from Resume next to View resume and Download resume. The action uses Lucide Sparkles at rest and the existing spinning LoaderCircle while processing. It uses the same wrapping link/action row, accent text, `min-h-10` target, disabled opacity, and focus outline as the resume view/download controls. Successful extraction fills the current profile form as an unsaved draft and shows the existing success status text pattern.

Resume generation update (2026-09-15): Generate Resume from Profile is now enabled in `components/profile/ResumeCard.tsx`. The button keeps the existing primary action treatment: `inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold leading-6 text-accent-foreground shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60`. It uses Lucide FileText at rest and LoaderCircle with `animate-spin` while generating. Generation errors use the existing `mt-4 text-sm text-error` alert pattern; success uses the existing `mt-2 text-sm text-success` status pattern. If the profile form has unsaved changes, the card shows an inline error asking the user to save first instead of generating from stale persisted data.

Resume review update (2026-09-12): Uploaded resumes expose View resume (Lucide Eye, new tab) and Download resume (Lucide Download) in a wrapping `flex flex-wrap items-center gap-x-6 gap-y-2` row. Both use the existing accent text, `min-h-10` target, and focus outline. Viewing uses the same private endpoint with inline disposition; no public storage URL is exposed.

File: `components/profile/ProfilePageContent.tsx` - added 2026-09-11.

| Property | Classes / tokens |
| --- | --- |
| Page wrapper | `mx-auto w-full max-w-[936px] space-y-8` |
| Card surface | `rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8` |
| Alert card accent | `border-error/20`, tags use `bg-error/5 text-error` |
| Section heading | `text-2xl font-bold leading-8 text-text-primary` for card titles; `text-xl font-bold leading-7 text-text-primary` for form sections |
| Supporting text | `text-base font-medium leading-6 text-text-secondary`; alert body uses `text-text-dark` |
| Section divider | `border-t border-border pt-12` |
| Input | `min-h-12 w-full rounded-md border border-border bg-surface px-4 py-3 text-base font-medium leading-6 text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent` |
| Disabled input | `disabled:bg-surface-secondary disabled:text-text-muted` |
| Secondary button | `rounded-md border border-border bg-surface px-6 text-base font-bold leading-6 text-text-dark shadow-sm hover:bg-surface-secondary` |
| Primary button | `rounded-md bg-accent px-6 text-base font-bold leading-6 text-accent-foreground shadow-sm hover:opacity-90` |
| Tag | `inline-flex min-h-9 items-center rounded-md border border-border bg-surface-secondary px-3 text-base font-semibold leading-6 text-text-primary` |

Pattern notes (updated 2026-09-12, Feature 06): The profile is now backed by saved data. `ProfileField.tsx` uses native selects, month inputs, and textareas with the same token-based input treatment. `ProfileTags.tsx` uses Lucide plus/remove buttons with labels, titles, and visible focus. Work roles use a left border and spacing inside the form rather than nested cards. Empty work history and education remain valid.

Interaction patterns: `ProfileCompletion.tsx` displays persisted completion with an accessible progressbar; incomplete state uses error tokens and complete state uses success tokens. `ResumeCard.tsx` uses the existing dashed upload surface, accent border on drag-over, a spinner while uploading/generating, status/alert messages, and private view/download links after a resume exists. Form submission disables the fieldset, preserves edits after failure, and displays field-specific errors and a saved/unsaved status. Uploading and generation do not reset draft fields.

Lifecycle note (2026-09-15): Profile client components that await server work before updating state use a `mounted` ref set inside `useEffect` and check it after awaited work before calling state setters. Browser checks capture both `pageerror` and `console.error` so React lifecycle warnings fail validation.

| Functional state | Classes / tokens |
| --- | --- |
| Complete profile | `border-success/20 text-success` |
| Field error | `mt-2 text-sm text-error` with `aria-invalid` and `aria-describedby` |
| Save error | `rounded-md border border-error px-3 py-2 text-sm text-error` with `role="alert"` |
| Icon control | `size-10` or `size-12`, `rounded-md`, Lucide icon, accessible label and title |
| Work role divider | `border-l-2 border-border pl-4 sm:pl-6` |
| Pending controls | `disabled:opacity-60`, `aria-busy`, `animate-spin` on the loading icon |
