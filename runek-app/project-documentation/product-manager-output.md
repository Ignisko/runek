# Product Requirements Document: Runek – Autonomous Career Agent (SaaS MVP)

## Executive Summary

- **Elevator Pitch**: A per-user cloud dashboard where job seekers track all their applications across LinkedIn, JustJoinIT, and any other platform — in one place, automatically.
- **Problem Statement**: Job hunting is fragmented across dozens of platforms. There's no single source of truth for "where did I apply, what's the status, did they reply?".
- **Target Audience**: Active job-seekers who apply across multiple platforms and want to stop losing track of their pipeline.
- **USP**: Multi-platform application tracking + email inbox parsing + (future) AI autopilot agent that applies for you.

---

## Product Tiers

### Free Tier
- Google Login (Firebase Auth)
- Unlimited manual application logging (Firestore, per-user)
- Dashboard: table view of all applications with status + notes
- Filtering & sorting by status/date

### Paid Tier (Future)
- Email integration: read replies from a dedicated job email (ProtonMail / Gmail)
- Autopilot agent: local or cloud-based agent that submits applications automatically

---

## Feature Specifications (MVP — Free Tier)

### 1. Google Authentication
- **User Story**: As a job-seeker, I want to log in with Google so my data is private and synced across devices.
- **Priority**: P0

### 2. Application Dashboard
- **User Story**: As a user, I want to see all my job applications in one table.
- **Columns**: Company, Role, Platform (LinkedIn/JustJoinIT/etc.), Status, Applied At, Notes
- **Design**: Keep current dark/glassmorphism design
- **Priority**: P0

### 3. CRUD — Applications
- **User Story**: As a user, I want to add/edit/delete applications manually.
- **Fields**: company, role, platform, link, status, notes, appliedAt
- **Status Enum**: saved | applied | interview | offer | rejected
- **Priority**: P0

### 4. Filtering & Sorting
- Filter by: status, platform
- Sort by: appliedAt (desc default)
- **Priority**: P1

### 5. Remove: AI Synthesize Feature
- The current "Synthesize" / cover letter generation button is to be **removed** from the UI.
- AI features will re-appear in the Paid Tier as an autopilot agent.
- **Priority**: P0 (must be removed for clean scope)

---

## Future Roadmap (Out of Scope for MVP)

### Email Reader
- User connects a dedicated job-search email account (ProtonMail / Gmail via OAuth)
- Runek parses incoming emails: interview invites, rejections, offers
- Auto-updates application status based on email content
- **Architecture options**: Gmail API / IMAP polling / ProtonMail Bridge

### Autopilot Agent (Paid)
- **Option A (Local)**: User downloads a desktop agent (Electron or .exe) that uses Playwright to apply on their machine — no cloud costs, fully private
- **Option B (Cloud)**: Vercel/Firebase Cloud Function or a dedicated VM runs headless Playwright targeting job boards
- **Decision needed**: Architecture choice depends on cost model and anti-bot tolerance of target job boards

---

## Data Schema (Firestore)

```
users/{userId}
  - email, displayName, createdAt, tier (free/pro)

applications/{appId}
  - userId (string)       ← scoped to user
  - company (string)
  - role (string)
  - platform (string)     ← "LinkedIn", "JustJoinIT", "Manual", etc.
  - link (url)
  - status (enum)
  - notes (text)
  - appliedAt (timestamp)
  - updatedAt (timestamp)
```

## Security Rules (Firestore)

```
match /applications/{appId} {
  allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

---

## Open Questions

1. **Email integration timing**: When do you want to tackle email? Post-launch or in parallel?
2. **Autopilot agent**: Local (user runs it) or cloud-hosted? Local avoids infra costs but requires a download.
3. **Platform tracking**: Should the "platform" field be a free-text input or a curated dropdown (LinkedIn, JustJoinIT, Pracuj, etc.)?
