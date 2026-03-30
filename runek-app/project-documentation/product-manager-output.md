# Runek v0.3 — Product Specification
## "From Display to Action Engine"

---

## Problem Statement

Runek v0.2 looks like a war room but **acts like a screensaver**. After AI synthesis completes, the user has a CV and cover letter on screen but no clear path to actually applying. There's no copy button, no step-by-step guide, no outreach draft, no tracking. The gap between "synthesized" and "deployed" is entirely manual friction.

**Core Problem**: Ignacy (and any user) can see their tailored materials but has nowhere to go with them.

---

## Target User

**Primary**: Ignacy Januszek — technical PM, high agency, wants zero-friction between "this role is good" and "application sent." Prefers keyboard shortcuts and direct action over menus.

**Secondary**: Any PM/technical candidate who deploys Runek with their own API key.

---

## Feature Backlog — Prioritised

---

### P0 — Ship This Week (Makes it Actually Work)

#### F1: Guided Application Flow
**User Story**: As Ignacy, after AI synthesis, I want a step-by-step checklist so I know exactly what to do next without thinking.

**Acceptance Criteria**:
- After synthesis completes, a 4-step mission checklist appears
- Step 1: "Review CV" — expandable CV preview with copy button
- Step 2: "Copy Cover Letter" — single-click copies to clipboard, shows ✓ confirmation
- Step 3: "Open Job Posting" — opens `job.url` in new tab
- Step 4: "Mark as Applied" — updates status to 'applied', logs timestamp

**UX**: Steps are sequential but not gated. User can skip. Completed steps show green checkmark with monospace timestamp.

---

#### F2: Copy-to-Clipboard on All Outputs
**User Story**: As Ignacy, I want one-click copy on my CV markdown and cover letter so I can paste directly into application forms.

**Acceptance Criteria**:
- CV block has [COPY CV] button — copies full markdown
- Cover letter block has [COPY CL] button — copies plain text
- Button shows "COPIED ✓" for 2 seconds, then resets
- Works on both synthesized output panel and export markdown

---

#### F3: Direct Apply Button
**User Story**: As Ignacy, I want a single "APPLY NOW" action that opens the job URL and starts the application checklist simultaneously.

**Acceptance Criteria**:
- Button opens `job.url` in new tab
- Simultaneously triggers synthesis if not yet done, OR shows checklist if already synthesized
- Keyboard shortcut: `O` to open job URL when card is selected

---

### P1 — Next Sprint (Makes it Powerful)

#### F4: Cold Outreach Draft
**User Story**: As Ignacy, after synthesis, I want an AI-generated LinkedIn message or cold email to the hiring manager so I can bypass the applicant queue.

**Acceptance Criteria**:
- "DRAFT OUTREACH" button appears post-synthesis
- AI generates a 3-sentence LinkedIn DM and a 5-sentence cold email
- Tone: direct, systems-first, not "I am writing to apply"
- Output includes: suggested subject line, LinkedIn message, email body
- Copy button on each output

**Technical**: New API endpoint `POST /api/agent/outreach` — job + profile → outreach drafts

---

#### F5: Follow-Up Scheduler
**User Story**: As Ignacy, when I mark a job as applied, I want to set a follow-up reminder so I don't let applications go cold.

**Acceptance Criteria**:
- After marking applied, prompt: "Schedule follow-up? → 5 days / 7 days / Skip"
- Stores follow-up date in pipeline store against the job
- Dashboard shows "FOLLOW-UP DUE" badge on overdue applications
- Export: `GET /api/agent/followups` returns all due follow-ups

---

#### F6: Application Notes
**User Story**: As Ignacy, I want to add a quick freeform note to any job so I can capture context (e.g., "spoke to recruiter", "strong AUV match", "salary unclear").

**Acceptance Criteria**:
- Clicking a job card shows a note field (textarea, 280 char limit)
- Saves on blur or Enter
- Notes visible in mission detail panel and in export JSON
- Keyboard: `N` to focus note field when card selected

---

### P2 — Future (Makes it Scale)

#### F7: Daily Email Digest
- Every morning: email summary of pipeline status + new matches + follow-ups due
- Implementable via Vercel Cron + Resend/Nodemailer

#### F8: LinkedIn Deep Link
- If job source is LinkedIn, construct a direct application deep link
- Pre-fill name/email from profile data

#### F9: ATS Form Detector
- On job URL open, detect if it's Greenhouse/Lever/Ashby
- Offer to generate ATS-optimised bullet points (shorter, keyword-dense)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time from "synthesize" to "applied" | < 3 minutes |
| % of synthesized jobs that reach "applied" | > 60% |
| Cover letter copy rate | > 90% of sessions |
| Outreach draft usage | > 40% of applied jobs |

---

## What We Build in v0.3

**P0 only — makes it functional today:**
1. Guided Application Checklist (post-synthesis)
2. Copy-to-clipboard on CV + Cover Letter
3. Direct "OPEN JOB" action + keyboard shortcut `O`
4. Cold Outreach Draft via new `/api/agent/outreach` endpoint

This turns the synthesis output from "nice to look at" into "application sent."
