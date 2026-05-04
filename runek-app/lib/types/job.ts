export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string; // open string — can be 'Wellfound' | 'custom-agent' | 'n8n' | etc
  postedAt: string;
  status: 'open' | 'applied' | 'discarded';
  matchScore: number;
  matchReason?: string;      // brief LLM/engine explanation of why it fits
  matchSignals?: string[];   // e.g. ["Systems PM", "AUV", "Warsaw relocation"]
  category: 'AI' | 'Robotics' | 'Energy' | 'Space' | 'General';
  ingestedBy?: string;       // 'dashboard' | 'api-agent' | 'n8n' | etc
  tailoredAt?: string;
  appliedAt?: string;
  notes?: string;
  followUpDate?: string;
}

export interface TailoredContent {
  jobId: string;
  cvMarkdown: string;
  coverLetter: string;
  tailoringNotes: string;
  matchHighlights: string[]; // key selling points for this specific role
  generatedAt: string;
}

export interface MatchResult {
  jobId: string;
  score: number;            // 0–100
  signals: string[];        // matched keywords / profile signals
  gaps: string[];           // missing qualifications
  summary: string;          // 1-sentence human-readable explanation
}


export interface ProfileSignal {
  skill: string;
  weight: number;  // 0–1, how important this signal is for scoring
  category?: Job['category'];
}

export interface AgentLog {
  timestamp: string;
  action: string;
  jobId?: string;
  detail?: string;
}
