import { Job } from '../types/job';

export interface JustJoinOffer {
  slug: string;
  title: string;
  companyName: string;
  city: string;
  workplaceType: string;
  experienceLevel: string;
  employmentTypes: Array<{
    type: string;
    from: number;
    to: number;
    currency: string;
    unit: string;
  }>;
  requiredSkills: Array<{ name: string; level: number }>;
  category: { key: string };
  guid: string;
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

      if (!response.ok) {
        throw new Error(`Failed to fetch from JustJoinIT: ${response.statusText}`);
      }

      const data = await response.json();
      const offers: JustJoinOffer[] = data.data || [];

      return offers.map(offer => this.mapToJob(offer));
    } catch (error) {
      console.error('[JustJoinScraper] Error:', error);
      throw error;
    }
  }

  private static mapToJob(offer: JustJoinOffer): Job {
    const salary = offer.employmentTypes[0];
    const salaryDesc = salary 
      ? `${salary.from} - ${salary.to} ${salary.currency}/${salary.unit}`
      : 'Salary not specified';

    const description = `
Company: ${offer.companyName}
Location: ${offer.city} (${offer.workplaceType})
Experience: ${offer.experienceLevel}
Salary: ${salaryDesc}
Skills: ${offer.requiredSkills.map(s => s.name).join(', ')}
Category: ${offer.category.key}
    `.trim();

    // Map JustJoinIT category to Runek category
    let category: Job['category'] = 'General';
    const jjKey = offer.category.key.toLowerCase();
    if (jjKey === 'ai' || jjKey === 'ml' || jjKey === 'data') category = 'AI';
    // Add more mappings if needed

    return {
      id: `jj-${offer.guid}`,
      title: offer.title,
      company: offer.companyName,
      location: offer.city,
      description,
      url: `https://justjoin.it/offers/${offer.slug}`,
      source: 'JustJoinIT',
      postedAt: new Date().toISOString(),
      status: 'open',
      matchScore: 0,
      priority: 'medium',
      category: category,
      ingestedBy: 'scraper'
    };
  }
}
