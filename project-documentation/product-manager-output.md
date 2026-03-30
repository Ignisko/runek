# Product Manager Output - Runek: AI-Powered Job Automation

## Executive Summary

- **Elevator Pitch**: A high-velocity AI agent that identifies, analyzes, and applies to technical PM roles by tailoring every CV/Cover Letter to match niche requirements in AI, Robotics, and Energy.
- **Problem Statement**: For mid-to-senior PMs in technical fields, the application process is high-friction (30+ mins/job) due to the need for deep tailoring. General job boards are noisy, and niche boards are manual.
- **Target Audience**: Ignacy Januszek (Systems Product Manager) and other high-velocity technical PM candidates.
- **Unique Selling Proposition**: Unlike generic "auto-apply" tools, Runek uses a "Systems Model" to understand technical complexity (e.g., AUVs, LLMs) and ensures the candidate's specific achievements (AGH Marines, POLSA) are mapped correctly to the JD.
- **Success Metrics**: 
  - **Conversion Rate**: Percentage of applications resulting in a Recruiter/Hiring Manager screening call (Target: >10%).
  - **Time Saved**: Reduction in time-per-application from 45 mins to 2 mins.

---

## Feature Specifications

### Feature: Niche Board Aggregator
- **User Story**: As a Systems PM, I want to see a daily list of jobs from Climatebase, Space Crew, and Wellfound, so that I don't miss "cool" startups.
- **Acceptance Criteria**:
  - Scrapes/Fetches jobs from at least 3 niche boards daily.
  - Filters out non-PM roles or low-relevance industries.
- **Priority**: P0 (Core Value)

### Feature: AI Context Mapper (CV Tailor)
- **User Story**: As a candidate with diverse experience (Robotics, AI, Space), I want the AI to automatically highlight the most relevant projects for each specific job descripton.
- **Acceptance Criteria**:
  - Maps AGH Marines experience to Robotics JDs.
  - Maps Quantum Neuron experience to AI JDs.
  - Generates a PDF/Markdown CV and Cover Letter.
- **Priority**: P0 (Core Value)

### Feature: "One-Tap" Review Dashboard
- **User Story**: As a busy founder/PM, I want a single interface to review AI-generated drafts and click "Apply" or "Send".
- **Acceptance Criteria**:
  - UI displays Job Title, Company, JD, and Generated Content side-by-side.
  - Allows manual editing of the Cover Letter before submission.
- **Priority**: P1

---

## Functional Requirements

1. **Job Sourcing Engine**
   - Integration with Greenhouse/Lever APIs for direct application discovery.
   - keyword-based prioritization (e.g., "Underwater", "Robotics", "Green Hydrogen").

2. **Persona Storage**
   - Maintain a "Core Knowledge Base" of Ignacy's experiences (The CV you provided).
   - Store multiple "Achievement Buckets" to be used as modular text blocks.

3. **Output Formats**
   - Clean, ATS-friendly markdown and PDF generation.
   - Consistent typography and layout (Modern, Brutalist styling as per your preferences).

---

## User Experience Requirements

- **Efficiency-First**: The dashboard should prioritize keyboard shortcuts (L = Like/Apply, X = Discard).
- **Transparency**: The AI must explain *why* it chose specific bullet points for a job.
- **Mobile-Responsive**: Quick review on-the-go.

---

## Critical Questions Checklist

- [x] **Existing Solutions?** Yes (Simplify, Teal, etc.), but none specialize in high-signal niche technical roles with deep context mapping.
- [x] **MVB?** A command-line script that pulls from 1 board and generates 1 tailored PDF.
- [ ] **GAPS?** Need to know if Ignacy has a preference for specific ATS platforms (Greenhouse vs. Lever) to focus automation efforts.
