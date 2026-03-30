import { ProfileSignal } from '../types/job';

/**
 * Ignacy Januszek — Canonical Profile
 * This is the source-of-truth used by the Match Engine.
 * Update this as skills/preferences evolve.
 */
export const IGNACY_PROFILE = {
  name: 'Ignacy Januszek',
  title: 'Systems Product Manager',
  location: 'Warsaw, Poland',
  openToRelocation: true,
  preferredHubs: ['Berlin', 'Munich', 'London', 'Singapore', 'Warsaw', 'Amsterdam', 'Zurich'],
  remoteOk: true,

  sectorWeights: {
    Robotics: 1.0,
    Space: 0.95,
    Energy: 0.9,
    AI: 0.85,
    General: 0.5,
  } as Record<string, number>,

  // Core skills — higher weight = stronger signal
  signals: [
    { skill: 'Systems Product Manager', weight: 1.0 },
    { skill: 'Technical PM', weight: 0.95 },
    { skill: 'AI Product Manager', weight: 0.9 },
    { skill: 'Robotics', weight: 1.0 },
    { skill: 'AUV', weight: 1.0 },
    { skill: 'Underwater', weight: 0.95 },
    { skill: 'autonomous systems', weight: 0.9 },
    { skill: 'zero-to-one', weight: 0.85 },
    { skill: 'B2B', weight: 0.8 },
    { skill: 'AI automation', weight: 0.85 },
    { skill: 'machine learning', weight: 0.8 },
    { skill: 'energy optimization', weight: 0.9 },
    { skill: 'systems thinking', weight: 0.85 },
    { skill: 'product discovery', weight: 0.8 },
    { skill: 'hardware-software', weight: 0.9 },
    { skill: 'computer vision', weight: 0.8 },
    { skill: 'iterative delivery', weight: 0.75 },
    { skill: 'startup', weight: 0.8 },
    { skill: 'high growth', weight: 0.8 },
    { skill: 'technical translation', weight: 0.85 },
    { skill: 'API', weight: 0.7 },
    { skill: 'product roadmap', weight: 0.75 },
    { skill: 'Poland', weight: 0.7 },
    { skill: 'Warsaw', weight: 0.7 },
    { skill: 'POLSA', weight: 0.9 },
    { skill: 'space', weight: 0.9 },
    { skill: 'climate', weight: 0.8 },
    { skill: 'clean energy', weight: 0.85 },
  ] as ProfileSignal[],

  // Disqualifying keywords — strong negative signals
  antiSignals: [
    'marketing manager',
    'sales representative',
    'finance analyst',
    'accountant',
    'HR',
    'legal',
    'content writer',
    'SEO',
    'data entry',
  ],

  baseCV: `
# Ignacy Januszek — Systems Product Manager

Warsaw, Poland | Open to relocation | ignacyjanuszek@gmail.com
linkedin.com/in/ignacy-januszek/ | www.spol.ski

## Summary
Systems-oriented Product Manager and high-openness generalist. Focus on translating complex technical ideas — ranging from underwater robotics to AI — into structured product direction. High learning velocity with a bias toward experimentation and iterative delivery in high-growth environments.

## Experience

**ProcessMate AI** — Founder | Warsaw | June 2025–present
- Directed product vision for custom AI automation and consulting solutions
- Conducted product discovery for high-impact automation opportunities (B2B)
- Managed technical delivery cycles, aligning engineering with client goals

**Quantum Neuron SA** — AI Product Manager | Warsaw–Singapore | Nov 2024–April 2025
- Translated AI capabilities into software products
- Led cross-functional teams across two continents

**AGH UST Marines** — Product / Systems Lead | Kraków | 2022–2024
- Led technical product development for autonomous underwater vehicles (AUVs)
- Bridged computer vision, embedded systems, and mechanical teams

## Skills
Systems Thinking · AI Product Management · Technical Roadmapping · Product Discovery · B2B Automation · Autonomous Systems · Hardware-Software Integration · Rapid Prototyping

## Education
Finance (dropout) + Computer Science interest · AGH University of Science and Technology
  `.trim(),
};
