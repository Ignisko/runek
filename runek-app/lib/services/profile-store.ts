import fs from 'fs';
import path from 'path';

// Define the core Profile types based on the old IGNACY_PROFILE
export interface ProfileSignal {
  skill: string;
  weight: number;
}

export interface CandidateProfile {
  name: string;
  title: string;
  location: string;
  openToRelocation: boolean;
  preferredHubs: string[];
  remoteOk: boolean;
  sectorWeights: Record<string, number>;
  signals: ProfileSignal[];
  antiSignals: string[];
  baseCV: string;
}

export class ProfileStore {
  private static instance: ProfileStore;
  private filePath: string;
  private profileCache: CandidateProfile | null = null;

  private constructor() {
    this.filePath = path.join(process.cwd(), 'lib/data/profile.json');
  }

  public static getInstance(): ProfileStore {
    if (!ProfileStore.instance) {
      if (globalThis.__profileStore) {
        ProfileStore.instance = globalThis.__profileStore;
      } else {
        ProfileStore.instance = new ProfileStore();
        globalThis.__profileStore = ProfileStore.instance;
      }
    }
    return ProfileStore.instance;
  }

  public get(): CandidateProfile {
    if (this.profileCache) return this.profileCache;

    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.profileCache = JSON.parse(data);
        return this.profileCache!;
      }
    } catch (error) {
      console.warn("Failed to load profile.json, falling back to an empty template", error);
    }

    // Fallback template
    return {
      name: 'Your Name',
      title: 'Your Title',
      location: 'Your Location',
      openToRelocation: true,
      preferredHubs: [],
      remoteOk: true,
      sectorWeights: {},
      signals: [],
      antiSignals: [],
      baseCV: '# Add your CV here'
    };
  }

  public update(patch: Partial<CandidateProfile>): CandidateProfile {
    const current = this.get();
    const updated = { ...current, ...patch };
    
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf-8');
    this.profileCache = updated;
    
    return updated;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __profileStore: ProfileStore | undefined;
}
