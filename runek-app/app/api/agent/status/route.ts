import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { AgentStatus } from '../../../../lib/types/job';

/**
 * GET /api/agent/status
 * Returns agent health + pipeline stats. Use as heartbeat from external agents.
 */
export async function GET() {
  const stats = pipelineStore.getStats();
  const status: AgentStatus = {
    version: '0.2.0',
    timestamp: new Date().toISOString(),
    pipeline: stats,
    lastIngest: pipelineStore.getLastIngest(),
    aiReady: !!process.env.GOOGLE_API_KEY,
  };

  return NextResponse.json({ ok: true, data: status, meta: { agentVersion: '0.2' } });
}
