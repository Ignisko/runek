# Runek — MVP Launch Audit
**Goal: What to cut, what to fix, and what to ship to get real user testing TODAY.**

---

## Executive Summary

- **Elevator Pitch**: Runek is an AI job-hunt dashboard that scrapes jobs from JustJoinIT, scores them against your profile, and synthesizes a tailored CV + cover letter in one click.
- **Current State**: v0.3 — fully functional for the *builder* (Ignacy), but **not usable by anyone else**. The profile is hardcoded, data evaporates on server restart, and the most prominent button ("RUNek") does something a stranger cannot run.
- **MVP Definition**: A stranger lands on a deployed URL, enters their CV + API key, scrapes jobs, and gets a synthesized application package — without touching code.
- **Key Insight**: ~40% of the current surface area is either broken for external users, invisible, or premature. Cut ruthlessly to ship today.

---

## 🔴 Critical Blockers (Must Fix Before Any User Testing)

### 1. No Onboarding / Empty-State Experience
**Problem**: A new user lands on the app and sees 8 pre-seeded jobs for Ignacy Januszek with hardcoded match scores and a profile they cannot change meaningfully from the UI alone.

**What breaks**: The match engine reads `profile.json` — a flat JSON file with Ignacy's skills, hubs, and base CV baked in. The UI's "Profile Settings" modal only edits `name`, `title`, `location`, and `baseCV`. The **signals, antiSignals, preferredHubs, sectorWeights** that drive the scoring are completely invisible and not editable.

**Fix needed**: Clear the seeded jobs, show a guided onboarding modal to new users, and capture their CV + API key before showing the dashboard.

---

