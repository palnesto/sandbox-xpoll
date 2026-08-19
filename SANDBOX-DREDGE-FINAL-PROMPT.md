# Sandbox prompt for dredge-qwen-model

Paste everything below the line into a new chat with `sandbox-dredge` as the working directory.

---

I want to build a **sandbox / demo prototype of my dredge platform** — the same approach 
that worked for xpoll-user.

## Setup

- `sandbox-dredge` (my working directory) is a fresh clone of my dredge-qwen-model repo.
- I've also added the original `dredge-qwen-model` folder as a reference directory — read from it 
  freely, but **only write to `sandbox-dredge`**.

## Goal

Every page and component must render and be clickable with **static dummy data** instead of 
real API calls. The Python backend stays untouched. No logic changes anywhere.

- Fixed login credentials that skip real auth entirely, redirecting straight to the dashboard.
- No signup flow, no multi-step onboarding — skip straight past all of it.
- All forms submit "successfully" and show their success state, but persist nothing.
- No visible text saying "demo", "sandbox", "prototype", or "dummy data". 
  It should look like the real product.
- Choose good realistic imagery and copy. Reuse images from repo assets, not remote URLs.

## Hard constraint

**Do not change UI, UX, layout, styling, component logic, or file upload/processing behavior 
anywhere.** Only intercept HTTP requests from the frontend and return dummy data. I will 
re-integrate the real backend later.

## Architecture

- **Frontend**: Vite + React (in `frontend/` folder)
- **Backend**: Python gateway + microservices (stays untouched)
- **Mocking layer**: Intercept HTTP calls at the frontend level only

## Implementation approach (same as xpoll-user)

1. Create an isolated `frontend/src/sandbox/` folder with everything sandbox-specific:
   - `config.ts` — fixed demo login credentials
   - `fixtures.ts` — all static data
   - `mock-api.ts` — HTTP request router keyed by URL pattern
   - `session.ts` — sessionStorage-based auth instead of real JWT
   - `state.ts` — small in-memory overlay so UI actions (create/delete/approve/reject) 
     visibly change the UI; resets on page reload
   - `stubs/` — fake modules for external SDKs if needed (payments, web3, etc.)

2. Swap the axios instance with a custom adapter (in Vite config via alias or in the 
   HTTP client hook) so **no component needs editing**. Every HTTP call is intercepted 
   at the network layer.

3. Match the real API response envelope exactly — whatever shape the frontend expects 
   from `response.data`, return that exact shape from the mock.

4. Keep a short comment above each sandbox file explaining what production does and 
   why it was replaced, so re-integration is easy.

5. **Do NOT touch**:
   - File upload endpoints (they pass through to real backend)
   - File processing logic (PDF, CSV, image pipelines)
   - Any Python code
   - Any component logic
   - Any styling or UX
   - The backend gateway or microservices

## Method that saved time last round

Each blank screen or zero-value is almost always a **data shape mismatch**, not a missing 
route. So before writing fixtures for a screen:

1. Read the actual component/page and trace the exact field names and nesting it reads.
2. Identify what makes it render an empty state vs real content.
3. Watch for gating flags (upgrade prompts, permission checks, payment blocks).
4. Note whether numbers are in minor/atomic units vs display units.

**Traps to avoid**:
- Paginated list endpoints don't all share one envelope — check each: `{entries, total}` vs 
  `{entries, meta:{total,page,pageSize,totalPages}}`.
- Some components dereference nested objects with no optional chaining, so missing fields 
  crash the page, not render blank.
- Don't accidentally register two mock routes matching the same URL — the first wins.
- Don't double-wrap responses. If the adapter already wraps the payload, returning 
  `{data: payload}` from a handler hides every field.

## Process

1. **First, inventory**: Explore the frontend codebase. List all pages/routes that exist. 
   Identify which API endpoints they call. Which are feasible to mock with static data? 
   Which genuinely need backend logic? (e.g., file processing obviously needs backend; 
   a dashboard list can be static dummy data.)

2. **Second, login + dashboard**: Get fixed-credential login working, redirecting straight 
   to the main dashboard/home page. Verify in the browser.

3. **Third, section by section**: Wire up each major page/feature with fixtures and mock 
   routes. Verify each in the browser before moving on.

For each phase: start the dev server yourself (`npm run dev` in `frontend/`), click through, 
check console for errors, take screenshots. Report honestly what works vs what you didn't 
reach. Never ask me to manually test — you verify.

## Start now

Begin with step 1: explore the frontend codebase and give me an inventory of pages, routes, 
and API endpoints. Don't write any code yet. Just read and report.
