import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { RunekAgent } from '../../../../lib/services/ai-service';
import { IGNACY_PROFILE } from '../../../../lib/data/profile';

// Helper: extract user-supplied API key from headers
function getUserApiKey(request: Request): string | undefined {
  return request.headers.get('x-api-key') ?? request.headers.get('x-google-api-key') ?? undefined;
}

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

    const userApiKey = getUserApiKey(request);
    pipelineStore.log('TAILOR', `Initiating synthesis for ${job.title} @ ${job.company}`, jobId, userApiKey ? 'user-key' : 'env-key');

    const agent = new RunekAgent(IGNACY_PROFILE.baseCV, userApiKey);
    let result;
    try {
      result = await agent.tailorForJob(job);
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : 'API key error';
      return NextResponse.json({ ok: false, error: msg, hint: 'Pass your Gemini API key via X-Api-Key header' }, { status: 402 });
    }

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
