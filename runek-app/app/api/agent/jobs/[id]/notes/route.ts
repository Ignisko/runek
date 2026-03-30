import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../../../lib/services/pipeline-store';

/**
 * PATCH /api/agent/jobs/[id]/notes
 * Save freeform notes to a job.
 * Body: { notes: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { notes } = await request.json();

  if (typeof notes !== 'string') {
    return NextResponse.json({ ok: false, error: 'notes must be a string' }, { status: 400 });
  }

  const updated = pipelineStore.update(id, { notes: notes.slice(0, 280) });
  if (!updated) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

  return NextResponse.json({ ok: true, data: { id, notes: updated.notes } });
}
