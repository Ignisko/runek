# Runek :: Local Operation Guide

Follow these steps to initialize the **Neural Job Automator** on your local machine.

## 1. Environment Configuration
The AI engine requires a Google AI Studio API Key to perform neural tailoring.

1.  **Copy Template**: Duplicate `.env.example` as `.env` in the root directory.
2.  **Add Key**: Open `.env` and paste your `GOOGLE_API_KEY`.
    ```env
    GOOGLE_API_KEY=AIzaSy...your_key_here
    ```

## 2. Dependency Installation
Run the following from the root directory to install the Next.js runtime and styling engines.
```bash
npm install
```

## 3. Launch the Dashboard
Start the development server to activate the local endpoint.
```bash
npm run dev
```
The dashboard will be active at: **http://localhost:3000**

## 4. Operational Troubleshooting
- **Build Errors**: Ensure you have Node.js 18+ installed.
- **AI Synthesis Failure**: Check your `.env` formatting and ensure the Gemini API key has 'Generative Language' permissions enabled.
- **Port Conflict**: If 3000 is occupied, the agent will automatically attempt to move to 3001.

---
**Runek Core :: Systems Portfolio v0.1.0**
