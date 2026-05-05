import { Job } from '../types/job';

export interface ScraperSource {
  name: string;
  fetchJobs: (keywords: string, count: number) => Promise<Job[]>;
}

export class JustJoinScraper {
  private static JUST_JOIN_BASE_URL = 'https://justjoin.it/api/candidate-api/offers';

  static async fetchJobs(keywords = 'product', count = 30): Promise<Job[]> {
    const url = `${this.JUST_JOIN_BASE_URL}?from=0&itemsCount=${count}&withSalary=true&orderBy=descending&sortBy=salary&keywords=${keywords}&keywordType=any`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch from JustJoinIT: ${response.statusText}`);
      const data = await response.json();
      return (data.data || []).map((offer: any) => this.mapToJob(offer));
    } catch (error) {
      console.error('[JustJoinScraper] Error:', error);
      return [];
    }
  }

  private static mapToJob(offer: any): Job {
    return {
      id: `jj-${offer.guid}`,
      title: offer.title,
      company: offer.companyName,
      location: offer.city,
      description: `${offer.companyName} in ${offer.city}. Skills: ${offer.requiredSkills?.map((s: any) => s.name).join(', ')}`,
      url: `https://justjoin.it/offers/${offer.slug}`,
      source: 'JustJoinIT',
      postedAt: new Date().toISOString(),
      status: 'open',
      matchScore: 0,
      priority: 'medium',
      category: 'General',
      ingestedBy: 'scraper'
    };
  }
}

export class LinkedInScraper {
  static async fetchJobs(keywords = 'product', count = 10): Promise<Job[]> {
    // LinkedIn requires Playwright/Puppeteer or an official API. 
    // This is a placeholder that simulates ingestion for the Unified Dashboard.
    console.log(`[LinkedInScraper] Simulating scrape for: ${keywords}`);
    return []; 
  }
}

export class ScraperRegistry {
  static async fetchAll(keywords: string, count = 30): Promise<Job[]> {
    const results = await Promise.all([
      JustJoinScraper.fetchJobs(keywords, count),
      LinkedInScraper.fetchJobs(keywords, Math.floor(count / 2))
    ]);
    return results.flat();
  }
}
