import * as fs from 'fs';
import * as path from 'path';
import { Job, AgentLog } from '../types/job';

const DATA_PATH = path.join(process.cwd(), 'lib', 'data', 'jobs.json');

/**
 * PipelineStore — File-persisted job pipeline with append-only agent log.
 * Singleton pattern ensures one store across all Next.js API routes.
 */
class PipelineStore {
  private jobs: Map<string, Job> = new Map();
  private logs: AgentLog[] = [];
  private lastIngest?: string;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_PATH)) {
        const data = fs.readFileSync(DATA_PATH, 'utf-8');
        const jobsArray = JSON.parse(data) as Job[];
        jobsArray.forEach(job => {
          this.jobs.set(job.id, { ...job, priority: job.priority || 'medium' });
        });
        this.log('SYSTEM', 'Pipeline store loaded from disk', undefined, `Loaded ${this.jobs.size} jobs`);
      } else {
        this.log('SYSTEM', 'No existing data found, starting fresh');
      }
    } catch (error) {
      console.error('[PipelineStore] Load error:', error);
      this.log('SYSTEM', 'Error loading data, starting fresh');
    }
  }

  private persist() {
    try {
      const jobsArray = Array.from(this.jobs.values());
      fs.writeFileSync(DATA_PATH, JSON.stringify(jobsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('[PipelineStore] Persist error:', error);
    }
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
      open: all.filter(j => j.status === 'open').length,
      applied: all.filter(j => j.status === 'applied').length,
      archived: all.filter(j => j.status === 'discarded').length,
    };
  }

  // ── Write ────────────────────────────────────────────────────────────────

  ingest(jobData: Omit<Job, 'id' | 'postedAt' | 'status' | 'matchScore' | 'priority'>): Job {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const job: Job = {
      ...jobData,
      id,
      postedAt: new Date().toISOString(),
      status: 'open',
      matchScore: 0,
      priority: 'medium',
      ingestedBy: jobData.ingestedBy || 'api-agent',
    };
    this.jobs.set(id, job);
    this.lastIngest = new Date().toISOString();
    this.log('INGEST', `Job ingested: ${job.title} @ ${job.company}`, id);
    this.persist();
    return job;
  }

  update(id: string, patch: Partial<Job>): Job | null {
    const existing = this.jobs.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.jobs.set(id, updated);
    this.persist();
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

