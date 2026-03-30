import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';

/**
 * GET /api/agent/jobs
 * Returns pipeline jobs with optional filters.
 * Query params: ?status=suggested&category=Robotics&priority=critical
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filter: Record<string, string> = {};
  for (const key of ['status', 'category', 'priority']) {
    const val = searchParams.get(key);
    if (val) filter[key] = val;
  }

  const jobs = pipelineStore.getAll(filter as never);
  const logs = pipelineStore.getLogs(10);

  return NextResponse.json({
    ok: true,
    data: { jobs, logs },
    meta: {
      agentVersion: '0.2',
      timestamp: new Date().toISOString(),
      count: jobs.length,
    },
  });
}
