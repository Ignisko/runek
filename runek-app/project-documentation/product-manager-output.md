
1/1

Next.js 16.2.1 (stale)
Turbopack
Build Error

Expected '</', got 'jsx text'
./app/page.tsx (171:15)

Expected '</', got 'jsx text'
  169 |
  170 |           </div>
> 171 |         </div>
      |               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 172 |       </header>
      | ^^^^^^
  173 |
  174 |       {/*── BODY ──*/}
  175 |       <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px", display: "gri...

Parsing ecmascript source code failed

Import traces:
  Client Component Browser:
    ./app/page.tsx [Client Component Browser]
    ./app/page.tsx [Server Component]

  Client Component SSR:
    ./app/page.tsx [Client Component SSR]
    ./app/page.tsx [Server Component]
1
2

# Product Requirements Document: Configurable Candidate Profile & Employment Eligibility

## Executive Summary

- **Elevator Pitch**: Transform the Runek Job Application Engine from a single-user personalized agent into a multi-tenant or distributable SaaS tool by introducing a dynamic, configurable Candidate Profile system that powers intelligent job scoring.
- **Problem Statement**: The current LLM-driven job matching engine uses a hardcoded configuration profile (`profile.ts`) tailored specifically to the original creator (including implicit European Union work eligibility based on Polish citizenship). If shared with other job-seekers, the engine would hallucinate job fits or draft cover letters with incorrect constraints and backgrounds.
- **Target Audience**: Future users of the Runek Engine—technical professionals, PMs, and engineers who wish to automate their own job hunts without needing to edit raw TypeScript source files.
- **Unique Selling Proposition**: Instead of manually cross-referencing visa requirements and relocation constraints per job, the engine autonomously cross-references the user's explicit work eligibilities (Citizenships / Visas) against a job's requirements to penalize or boost match scores.
- **Success Metrics**:
  1. 100% of the matching engine's context is decoupled from hardcoded source code.
  2. Users can seamlessly onboard and dictate their visa/citizenship restrictions via a frontend GUI.

---

## Feature Specifications

### Feature: Global Candidate Settings Interface

- **User Story**: As a general user, I want to edit my personal profile, resume, and citizenship status via a UI, so that the AI targets jobs mathematically relevant to my life situation.
- **Acceptance Criteria**:
  - Given a user is in the dashboard, when they click "Settings", then they are presented with a form to define their Baseline CV, Core Skills, Preferred Hubs, and Citizenship/Work Authorization.
  - Given a user holds an "EU Citizenship" (e.g., Poland), when the Engine evaluates an open role in Germany, then the LLM knows NO visa sponsorship is required and does not penalize the match score.
  - Given a user requires sponsorship for the US (e.g., H1B), when the Engine evaluates a US role explicitly stating "No Sponsorship", then the match score is heavily penalized or automatically marked as "discarded".
- **Priority**: P1 (Primary blocker for distribution)
- **Dependencies**:
  - Migration of `lib/data/profile.ts` into a dynamic DB or `profile.json` singleton store.
  - Updates to the LLM Prompt in `/api/agent/match` to dynamically inject the user's citizenship context.
- **Technical Constraints**: The LLM needs precise prompt instructions to understand the intersection of a user's citizenship against a job's location correctly (e.g. knowing that Poland grants EU-wide working rights).
- **UX Considerations**: Must abstract complex ML-weight matching (like `sectorWeights`) into an easy-to-understand slider or tag builder.

---

## Requirements Documentation Structure

### 1. Functional Requirements

- **State Management**: Implement a `ProfileStore` (similar to `PipelineStore`) that reads/writes from `profile.json`.
- **Data Validation Rules**:
  - Passports/Citizenships must be an array of standard Country identifiers to allow the LLM to process work eligibility accurately.
  - "Open to Relocation" must conditionally require "Preferred Hubs/Regions."
- **Integration Points**:
  - Overhaul `match/route.ts` to replace `IGNACY_PROFILE` with `await ProfileStore.get()`.
  - Overhaul `tailor/route.ts` to ensure cover letters mention the applicant's work authorization status only when it is a strategic advantage.

### 2. Non-Functional Requirements

- **Performance targets**: Profile persistence should be local-first, preventing DB latency during sweeping API match calls.
- **Security**: Resumes and profiles contain highly identifiable personal data (PII). Ensure `profile.json` is strictly ignored by `.gitignore` if the project is open-sourced, and the Settings UI does not expose data publicly.

### 3. User Experience Requirements

- **Information Architecture**: Create a dedicated `/settings` page or a prominent Settings overlay accessible from the dashboard header.
- **Progressive Disclosure**: Split the setup into fundamental "Job Preferences" (Location, Visa, Salary) vs "Matching Intelligence" (Base CV, Custom Skills & Weights).

---

## Critical Questions Checklist (For Stakeholder Review)

- [x] Are there existing solutions we're improving upon? Yes, standard ATS platforms, but we are injecting autonomous matching.
- [x] What's the minimum viable version? A simple React form that saves basic demography and citizenship to a JSON file rather than TS code.
- [x] What are the potential risks? The LLM failing to accurately assess complex visa treaties (e.g. TN visas between Canada/US, or Blue Card rules). We must instruct the LLM to be conservative.
- [ ] **GAPS / Needs Clarity from User**:
      1. When we make things "changeable," do you want a full Settings UI page built right now, or should we just decouple it into an easy-to-edit JSON config file first for your initial distribution?
      2. Should we add a hard rule logic for visas (e.g., *if job is US and user is not US -> instant discard*), or rely purely on the LLM to read the job description and make an intelligent deduction?
