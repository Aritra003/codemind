# ADR-007: Next.js 15 (App Router) for the web dashboard
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The web dashboard serves Engineering Managers (U3): hotspot heatmaps, risk trend charts,
team management, and billing settings. Usage pattern: accessed during planning meetings
and code reviews — bursty, not constant. Primary requirements:
- Fast initial page load (managers open this in a meeting — 3-second blank screen loses them)
- Server-side data fetching (dashboard data is server-computed, not user-generated)
- Authentication gating (all pages require a valid session)
- Minimal client JavaScript bundle (charts are static; no real-time updates needed in v1)

## Decision
**Next.js 15 with App Router**, deployed as serverless functions (Vercel or AWS Lambda@Edge).
React Server Components for data-fetching pages. Client Components only where interactive
(charts that need hover/tooltip state). shadcn/ui + Tailwind CSS v4 for design system.
Recharts for trend charts. D3.js for the code graph side-by-side view in the Drift UI.

## Alternatives Rejected
1. **Vite + React SPA** — rejected because: a pure SPA requires a separate SSR strategy
   for fast initial load, or accepts a loading spinner on every navigation. For U3 (manager
   opening a dashboard in a meeting), a blank screen while JavaScript hydrates is
   unacceptable. Next.js App Router renders the first paint on the server.
2. **Remix** — rejected because: Remix has strong server-rendering, but its nested route
   model is optimized for highly interactive apps with cascading data dependencies. Our
   dashboard pages are simple: one data fetch per page. Next.js App Router's simpler
   model fits our use case. Remix has a smaller community (more debugging friction).
3. **Vue.js / Nuxt** — rejected because: the team's TypeScript ecosystem is React-native
   (React components in packages/web, React hooks, shadcn/ui). Context-switching to Vue
   is a tax with no benefit. Same applies to SvelteKit.
4. **No web dashboard (CLI-only)** — rejected because: U3 (Engineering Manager) is an
   explicitly validated user type in SPEC.md. Managers don't use CLIs. The web dashboard
   is required for this user type. SPEC out-of-scope list deferred GitHub Action and VS
   Code extension — not the dashboard.

## Consequences
Positive:
- App Router + React Server Components: initial page load is server-rendered, no JS
  download needed for static content — sub-500ms First Contentful Paint on CDN
- Serverless deployment: scales to zero during off-hours (cost ~$0), handles traffic
  spikes without provisioning
- shadcn/ui: copy-paste components that own their code — no version lock-in to a UI
  library. Each component is in `packages/web/components/ui/` and is ours to modify.
- Tailwind CSS v4: utility-first with no CSS-in-JS runtime overhead

Negative (tradeoffs accepted):
- App Router is relatively new (GA Nov 2023); some patterns (e.g., server action caching)
  are still evolving. Engineers need to stay current.
- D3.js in React Server Components requires careful "use client" placement — D3 DOM
  manipulation is incompatible with SSR. All D3 code must be in Client Components.

Blast radius: `packages/web/` entirely. No impact on CLI or server packages.

## Review trigger
Next.js introduces a breaking App Router change that requires significant migration effort,
OR the dashboard requires real-time updates (WebSocket/SSE) at which point Next.js App
Router's server-first model becomes friction and a Remix migration makes sense.
