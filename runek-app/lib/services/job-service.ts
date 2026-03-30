import fs from 'fs';
import path from 'path';
import { Job } from '../types/job';

/**
 * JobService: The data-access layer for the Runek pipeline.
 * Designed to be easily replaced by Airtable/Postgres in Phase 5.
 */
export class JobService {
  private dataPath = path.join(process.cwd(), 'lib/data/jobs.json');

  constructor() {}

  /**
   * Fetches all jobs from the pipeline.
   */
  async getJobs(): Promise<Job[]> {
    try {
      const fileData = await fs.promises.readFile(this.dataPath, 'utf8');
      return JSON.parse(fileData) as Job[];
    } catch (error) {
      console.error("[JobService] Error reading jobs:", error);
      return [];
    }
  }

  /**
   * Retrieves a single job by its ID.
   */
  async getJobById(id: string): Promise<Job | undefined> {
    const jobs = await this.getJobs();
    return jobs.find(job => job.id === id);
  }

  /**
   * Updates a job's status in the pipeline.
   */
  async updateJobStatus(id: string, status: Job['status']): Promise<boolean> {
    const jobs = await this.getJobs();
    const index = jobs.findIndex(job => job.id === id);
    
    if (index === -1) return false;

    jobs[index].status = status;
    
    try {
      await fs.promises.writeFile(this.dataPath, JSON.stringify(jobs, null, 2));
      return true;
    } catch (error) {
      console.error("[JobService] Error writing jobs:", error);
      return false;
    }
  }
}
