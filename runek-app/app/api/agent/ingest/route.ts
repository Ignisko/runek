import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { matchEngine } from '../../../../lib/services/match-engine';

/**
 * POST /api/agent/ingest
 * Accepts a raw job from any external source (scraper, n8n, Python agent, etc).
 * Immediately scores it and returns the match result.
 *
 * Body: { title, company, location, description, url, source, category, ingestedBy? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    const required = ['title', 'company', 'location', 'description', 'url', 'category'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { ok: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Ingest into pipeline
    const job = pipelineStore.ingest({
      title: body.title,
      company: body.company,
      location: body.location,
      description: body.description,
      url: body.url,
      source: body.source || 'api-agent',
      category: body.category,
      ingestedBy: body.ingestedBy || request.headers.get('x-agent-id') || 'external',
    });

    // Score immediately
    const match = matchEngine.score(job);

    // Update with score + priority + signals
    pipelineStore.update(job.id, {
      matchScore: match.score,
      priority: match.priority,
      matchReason: match.summary,
      matchSignals: match.signals,
      status: 'open',
    });

    pipelineStore.log('MATCH', `Scored ${match.score}/100 → ${match.priority}`, job.id);

    return NextResponse.json(
      {
        ok: true,
        data: {
          jobId: job.id,
          matchScore: match.score,
          priority: match.priority,
          status: 'open',
          signals: match.signals,
          summary: match.summary,
        },
        meta: { agentVersion: '0.2', timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[/api/agent/ingest]', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
