import { NextResponse } from 'next/server';
import { JobService } from '../../../lib/services/job-service';

/**
 * GET /api/jobs: Returns all suggested and tailored jobs.
 */
export async function GET() {
  const service = new JobService();
  const jobs = await service.getJobs();
  
  return NextResponse.json(jobs);
}
