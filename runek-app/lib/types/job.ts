export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: 'Wellfound' | 'Climatebase' | 'Space Crew' | 'LinkedIn';
  postedAt: string;
  status: 'suggested' | 'tailored' | 'applied' | 'discarded';
  matchScore: number;
  category: 'AI' | 'Robotics' | 'Energy' | 'Space' | 'General';
}

export interface TailoredContent {
  jobId: string;
  cvMarkdown: string;
  coverLetter: string;
  tailoringNotes: string;
  generatedAt: string;
}
