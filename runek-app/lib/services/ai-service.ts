import { Job, TailoredContent } from "../types/job";

/**
 * RunekAgent — Gemini-powered CV & cover letter synthesizer.
 * Returns structured JSON, not split text.
 */
export class RunekAgent {
  private baseCv: string;
  private apiKey: string | undefined;

  constructor(baseCv: string) {
    this.baseCv = baseCv;
    this.apiKey = process.env.GOOGLE_API_KEY;
  }

  async tailorForJob(job: Job): Promise<TailoredContent> {
    if (!this.apiKey) {
      console.warn("[RunekAgent] No GOOGLE_API_KEY — using mock output.");
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
      return this.mockResponse(job);
    }
  }

  private buildPrompt(job: Job): string {
    return `
You are Runek, an elite Systems PM career agent for Ignacy Januszek.

Task: Tailor the CV and write a cover letter for this role. Return ONLY valid JSON.

TARGET ROLE:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Category: ${job.category}
- Description: ${job.description}

IGNACY'S BASE CV:
${this.baseCv}

Return this exact JSON structure:
{
  "cv": "<full rewritten CV in markdown, reordered to lead with most relevant experience for this ${job.category} role>",
  "coverLetter": "<compelling 3-paragraph letter, opening with a systems insight, not 'I am writing to apply'>",
  "notes": "<2-sentence summary of key tailoring decisions made>",
  "highlights": ["<top selling point 1>", "<top selling point 2>", "<top selling point 3>"]
}
    `.trim();
  }

  private mockResponse(job: Job): TailoredContent {
    return {
      jobId: job.id,
      cvMarkdown: `# ${job.title} — Ignacy Januszek\n\n[AI synthesis offline — add GOOGLE_API_KEY to enable]\n\n${this.baseCv}`,
      coverLetter: `Building ${job.category.toLowerCase()} systems that matter requires a PM who can speak both engineering and business fluently.\n\nAt ProcessMate AI, I led product discovery cycles that directly reduced client operational overhead. At AGH Marines, I translated between computer vision engineers and mission stakeholders for our AUV programme.\n\nI would be energised to bring this systems-first approach to ${job.company}.\n\n— Ignacy Januszek`,
      tailoringNotes: `Mock mode. Add GOOGLE_API_KEY to Vercel env vars for live synthesis.`,
      matchHighlights: ["Systems PM background", `${job.category} sector alignment`, "Open to relocation"],
      generatedAt: new Date().toISOString(),
    };
  }
}
