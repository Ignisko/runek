import { NextResponse } from 'next/server';
import { pipelineStore } from '../../../../lib/services/pipeline-store';
import { IGNACY_PROFILE } from '../../../../lib/data/profile';

function getUserApiKey(request: Request): string | undefined {
  return request.headers.get('x-api-key') ?? request.headers.get('x-google-api-key') ?? undefined;
}

const OUTREACH_PROMPT = (job: { title: string; company: string; category: string; description: string }) => `
You are Runek, writing on behalf of Ignacy Januszek — a Systems PM with AUV robotics, AI automation, and B2B product experience.

Write outreach materials for this role. Return valid JSON only.

ROLE: ${job.title} at ${job.company} (${job.category})
DESCRIPTION: ${job.description}

IGNACY'S PROFILE:
- Systems Product Manager, Warsaw, open to relocation
- Founded ProcessMate AI (B2B automation), led AUV product at AGH Marines
- Translates complex technical domains (robotics, AI, energy) into product direction

Return:
{
  "linkedinMessage": "<3 sentences max. Open with a specific observation about their tech/mission, then connect to Ignacy's experience. No 'I am reaching out.' Max 300 chars.>",
  "emailSubject": "<compelling subject line, not 'Application for...' — something they'd open>",
  "emailBody": "<5–6 sentences. Opening: a sharp systems-level insight about their domain. Middle: 2 specific proof points from Ignacy's background. Close: clear ask (30-min call). No fluff.>",
  "suggestedContact": "<who to target: 'Hiring Manager', 'CPO', 'CTO', 'Founder' — based on company stage/role>"
}
`.trim();

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 });

    const job = pipelineStore.getById(jobId);
    if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });

    const apiKey = getUserApiKey(request) || process.env.GOOGLE_API_KEY;

    pipelineStore.log('OUTREACH', `Drafting outreach for ${job.company}`, jobId);

    if (!apiKey) {
      // Return a mock outreach if no key available
      return NextResponse.json({
        ok: true,
        data: {
          linkedinMessage: `The intersection of ${job.category.toLowerCase()} systems and product is where I live — your work at ${job.company} on ${job.description.split('.')[0].toLowerCase()} is exactly the kind of challenge I want to be solving. Would love 20 mins to compare notes.`,
          emailSubject: `${job.category} Systems PM → ${job.company} — worth a conversation?`,
          emailBody: `${job.company}'s approach to ${job.description.split('.')[0].toLowerCase()} caught my attention — it's a genuinely hard systems problem.\n\nI've spent the last two years at the intersection of complex technical domains and product direction: leading underwater AUV product at AGH Marines and founding ProcessMate AI, where I ran B2B automation discovery from scratch.\n\nI translate between engineering realities and commercial goals — which is what a PM in your space needs to do every day.\n\nWould a 30-minute call this week make sense?\n\nIgnacy Januszek | ignacyjanuszek@gmail.com`,
          suggestedContact: job.category === 'Robotics' || job.category === 'Space' ? 'CTO / Head of Engineering' : 'CPO / Founder',
          mock: true,
        },
        meta: { agentVersion: '0.3', timestamp: new Date().toISOString() },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: OUTREACH_PROMPT(job) }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(raw);
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
