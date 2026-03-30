import { Job, TailoredContent } from "../types/job";

/**
 * The RunekAgent is the core 'brain' of the automation.
 * It maps the user's base CV to a specific Job Description.
 */
export class RunekAgent {
  private baseCv: string;

  constructor(baseCv: string) {
    this.baseCv = baseCv;
  }

  /**
   * Tailors the CV and generates a Cover Letter.
   * In a real implementation, this would call Gemini 1.5 Pro.
   */
  async tailorForJob(job: Job): Promise<TailoredContent> {
    // This is where we would use an LLM. 
    // Prompt structure:
    // 1. Context: System PM background
    // 2. Persona: Ignacy Januszek
    // 3. User CV: this.baseCv
    // 4. Job Category: job.category (e.g. Robotics)
    // 5. Task: Analyze JD and rewrite bullet points for max impact.
    
    console.log(`[RunekAgent] Tailoring for ${job.title} at ${job.company}...`);

    // Mocking the AI response for the demo/build phase
    return {
      jobId: job.id,
      cvMarkdown: this.mockTailoredCv(job),
      coverLetter: this.mockCoverLetter(job),
      tailoringNotes: `Focused on ${job.category} specific experience from AGH Marines and Quantum Neuron.`,
      generatedAt: new Date().toISOString(),
    };
  }

  private mockTailoredCv(job: Job): string {
    return `# Tailored: ${job.title} - Ignacy Januszek\n\n[...Tailored Content with high ${job.category} keywords...]`;
  }

  private mockCoverLetter(job: Job): string {
    return `Dear ${job.company} Team,\n\nI am writing to express my interest in the ${job.title} position...`;
  }
}
