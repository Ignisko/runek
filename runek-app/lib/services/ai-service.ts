import { Job, TailoredContent } from "../types/job";
import { resolveBaseUrl, resolveModel, getApiKey, DEFAULT_OLLAMA_URL } from "./ai-utils";

const QWEN_BASE_URL = resolveBaseUrl();
const QWEN_MODEL = resolveModel();

/**
 * RunekAgent — Qwen-powered CV & cover letter synthesizer.
 * Uses OpenAI-compatible API (DashScope, OpenRouter, or any Qwen endpoint).
 * Falls back to QWEN_API_KEY / OPENAI_API_KEY env var, then mock mode.
 */
export class RunekAgent {
  private baseCv: string;
  private apiKey: string | undefined;

  constructor(baseCv: string, apiKeyOverride?: string) {
    this.baseCv = baseCv;
    // Priority: caller-supplied key → QWEN_API_KEY → OPENAI_API_KEY → undefined (mock mode)
    this.apiKey = getApiKey(apiKeyOverride);
  }

  async tailorForJob(job: Job): Promise<TailoredContent> {
    const isUsingOllama = !this.apiKey && QWEN_BASE_URL === DEFAULT_OLLAMA_URL;

    if (!this.apiKey && !isUsingOllama) {
      console.warn("[RunekAgent] No API key and no Ollama — using mock output.");
      return this.mockResponse(job);
    }

    try {
      const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (this.apiKey) fetchHeaders.Authorization = `Bearer ${this.apiKey}`;

      const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages: [
            {
              role: "system",
              content: "You are Runek, a faithful career agent. You MUST return ONLY valid JSON matching the requested schema. No markdown, no explanation, no code fences.",
            },
            {
              role: "user",
              content: this.buildPrompt(job),
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error(`API key error: ${err?.error?.message ?? response.statusText}`);
        }
        throw new Error(`Qwen API error ${response.status}: ${err?.error?.message ?? response.statusText}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty Qwen response");

      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
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
      if (err instanceof Error && err.message.includes("API key error")) {
        throw err;
      }
      return this.mockResponse(job);
    }
  }

  private buildPrompt(job: Job): string {
    return `
You are Runek, a faithful, compassionate career agent embedded with deeply Christian values.

Task: Tailor the CV and write a cover letter for this role. Return ONLY valid JSON.

CRITICAL CONSTRAINTS - CREATIVE BUT TRUTHFUL, GROUNDED IN FAITH:
1. ONLY leverage facts, dates, and history explicitly found in the BASE CV. DO NOT invent fake roles, degrees, or metrics. We walk in truth.
2. Masterfully reframe true experience. Reframe the candidate's work to emphasize helping people in pain, service to the community, spreading compassion, and maintaining ungodly-free, deeply ethical standards. ABSOLUTELY NO exploitation, sexual harassment, or sinful corporate maneuvering.
3. Your goal is to make the candidate look as strong as possible for this specific role while remaining 100% strictly factual and demonstrating strong Christian morality. Highlight problem-solving through faith, kindness, and honest work.

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
  "cv": "<full rewritten CV in markdown, emphasizing service to others, helping people in pain, and honest work, reordered for this ${job.category} role>",
  "coverLetter": "<compelling, empathetic 3-paragraph letter, opening with a compassionate insight on how to serve people, NOT 'I am writing to apply'>",
  "notes": "<2-sentence summary of faith-guided tailoring decisions>",
  "highlights": ["<key service point 1>", "<key service point 2>", "<key service point 3>"]
}
    `.trim();
  }

  private mockResponse(job: Job): TailoredContent {
    return {
      jobId: job.id,
      cvMarkdown: `# ${job.title} — Servant Leadership CV\n\n[AI offline — add your Qwen API key to enable live faithful synthesis]\n\n${this.baseCv}`,
      coverLetter: `Serving others and building ${job.category.toLowerCase()} systems that matter requires a heart guided by faith, capable of speaking both empathy and strategy fluently.\n\nAt ProcessMate AI, I led product discovery cycles that directly helped relieve the pain of our clients' operational burdens. At AGH Marines, I translated between computer vision engineers and mission stakeholders with deep compassion and understanding for our AUV programme.\n\nI would be blessed to bring this faith-first, service-oriented approach to ${job.company}.\n\n— Ignacy Januszek`,
      tailoringNotes: `Mock mode active. Add a Qwen API key via X-Api-Key header or QWEN_API_KEY env var.`,
      matchHighlights: ["Systems PM background", `${job.category} sector alignment`, "Open to relocation"],
      generatedAt: new Date().toISOString(),
    };
  }
}