### 2. The "RUNek" Button is Broken / Dangerous for External Users
**Problem**: `lib/agent/engine.ts` uses Playwright to launch a **local Chrome browser** at a hardcoded Windows path (`C:\Program Files\Google\Chrome\...`), reads a CV PDF from `C:\Users\ignac\Downloads\`, and writes files to a local directory.

**Current state**: On Vercel (the deployment target), it will **silently fail or crash**. On someone else's machine, Chrome is at a different path. The CV path is hardcoded.

**Decision required**:
- **Option A (Ship today — recommended)**: Disable/hide the "RUNek" button. Label it "Coming Soon — Auto-Apply". The real MVP value is the scrape → score → synthesize pipeline.
- **Option B (Future v2)**: Proper Playwright integration with a server-side browser sandbox (Browserless.io, etc.)

---

### 3. Data Lost on Every Server Restart
**Problem**: `pipeline-store.ts` is an **in-memory singleton**. Every Next.js restart or Vercel cold-start wipes all scraped jobs, statuses, notes, and logs.

**Fix needed**: Write-through to `lib/data/pipeline.json` on every mutation. 30-minute fix, no database needed. The store is already designed to swap for Vercel KV later ("Swap internal Map for Redis/Vercel KV with zero API surface change").

---

### 4. Scraper Returns Unscored Jobs (Score = 0)
**Problem**: The `/api/agent/scrape` route stores jobs with `matchScore: 0`. The match engine is **never called after scraping**. Users see a wall of "C rank / 0 score" cards.

**Fix needed**: Call `matchEngine.score(job)` on each ingested job immediately in the scrape route, and persist score + signals + priority.

---

## 🟡 Redundant / Noisy Features (Cut or Hide for MVP)

| Feature | Status | Decision |
|---|---|---|
| **"RUNek" button** (auto-apply) | Broken externally | **Hide / disable** |
| **"⬇ Scrape JJI Product"** — keyword hardcoded to "product" | Partially useful | **Add a keyword input** |
| **Batch Auto-Synthesize All** | Works, but expensive | **Keep, secondary action** |
| **Export as Markdown** | Works | **Keep** |
| **`packages/claude-code-main/`** | Old CLI prototype, dead code | **Archive or delete** |
| **Legacy `lib/agent/engine.ts`** | Playwright auto-apply, broken on Vercel | **Disable API route** |
| **9-tab pipeline** (open → discarded) | Correct concept, overwhelming for first-timers | **Collapse to: Open · Applied · Archived** |
| **`visaRequirements` field** | Not populated by JJI scraper | **Hide from UI if empty** |
| **`profile.json` hardcoded to Ignacy** | Breaks multi-user / external use | **Replace with onboarding flow** |
| **Seeded jobs (Orbit Robotics, VoltGrid, etc.)** | Confusing for real users | **Clear on first-run or label as "Sample Jobs"** |

---

## 🟢 What's Working Well — Keep As-Is

| Feature | Why it works |
|---|---|
| **Synthesize (AI tailoring)** | Core value. BYOK pattern is correct. Mock fallback is good UX. |
| **Application Checklist** | Best part of the UX. Guided 5-step flow. |
| **Job card with rank badge (S/A/B/C)** | Clean, premium, immediately intuitive. |
| **Copy buttons** | Friction-free. Users will love this. |
| **Keyboard shortcuts** (T, A, D, O) | Power-user feature — worth keeping. |
| **Cold outreach generator** | High value differentiator. Keep. |
| **Notes per job** | Simple, correct. |
| **Status dropdown inline** | Right call — no modal for status change. |
| **Navy/blue Linear-style design** | Premium and clean. |

---

## MVP Feature Specification

### Feature 1: Onboarding Modal (P0)
- **User Story**: As a new user, when I first open the app, I want to enter my CV and API key so the tool works for me — not for the developer.
- **Acceptance Criteria**:
  - Given: profile has not been customized (sentinel: `name === "Ignacy Januszek"`), when app loads → show full-screen onboarding modal.
  - Fields: Name, Current Title, Location, Base CV (textarea), API Key (password input, saved to `localStorage`).
  - On save: profile persisted, seeds cleared, dashboard shown with "Scrape your first jobs" prompt.
- **Priority**: P0

---

### Feature 2: Score Jobs on Scrape (P0)
- **User Story**: As a user, when I click "Scrape Jobs", I want results to immediately show a match score.
- **Acceptance Criteria**:
  - Given: user scrapes jobs → `matchEngine.score()` called on each → score + signals + priority saved.
  - Scraped jobs appear with correct rank badges (not all "C / 0").
- **Priority**: P0
- **Effort**: ~3 lines in `/api/agent/scrape/route.ts`.

---

### Feature 3: File-Based Persistence (P0)
- **User Story**: As a user, when I refresh the page, my job pipeline is still there.
- **Acceptance Criteria**:
  - Mutations (status change, notes, new jobs) write through to `lib/data/pipeline.json`.
  - On app start, store hydrates from file.
- **Priority**: P0
- **Risk**: File writes unsafe on Vercel (ephemeral). Ship as local-only first OR use Vercel KV (~1hr setup).

---

### Feature 4: Hide RUNek Button (P0)
- **User Story**: As a new user, I want every visible button to do something that works.
- **Acceptance Criteria**:
  - "RUNek" button replaced with "Auto-Apply — Coming Soon" label or removed.
  - `/api/agent/runek` route returns `501 Not Implemented`.
- **Priority**: P0
- **Effort**: 2 UI lines + 1 API change.

---

### Feature 5: Scrape Keyword Input (P1)
- **User Story**: As a user, I want to search jobs by my own keywords, not just "product".
- **Acceptance Criteria**:
  - Small input next to the Scrape button.
  - Default: "product manager".
  - On scrape: uses the input value as the keyword.
- **Priority**: P1

---

## Deployment Checklist (To Ship Today)

- [ ] Fix: Run match engine on scrape
- [ ] Fix: File-write persistence OR accept in-memory and warn user
- [ ] Fix: Hide/disable RUNek button
- [ ] Fix: First-run onboarding modal
- [ ] Fix: Scrape keyword input
- [ ] Cut: Archive `packages/claude-code-main`
- [ ] Cut: Simplify pipeline tabs to Open / Applied / Archived
- [ ] Verify: `npm run build` passes with zero TypeScript errors
- [ ] Deploy: Push to Vercel
- [ ] Test: Full flow — empty state → scrape → synthesize → copy cover letter → mark applied

---

## Open Questions for User

> [!IMPORTANT]
> **Q1 — Who is the target user for this MVP test?**
> Just yourself (Ignacy) or genuinely external users? If just you, persistence and onboarding are less critical. If external: multi-user isolation is needed.

> [!IMPORTANT]
> **Q2 — Deployment: Vercel or local only?**
> File writes don't work on Vercel serverless. If you want a shareable URL today: disable RUNek + use Vercel KV. If local-only: file persistence is easy and sufficient.

> [!WARNING]
> **Q3 — Is the "faith-based" branding intentional for external users?**
> The AI prompt ("faithful career agent", "Christian morality", "faith-guided") and the nav subtitle ("Faith-Based Service Engine") are visible to all users. If this is a public MVP: is this intentional positioning, or should it be softened/made optional?

> [!NOTE]
> **Q4 — Multi-user or single-user MVP?**
> Currently profile and pipeline are a single global state. Two users opening the app simultaneously will share the same job list. Acceptable for personal MVP, a problem for public testing.
