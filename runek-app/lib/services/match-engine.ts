import { Job, MatchResult } from '../types/job';
import { ProfileStore } from './profile-store';

/**
 * MatchEngine — scores a Job against Ignacy's profile.
 * Pure function: no side effects, no I/O.
 * LLM is optional — base scoring is keyword + location + sector weighted.
 */
export class MatchEngine {
  score(job: Job): MatchResult {
    const text = [job.title, job.company, job.description, job.location]
      .join(' ')
      .toLowerCase();

    const profile = ProfileStore.getInstance().get();

    // ── Anti-signal check ────────────────────────────────────────────────
    for (const anti of profile.antiSignals) {
      if (text.includes(anti.toLowerCase())) {
        return {
          jobId: job.id,
          score: 5,
          signals: [],
          priority: 'low',
          gaps: [`Disqualifying keyword: "${anti}"`],
          summary: `Role appears misaligned (contains "${anti}").`,
        };
      }
    }

    // ── Signal scoring ───────────────────────────────────────────────────
    const matched: string[] = [];
    let rawScore = 0;
    let totalWeight = 0;

    for (const signal of profile.signals) {
      totalWeight += signal.weight;
      if (text.includes(signal.skill.toLowerCase())) {
        matched.push(signal.skill);
        rawScore += signal.weight;
      }
    }

    // Normalise to 0–80 (signal score)
    const signalScore = totalWeight > 0 ? (rawScore / totalWeight) * 80 : 0;

    // ── Sector bonus (up to +15) ─────────────────────────────────────────
    const sectorWeight = profile.sectorWeights[job.category] ?? 0.5;
    const sectorBonus = sectorWeight * 15;

    // ── Location bonus (up to +5) ────────────────────────────────────────
    const jobLoc = job.location.toLowerCase();
    const locationBonus = profile.preferredHubs.some(h =>
      jobLoc.includes(h.toLowerCase())
    )
      ? 5
      : profile.remoteOk && (jobLoc.includes('remote') || jobLoc.includes('hybrid'))
      ? 3
      : profile.openToRelocation
      ? 2
      : 0;

    const total = Math.min(100, Math.round(signalScore + sectorBonus + locationBonus));

    // ── Priority calculation ─────────────────────────────────────────────
    let priority: Job['priority'] = 'low';
    if (total >= 88) priority = 'critical';
    else if (total >= 75) priority = 'high';
    else if (total >= 55) priority = 'medium';

    // ── Gap detection ────────────────────────────────────────────────────
    const gaps: string[] = [];
    if (total < 50) gaps.push('Low keyword overlap with profile');

    return {
      jobId: job.id,
      score: total,
      signals: matched,
      priority,
      gaps,
      summary: this.buildSummary(job, matched, total),
    };
  }

  private buildSummary(job: Job, signals: string[], score: number): string {
    if (score >= 88) return `Critical match — ${signals.slice(0, 3).join(', ')} align directly.`;
    if (score >= 75) return `Strong fit — ${job.category} sector overlap.`;
    if (score >= 55) return `Moderate overlap — ${signals.slice(0, 2).join(', ')} matched.`;
    return `Weak signal — limited alignment for your profile.`;
  }
}

export const matchEngine = new MatchEngine();
