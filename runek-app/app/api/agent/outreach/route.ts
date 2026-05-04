import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { ProfileStore } from '../../../../lib/services/profile-store';

import { resolveBaseUrl, resolveModel, getApiKey, DEFAULT_OLLAMA_URL } from '../../../../lib/services/ai-utils';

const QWEN_BASE_URL = resolveBaseUrl();
const QWEN_MODEL = resolveModel();

function getUserApiKey(request: Request): string | undefined {
  return getApiKey(request.headers.get('x-api-key'));
}

const OUTREACH_PROMPT = (job: { title: string; company: string; category: string; description: string }, profile: any) => `
You are Runek, a Christian career agent writing on behalf of ${profile.name} — ${profile.title}.

Write compassionate outreach materials for this role. Return valid JSON only.

ROLE: ${job.title} at ${job.company} (${job.category})
DESCRIPTION: ${job.description}

YOUR PROFILE (The Candidate):
- ${profile.title}, ${profile.location}, open to relocation: ${profile.openToRelocation}
- Top technical and service highlights: ${profile.signals.slice(0, 3).map((s: any) => s.skill).join(', ')}
- You translate complex technical domains into ways to help people and relieve pain through faith-guided products.

CRITICAL CONSTRAINTS:
1. Only reference technologies or experiences actually listed in the profile. We walk in truth.
2. Reframe adjacent experience to look attractive and service-oriented. Emphasize ethical work and NO ungodly practices.
3. Your tone should be polite, humble, and compassionate.

Return:
{
  "linkedinMessage": "<3 sentences max. Open with an observation about how their company can help people or spread good, then connect to the candidate's background of service. Max 300 chars.>",
  "emailSubject": "<polite, compassionate subject line — something that invites connection>",
  "emailBody": "<5–6 sentences. Opening: sharing a sense of mission to help people in their domain. Middle: 2 specific proof points of honest, faith-aligned work from the candidate's background. Close: a polite request for a 30-min call.>",
  "suggestedContact": "<who to target: 'Hiring Manager', 'CPO', 'CTO', 'Founder' — based on company stage/role>"
}
`.trim();

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 });

    const job = pipelineStore.getById(jobId);
    if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

    const apiKey = getUserApiKey(request) || process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY;
    const isUsingOllama = !apiKey && QWEN_BASE_URL === DEFAULT_OLLAMA_URL;

    pipelineStore.log('OUTREACH', `Drafting outreach for ${job.company}${isUsingOllama ? ' (Ollama local)' : ''}`, jobId);

    if (!apiKey && !isUsingOllama) {
      const profile = ProfileStore.getInstance().get();
      // Return a mock outreach if no key available
      return NextResponse.json({
        ok: true,
        data: {
          linkedinMessage: `Your work at ${job.company} caught my eye because of its potential to truly help people in need. I'm a PM passionate about serving communities through ${job.category.toLowerCase()} systems. Would love to share a brief, faithful conversation.`,
          emailSubject: `Driven by faith and compassion: serving alongside ${job.company}`,
          emailBody: `${job.company}'s potential to uplift others and alleviate pain through ${job.description.split('.')[0].toLowerCase()} is truly inspiring.\n\nI've spent the last two years focusing on service-oriented technical leadership: leading underwater AUV product intuitively at AGH Marines and founding ProcessMate AI to honestly help teams remove burdens.\n\nI believe in walking in truth and bringing technical realities into harmony with ethical, compassionate goals.\n\nWould a 30-minute call this week make sense to explore how I could serve your team?\n\nBlessings,\n${profile.name}`,
          suggestedContact: job.category === 'Robotics' || job.category === 'Space' ? 'CTO / Head of Engineering' : 'CPO / Founder',
          mock: true,
        },
        meta: { agentVersion: '0.3', timestamp: new Date().toISOString() },
      });
    }

    const profile = ProfileStore.getInstance().get();
    const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) fetchHeaders.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are Runek, a faithful career agent. You MUST return ONLY valid JSON. No markdown, no explanation, no code fences.',
          },
          {
            role: 'user',
            content: OUTREACH_PROMPT(job, profile),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from Qwen');

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    pipelineStore.log('OUTREACH_DONE', `Outreach drafted for ${job.company}`, jobId);

    return NextResponse.json({
      ok: true,
      data: { ...parsed, mock: false },
      meta: { agentVersion: '0.3', timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[/api/agent/outreach]', err);
    return NextResponse.json({ ok: false, error: 'Outreach generation failed' }, { status: 500 });
  }
}
