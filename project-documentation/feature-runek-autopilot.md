# Feature Documentation: Runek AI Autopilot (MVP)

## Status
**Complete** (MVP Release)

## Links & References
**Related Files:**
- [engine.ts](file:///c:/Users/ignac/Documents/github%20projects/runek/runek-app/lib/agent/engine.ts) - Core Playwright automation engine
- [page.tsx](file:///c:/Users/ignac/Documents/github%20projects/runek/runek-app/app/page.tsx) - Dashboard UI & Live Mission Feed
- [runek/route.ts](file:///c:/Users/ignac/Documents/github%20projects/runek/runek-app/app/api/agent/runek/route.ts) - API to spawn the autopilot process
- [mission-logs/route.ts](file:///c:/Users/ignac/Documents/github%20projects/runek/runek-app/app/api/agent/mission-logs/route.ts) - Real-time IPC for mission status

## Problem Statement
Manual job hunting is a high-friction, repetitive task. Users spend hours scrolling job boards, filtering by tech stack, and filling out the same personal details. Runek solves this by providing a "set and forget" agent that handles the entire loop—from discovery to application—autonomously on the user's local machine.

## Solution Overview
Runek AI Autopilot is a local-first automation suite. 
- **Scraping**: It uses a headless browser (Playwright) to sweep JustJoinIT for roles matching the user's "Scrape Keyword."
- **Filtering**: It scores every role against the user's `profile.json` using a weighted keyword engine.
- **Applying**: For "1-Click" roles, it automatically fills the form and submits. For external ATS roles, it pre-fills the data and waits for a final user review.
- **Feedback**: It streams its "thoughts" and actions back to a "Live Mission Feed" on the dashboard via a shared JSON log file.

## Architecture Integration
**Where this fits in the overall app:**
The Autopilot lives at the intersection of the **Automation Layer** and the **Local Data Layer**. It is spawned as a detached child process by the Next.js backend, allowing the dashboard to be closed or refreshed without interrupting the mission.

**Data flow:**
1. **User** clicks "AUTOPILOT" -> **Next.js API** spawns `engine.ts`.
2. **Engine** reads `profile.json` and `cv.pdf` from the `userdata` directory.
3. **Engine** navigates to JustJoinIT and performs a sweep.
4. **Engine** writes real-time events to `userdata/mission_logs.json`.
5. **Dashboard** polls the log file every 2 seconds and updates the UI.
6. **Engine** appends successful applications to `userdata/applications_history.csv`.

## Core Components

### Autopilot Engine (`engine.ts`)
**Purpose:** Orchestrates the Playwright browser session, handles authentication checks, and executes application logic.
**Input:** `profile.json`, `cv.pdf`.
**Output:** `mission_logs.json`, `applications_history.csv`.

### Live Mission Feed (`page.tsx`)
**Purpose:** Provides a real-time window into the agent's autonomous behavior.
**Input:** `mission_logs.json` (via API).
**Output:** Visual log stream with success/failure indicators.

### CV Upload Manager (`upload-cv/route.ts`)
**Purpose:** Bridges the UI and the file system to ensure the agent has the correct resume file.
**Input:** User-uploaded PDF file.
**Output:** `userdata/cv.pdf`.

## Implementation Details
**Dependencies:**
- `playwright`: For browser automation.
- `tsx`: For running TypeScript scripts without a build step.
- `child_process.spawn`: For process detachment.

**Key Configuration:**
- `USERDATA_DIR`: Parent directory for all persistent local-first data.
- `MISSION_LOGS_PATH`: The "heartbeat" file for UI/Agent communication.

## Testing Approach
**How to test this feature:**
1. Ensure Chrome is installed on the host machine.
2. Run `Start-Runek.bat`.
3. Open Settings and ensure "Base CV" and "API Key" (for synthesis) are set.
4. Upload a sample `cv.pdf`.
5. Click **AUTOPILOT** and observe the browser window and the Mission Feed.

## Known Issues & Future Improvements
**Current limitations:**
- **Chrome Dependency**: Currently expects a local installation of Chrome (channel "chrome").
- **Platform Support**: Highly optimized for JustJoinIT; other boards (LinkedIn/NoFluff) require manual URL ingestion.

**Planned improvements:**
- **Vision-Based Error Handling**: Using LLM vision to solve CAPTCHAs or complex form errors.
- **Headless Toggle**: Allow running missions in the background without a visible browser window.

## Risks & Considerations
**Technical risks:**
- **Anti-Bot Detection**: Sites may update their detection logic to block Playwright sessions. Runek uses `--disable-blink-features=AutomationControlled` to mitigate this.
- **Structure Changes**: If a job board changes its CSS selectors (e.g., `.offer-card`), the scraper will break until updated.

---
**Created:** 2026-05-04 by Antigravity
**Last Updated:** 2026-05-04 by Antigravity
