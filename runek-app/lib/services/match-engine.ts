import { Job, MatchResult } from '../types/job';
import { IGNACY_PROFILE } from '../data/profile';

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

    // ── Anti-signal check ────────────────────────────────────────────────
    for (const anti of IGNACY_PROFILE.antiSignals) {
      if (text.includes(anti.toLowerCase())) {
        return {
          jobId: job.id,
          score: 5,
          priority: 'low',
          signals: [],
          gaps: [`Disqualifying keyword: "${anti}"`],
          summary: `Role appears misaligned (contains "${anti}").`,
        };
      }
    }

    // ── Signal scoring ───────────────────────────────────────────────────
    const matched: string[] = [];
    let rawScore = 0;
    let totalWeight = 0;

    for (const signal of IGNACY_PROFILE.signals) {
      totalWeight += signal.weight;
      if (text.includes(signal.skill.toLowerCase())) {
        matched.push(signal.skill);
        rawScore += signal.weight;
      }
    }

    // Normalise to 0–80 (signal score)
    const signalScore = totalWeight > 0 ? (rawScore / totalWeight) * 80 : 0;

    // ── Sector bonus (up to +15) ─────────────────────────────────────────
    const sectorWeight = IGNACY_PROFILE.sectorWeights[job.category] ?? 0.5;
    const sectorBonus = sectorWeight * 15;

    // ── Location bonus (up to +5) ────────────────────────────────────────
    const jobLoc = job.location.toLowerCase();
    const locationBonus = IGNACY_PROFILE.preferredHubs.some(h =>
      jobLoc.includes(h.toLowerCase())
    )
      ? 5
      : IGNACY_PROFILE.remoteOk && (jobLoc.includes('remote') || jobLoc.includes('hybrid'))
      ? 3
      : IGNACY_PROFILE.openToRelocation
      ? 2
      : 0;

    const total = Math.min(100, Math.round(signalScore + sectorBonus + locationBonus));

    // ── Gap detection ────────────────────────────────────────────────────
    const gaps: string[] = [];
    if (!matched.some(s => ['Systems Product Manager', 'Technical PM', 'AI Product Manager'].includes(s))) {
      gaps.push('No explicit PM seniority keyword matched');
    }
    if (total < 50) gaps.push('Low keyword overlap with profile');

    // ── Priority tier ────────────────────────────────────────────────────
    const priority: Job['priority'] =
      total >= 88 ? 'critical' :
      total >= 75 ? 'high' :
      total >= 55 ? 'medium' : 'low';

    return {
      jobId: job.id,
      score: total,
      priority,
      signals: matched,
      gaps,
      summary: this.buildSummary(job, matched, total),
    };
  }

  private buildSummary(job: Job, signals: string[], score: number): string {
    if (score >= 88) return `Critical match — ${signals.slice(0, 3).join(', ')} align directly with your trajectory.`;
    if (score >= 75) return `Strong fit — ${job.category} sector with ${signals.slice(0, 2).join(' and ')} overlap.`;
    if (score >= 55) return `Moderate overlap — ${signals.slice(0, 2).join(', ')} matched. Review for fit.`;
    return `Weak signal — limited keyword alignment for your profile.`;
  }
}

export const matchEngine = new MatchEngine();
