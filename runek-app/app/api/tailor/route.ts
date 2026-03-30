import { NextResponse } from 'next/server';
import { JobService } from '../../../lib/services/job-service';
import { RunekAgent } from '../../../lib/services/ai-service';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/tailor
 * Body: { jobId: string, profile: 'robotics' | 'energy' | 'ai' }
 */
export async function POST(request: Request) {
  const { jobId, profile } = await request.json();
  const jobService = new JobService();
  const job = await jobService.getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Load the specialized CV as the 'Base Context'
  const cvPath = path.join(process.cwd(), `../cv/${profile || 'ai-growth'}.md`);
  let baseCv = "";
  
  try {
    baseCv = await fs.promises.readFile(cvPath, 'utf8');
  } catch (error) {
    console.error(`[API] Could not find CV profile: ${profile}. Using default.`);
    baseCv = "Ignacy Januszek - Systems Product Manager";
  }

  const agent = new RunekAgent(baseCv);
  const tailoredContent = await agent.tailorForJob(job);

  // Update job status to 'tailored'
  await jobService.updateJobStatus(jobId, 'tailored');

  return NextResponse.json(tailoredContent);
}
