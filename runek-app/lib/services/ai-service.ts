import { Job, TailoredContent } from "../types/job";

/**
 * RunekAgent — Gemini-powered CV & cover letter synthesizer.
 * Accepts an optional apiKey override so users can bring their own Gemini key.
 * Falls back to GOOGLE_API_KEY env var, then mock mode.
 */
export class RunekAgent {
  private baseCv: string;
  private apiKey: string | undefined;

  constructor(baseCv: string, apiKeyOverride?: string) {
    this.baseCv = baseCv;
    // Priority: caller-supplied key → env var → undefined (mock mode)
    this.apiKey = apiKeyOverride || process.env.GOOGLE_API_KEY;
  }

  async tailorForJob(job: Job): Promise<TailoredContent> {
    if (!this.apiKey) {
      console.warn("[RunekAgent] No API key — using mock output.");
      return this.mockResponse(job);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: this.buildPrompt(job) }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // Specific error for invalid/quota-exceeded keys
        if (response.status === 400 || response.status === 403) {
          throw new Error(`API key error: ${err?.error?.message ?? response.statusText}`);
        }
        throw new Error(`Gemini error ${response.status}`);
      }

      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error("Empty Gemini response");

      const parsed = JSON.parse(raw);
      return {
        jobId: job.id,
        cvMarkdown: parsed.cv ?? this.baseCv,
        coverLetter: parsed.coverLetter ?? "",
        tailoringNotes: parsed.notes ?? "",
        matchHighlights: parsed.highlights ?? [],
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[RunekAgent] API error:", err);
      // If it's an API key issue, surface the error rather than silently mocking
      if (err instanceof Error && err.message.includes("API key error")) {
        throw err;
      }
      return this.mockResponse(job);
    }
  }

  private buildPrompt(job: Job): string {
    return `
You are Runek, an elite Systems PM career agent.

Task: Tailor the CV and write a cover letter for this role. Return ONLY valid JSON.

TARGET ROLE:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Category: ${job.category}
- Description: ${job.description}

BASE CV:
${this.baseCv}

Return this exact JSON structure:
{
  "cv": "<full rewritten CV in markdown, reordered for this ${job.category} role>",
  "coverLetter": "<compelling 3-paragraph letter, opening with a systems insight, NOT 'I am writing to apply'>",
  "notes": "<2-sentence summary of tailoring decisions>",
  "highlights": ["<key selling point 1>", "<key selling point 2>", "<key selling point 3>"]
}
    `.trim();
  }

  private mockResponse(job: Job): TailoredContent {
    return {
      jobId: job.id,
      cvMarkdown: `# ${job.title} — Tailored CV\n\n[AI offline — add your Gemini API key to enable live synthesis]\n\n${this.baseCv}`,
      coverLetter: `Building ${job.category.toLowerCase()} systems that matter requires a PM who can speak both engineering and business fluently.\n\nAt ProcessMate AI, I led product discovery cycles that directly reduced client operational overhead. At AGH Marines, I translated between computer vision engineers and mission stakeholders for our AUV programme.\n\nI would be energised to bring this systems-first approach to ${job.company}.\n\n— Ignacy Januszek`,
      tailoringNotes: `Mock mode active. Add a Gemini API key via X-Api-Key header or GOOGLE_API_KEY env var.`,
      matchHighlights: ["Systems PM background", `${job.category} sector alignment`, "Open to relocation"],
      generatedAt: new Date().toISOString(),
    };
  }
}
