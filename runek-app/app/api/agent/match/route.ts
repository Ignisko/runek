import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { matchEngine } from '../../../../lib/services/match-engine';

/**
 * POST /api/agent/match
 * Score a job against Ignacy's profile without ingesting it.
 * Useful for pre-screening before committing to the pipeline.
 *
 * Body: { jobId? } OR a full job object for ad-hoc scoring.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    let job;
    if (body.jobId) {
      job = pipelineStore.getById(body.jobId);
      if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
    } else {
      // Ad-hoc scoring of a job not yet in pipeline
      job = {
        id: 'adhoc',
        status: 'queued' as const,
        matchScore: 0,
        priority: 'medium' as const,
        postedAt: new Date().toISOString(),
        ...body,
      };
    }

    const match = matchEngine.score(job);

    return NextResponse.json({
      ok: true,
      data: match,
      meta: { agentVersion: '0.2', timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[/api/agent/match]', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
