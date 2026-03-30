import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { RunekAgent } from '../../../../lib/services/ai-service';
import { IGNACY_PROFILE } from '../../../../lib/data/profile';

/**
 * POST /api/agent/tailor
 * Trigger AI synthesis for a job. Returns tailored CV + cover letter.
 * Body: { jobId: string }
 */
export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 });

    const job = pipelineStore.getById(jobId);
    if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

    pipelineStore.log('TAILOR', `Initiating synthesis for ${job.title} @ ${job.company}`, jobId);

    const agent = new RunekAgent(IGNACY_PROFILE.baseCV);
    const result = await agent.tailorForJob(job);

    // Mark as tailored
    pipelineStore.update(jobId, {
      status: 'tailored',
      tailoredAt: new Date().toISOString(),
    });

    pipelineStore.log('TAILOR_COMPLETE', `Synthesis complete — ${result.matchHighlights.length} highlights`, jobId);

    return NextResponse.json({
      ok: true,
      data: result,
      meta: { agentVersion: '0.2', timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[/api/agent/tailor]', err);
    return NextResponse.json({ ok: false, error: 'Synthesis failed' }, { status: 500 });
  }
}
