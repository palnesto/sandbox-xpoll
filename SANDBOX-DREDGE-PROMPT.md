# Handoff prompt for the dredge-platform sandbox

Paste everything below the line into the new chat as your first message.

---

I want to build a **sandbox / demo prototype of my dredge platform** — applying the same 
approach that worked for xpoll-user and xpoll-admin.

## Setup

- `sandbox-dredge` (my working directory) is a fresh clone of my dredge-platform repo.
- The repo has both **Python backend + frontend in one directory**.
- I've also added the original `dredge-platform` folder as a reference directory — read from it 
  freely, but **only write to `sandbox-dredge`**.

## Goal

Every page and component must render and be clickable with **static dummy data**.
No real backend calls, no database, no external APIs.

- Fixed login credentials that skip real auth entirely, redirecting straight to the 
  dashboard / landing page. (Tell me what you pick, or ask me.)
- No signup flow, no multi-step onboarding, no email verification — skip straight past all of it.
- All forms submit "successfully" and show their success state, but persist nothing.
- No visible text anywhere saying "demo", "sandbox", "prototype", or "dummy data".
  It should look like the real product.
- Choose good realistic imagery and copy. Reuse images already in the repo's assets 
  rather than hotlinking remote URLs.

## Hard constraint — this is the most important instruction

**Do not change UI, UX, layout, styling, or component logic.** Only remove the API/network
layer and substitute dummy data. I will re-integrate the real APIs later.

The approach that worked for xpoll-user, please follow the same pattern:

1. Create an isolated `sandbox/` folder containing everything sandbox-specific:
   - `config.py` or `.py` file — fixed demo credentials
   - `fixtures.py` — all static data as Python dicts/objects
   - `mock_routes.py` or similar — request router keyed by URL pattern
   - `session_store.py` — local session (sessionStorage/in-memory) instead of real JWT
   - `state.py` — small in-memory overlay so state-changing actions (create/delete/approve/reject) 
     visibly change the UI; resets on server restart
   - `stubs/` — fake modules for any external SDKs (payments, web3, etc.)

2. Choose your mocking strategy (see clarification questions below):
   - **Frontend-only (recommended if no backend logic to test)**: Intercept fetch/axios calls 
     from the frontend via a custom adapter (same as xpoll-user), so zero backend changes needed.
   - **Backend-level (if backend needs testing)**: Add sandbox-specific routes to the Python 
     backend that serve fixtures; the frontend hits real routes but they return dummy data.

3. Match the real API response envelope exactly, so the frontend consumes responses with 
   no awareness of the mock layer.

4. Keep a short comment above each non-obvious shim explaining what production did and why 
   it was replaced, so future re-integration is easy.

## Clarification questions (for you to answer, so I know which approach to take)

1. **Backend tech**: Flask? FastAPI? Django? Something else?
2. **Architecture**: Single app (backend serves frontend + REST API) or separate frontend/backend folders?
3. **Mocking preference**: 
   - Frontend-only (intercept HTTP client) — no backend code changes
   - Backend-level (stub Python routes) — backend serves fixtures

For now I'll assume **frontend-only** since that matches xpoll-user and requires the least 
backend work. Tell me if you want the backend approach instead.

## Method that saved a lot of time last round

Each blank screen or zero-value is almost always a **data shape mismatch**, not a missing 
route. So before writing fixtures for a screen, read the actual component/page and trace 
the exact field names and nesting it reads, plus:

- what makes it render an empty state vs real content,
- any client-side filtering it applies,
- any gating flags that swap the page for an upgrade / permission / payment prompt,
- whether numbers are expected in minor/atomic units vs display units.

Watch for these specific traps that bit us repeatedly:

- Paginated list endpoints don't all share one envelope — some read `{entries, total}`, 
  others `{entries, meta:{total,page,pageSize,totalPages}}`. Check per endpoint.
- Some components dereference nested objects with **no optional chaining**, so a missing 
  nested field is a hard crash, not a blank.
- Don't accidentally register two mock routes matching the same URL — the first wins and 
  silently shadows the second.
- Don't double-wrap a response. If the adapter already wraps the payload, returning 
  `{data: payload}` from a handler hides every field.

## Process

Since this is a hybrid Python + frontend setup, work in phases and check in with me between them:

1. First, **clarify** the three questions above so I know the mocking strategy.
2. Then, explore and give me an inventory: the routes/pages that exist, which are feasible 
   frontend-only vs which need backend work.
3. Then get login + the landing/dashboard page working, and show me.
4. Then proceed section by section.

For each phase: verify in the browser/CLI yourself — start the dev server/backend, click through, 
check the console for errors, and screenshot the result. Never ask me to manually check whether 
it works. Report honestly what you verified vs didn't get to.

Start with step 1 — answer the three clarification questions. Don't write any code yet.
