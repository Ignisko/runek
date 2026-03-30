import { Job, TailoredContent } from "../types/job";

/**
 * The RunekAgent is the core 'brain' of the automation.
 * In production, it connects to Google Generative AI (Gemini).
 */
export class RunekAgent {
  private baseCv: string;
  private apiKey: string | undefined;

  constructor(baseCv: string) {
    this.baseCv = baseCv;
    this.apiKey = process.env.GOOGLE_API_KEY;
  }

  /**
   * Tailors the CV and generates a Cover Letter using Gemini API.
   */
  async tailorForJob(job: Job): Promise<TailoredContent> {
    if (!this.apiKey) {
      console.warn("[RunekAgent] No GOOGLE_API_KEY found. Falling back to mock mode.");
      return this.getMockResponse(job);
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: this.buildPrompt(job)
            }]
          }]
        })
      });

      const data = await response.json();
      const output = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!output) throw new Error("Invalid response from Gemini API");

      return {
        jobId: job.id,
        cvMarkdown: output.split("---COVERLETTER---")[0]?.trim() || this.baseCv,
        coverLetter: output.split("---COVERLETTER---")[1]?.trim() || "Cover letter generation failed.",
        tailoringNotes: `Successfully tailored using Gemini 1.5 Flash for ${job.category}.`,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[RunekAgent] API Error:", error);
      return this.getMockResponse(job);
    }
  }

  private buildPrompt(job: Job): string {
    return `
      You are a Systems Product Manager assistant named Runek. 
      Task: Tailor the following CV for a specifically targeted role.
      
      TARGET JOB: ${job.title} at ${job.company}
      CATEGORY: ${job.category}
      JD DESCRIPTION: ${job.description}
      
      BASE CV:
      ${this.baseCv}
      
      Instructions:
      1. Rewrite the professional summary to highlight matching skills.
      2. Reorder experience to put the most relevant projects for ${job.category} first.
      3. Generate a compelling, high-signal cover letter.
      
      Output Format:
      [Tailored CV Markdown]
      ---COVERLETTER---
      [Cover Letter Text]
    `;
  }

  private getMockResponse(job: Job): TailoredContent {
    return {
      jobId: job.id,
      cvMarkdown: `# Tailored: ${job.title} - Ignacy Januszek\n\n[...Mocked Content...]`,
      coverLetter: `Dear ${job.company} Team,\n\nI am writing to express my interest in the ${job.title} position...`,
      tailoringNotes: "Mock mode: Please provide a GOOGLE_API_KEY in Vercel to enable live AI tailoring.",
      generatedAt: new Date().toISOString(),
    };
  }
}
