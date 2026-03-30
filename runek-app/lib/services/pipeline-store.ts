import { Job, AgentLog } from '../types/job';
import initialJobs from '../data/jobs.json';

/**
 * PipelineStore — In-memory job pipeline with append-only agent log.
 * Singleton pattern ensures one store across all Next.js API routes.
 * Swap the internal Map for Redis/Vercel KV with zero API surface change.
 */

class PipelineStore {
  private jobs: Map<string, Job> = new Map();
  private logs: AgentLog[] = [];
  private lastIngest?: string;

  constructor() {
    this.seed();
  }

  private seed() {
    (initialJobs as Job[]).forEach(job => {
      this.jobs.set(job.id, { ...job, priority: job.priority || 'medium' });
    });
    this.log('SYSTEM', 'Pipeline store initialized', undefined, `Seeded ${this.jobs.size} jobs`);
  }

  // ── Read ────────────────────────────────────────────────────────────────

  getAll(filter?: Partial<Pick<Job, 'status' | 'category' | 'priority'>>): Job[] {
    let jobs = Array.from(this.jobs.values());
    if (filter?.status) jobs = jobs.filter(j => j.status === filter.status);
    if (filter?.category) jobs = jobs.filter(j => j.category === filter.category);
    if (filter?.priority) jobs = jobs.filter(j => j.priority === filter.priority);
    return jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  getById(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      queued: all.filter(j => j.status === 'queued').length,
      suggested: all.filter(j => j.status === 'suggested').length,
      tailored: all.filter(j => j.status === 'tailored').length,
      applied: all.filter(j => j.status === 'applied').length,
      discarded: all.filter(j => j.status === 'discarded').length,
    };
  }

  // ── Write ────────────────────────────────────────────────────────────────

  ingest(jobData: Omit<Job, 'id' | 'postedAt' | 'status' | 'matchScore' | 'priority'>): Job {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const job: Job = {
      ...jobData,
      id,
      postedAt: new Date().toISOString(),
      status: 'queued',
      matchScore: 0,
      priority: 'medium',
      ingestedBy: jobData.ingestedBy || 'api-agent',
    };
    this.jobs.set(id, job);
    this.lastIngest = new Date().toISOString();
    this.log('INGEST', `Job ingested: ${job.title} @ ${job.company}`, id);
    return job;
  }

  update(id: string, patch: Partial<Job>): Job | null {
    const existing = this.jobs.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.jobs.set(id, updated);
    return updated;
  }

  setStatus(id: string, status: Job['status']): Job | null {
    const job = this.update(id, { status });
    if (job) this.log('STATUS', `Job status → ${status}`, id, job.title);
    return job;
  }

  // ── Logs ─────────────────────────────────────────────────────────────────

  log(action: string, detail?: string, jobId?: string, _extra?: string) {
    this.logs.unshift({
      timestamp: new Date().toISOString(),
      action,
      jobId,
      detail,
    });
    // Keep last 100 entries
    if (this.logs.length > 100) this.logs.pop();
  }

  getLogs(limit = 20): AgentLog[] {
    return this.logs.slice(0, limit);
  }

  getLastIngest() {
    return this.lastIngest;
  }
}

// Singleton — survives hot reloads in dev via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __pipelineStore: PipelineStore | undefined;
}

export const pipelineStore: PipelineStore =
  globalThis.__pipelineStore ?? (globalThis.__pipelineStore = new PipelineStore());
