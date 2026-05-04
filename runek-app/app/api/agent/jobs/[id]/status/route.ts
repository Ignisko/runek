import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../../../lib/services/pipeline-store';
import { Job } from '../../../../../../lib/types/job';

/**
 * PATCH /api/agent/jobs/[id]/status
 * Update a job's status. Called by dashboard buttons or external agents.
 * Body: { status: 'open' | 'synthesized' | 'applied' | 'interviewing' | 'offer_received' | 'accepted' | 'rejected' | 'no_answer' | 'discarded' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  const validStatuses: Job['status'][] = ['open', 'synthesized', 'applied', 'interviewing', 'offer_received', 'accepted', 'rejected', 'no_answer', 'discarded'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: `Invalid status: ${status}` }, { status: 400 });
  }

  const updated = pipelineStore.setStatus(id, status);
  if (!updated) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    data: updated,
    meta: { agentVersion: '0.2', timestamp: new Date().toISOString() },
  });
}
