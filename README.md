# Runek | Autonomous Career Agent (MVP)

Runek is a "Local-First" AI agent designed to automate the most tedious parts of job hunting. It doesn't just find jobs; it scores them, synthesizes tailored outreach, and can even apply on your behalf.

![Runek Dashboard](https://github.com/Ignisko/runek/raw/main/assets/preview.png) *(Placeholder)*

## 🚀 One-Click Launch
Runek is designed to be simple. No cloud database, no complex setup.
1. **Download** the repository.
2. **Double-click `Start-Runek.bat`**.
3. The dashboard will automatically open at `http://localhost:3000`.

## ✦ Key Features
- **Autonomous Autopilot**: A Playwright-powered agent that sweeps job boards (JustJoinIT) and applies to roles matching your profile.
- **Match Ranking**: Every job is scored (0-100) based on your unique skills, sector preferences, and relocation status.
- **Live Mission Feed**: Watch the agent work in real-time. See every click and decision it makes in the dashboard.
- **The Prophet (Synthesis)**: Generate tailored CV summaries and outreach messages in seconds using Qwen or OpenAI.
- **Zero Friction**: No login. No database. Everything stays on your machine in the `userdata/` folder.

## 🛠️ Configuration
- **API Key**: Add your OpenAI/Qwen key in the Dashboard Settings to enable AI synthesis.
- **Resume**: Upload your PDF resume via the Settings modal. It will be saved as `userdata/cv.pdf` and used by the Autopilot.

## 📁 Project Structure
- `runek-app/`: The Next.js dashboard and API.
- `lib/agent/engine.ts`: The core "brain" of the Autopilot.
- `userdata/`: Your local-first database (Jobs, Profile, and Logs).

## 📄 Documentation
- [Feature: AI Autopilot](./project-documentation/feature-runek-autopilot.md)
- [System Design](./project-documentation/system-design.md)

---
**Runek is open-source and built for the "Day 0" manual-to-automated pivot.**
Built by [Ignacy Januszek](https://linkedin.com/in/ignacyjanuszek) & Antigravity AI.
