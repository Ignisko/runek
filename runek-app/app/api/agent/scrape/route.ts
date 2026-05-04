import { NextResponse } from 'next/server';
import { JustJoinScraper } from '../../../../lib/services/scraper-service';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { matchEngine } from '../../../../lib/services/match-engine';

export async function POST(request: Request) {
  try {
    const { keywords = 'product', count = 30 } = await request.json();
    
    pipelineStore.log('SCRAPE', `Starting JustJoinIT scrape for: ${keywords}...`);
    
    const rawJobs = await JustJoinScraper.fetchJobs(keywords, count);
    let newJobsCount = 0;

    for (const rawJob of rawJobs) {
      // Check if job already exists (by URL or generated ID if consistent)
      const existing = pipelineStore.getAll().find(j => j.url === rawJob.url);
      if (existing) continue;

      // Ingest
      const job = pipelineStore.ingest(rawJob);
      
      // Score immediately
      const match = matchEngine.score(job);
      
      // Update with score
      pipelineStore.update(job.id, {
        matchScore: match.score,
        priority: match.priority,
        matchReason: match.summary,
        matchSignals: match.signals,
        status: 'open',
      });
      
      newJobsCount++;
    }

    pipelineStore.log('SCRAPE_DONE', `Scrape complete. Found ${newJobsCount} new jobs.`);

    return NextResponse.json({
      ok: true,
      data: { newJobsCount, totalFound: rawJobs.length },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err: any) {
    console.error('[/api/agent/scrape]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
