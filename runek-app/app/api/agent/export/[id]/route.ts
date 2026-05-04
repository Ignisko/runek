import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../../lib/services/pipeline-store';
import { RunekAgent } from '../../../../../lib/services/ai-service';
import { ProfileStore } from '../../../../../lib/services/profile-store';

function getUserApiKey(request: Request): string | undefined {
  return request.headers.get('x-api-key') ?? request.headers.get('x-google-api-key') ?? undefined;
}

/**
 * GET /api/agent/export/[id]
 * Returns the tailored content for a job as structured JSON.
 * Query: ?format=json (default) | ?format=markdown
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'json';

  const job = pipelineStore.getById(id);
  if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

  // Always re-generate on export (fresh synthesis)
  const profile = ProfileStore.getInstance().get();
  const agent = new RunekAgent(profile.baseCV, getUserApiKey(request));
  const tailored = await agent.tailorForJob(job);

  if (format === 'markdown') {
    const md = `# ${job.title} @ ${job.company}\n\n## Tailored CV\n\n${tailored.cvMarkdown}\n\n---\n\n## Cover Letter\n\n${tailored.coverLetter}\n\n---\n\n## Tailoring Notes\n${tailored.tailoringNotes}`;
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="runek-${id}.md"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: { job, tailored },
    meta: { agentVersion: '0.2', timestamp: new Date().toISOString() },
  });
}
