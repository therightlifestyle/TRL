/**
 * TRL — The Right Lifestyle
 * engines/brief.js — scope brief builder.
 *
 * Turns a short conversation into a written, structured brief that can be
 * sent to TRL (or used as a starting point for the fixed-fee audit).
 * Everything is produced in the browser; nothing is transmitted.
 */

export const ENGINE_VERSION = '1.0.0';

export const QUESTION_SET = [
  { id: 'problem', label: 'What is the friction?', type: 'textarea', required: true,
    placeholder: 'e.g. Enquiries arrive on WhatsApp and someone types the details into a spreadsheet by hand.' },
  { id: 'volume', label: 'How often does it happen?', type: 'select',
    options: ['A few times a day', 'Several times a day', 'Every hour', 'Weekly', 'Monthly', 'Seasonal'] },
  { id: 'team', label: 'Who does it today?', type: 'select',
    options: ['One person', 'Two to three people', 'A whole team', 'It is automated already', 'It is not being done at all'] },
  { id: 'tools', label: 'What tools are involved?', type: 'text',
    placeholder: 'WhatsApp, Google Sheets, Excel, Gmail…' },
  { id: 'impact', label: 'What does it cost you?', type: 'select',
    options: ['Minor annoyance', 'A few hours a week', 'A full working day a week', 'It blocks growth', 'We cannot operate without it'] },
  { id: 'timeline', label: 'When do you need it fixed?', type: 'select',
    options: ['This week', 'Within a month', 'This quarter', 'No fixed date'] },
  { id: 'budget', label: 'Budget range', type: 'select',
    options: ['Under PKR 50,000', 'PKR 50,000 – 150,000', 'PKR 150,000 – 500,000', 'Above PKR 500,000', 'Not decided yet'] },
  { id: 'notes', label: 'Anything else we should know?', type: 'textarea', required: false,
    placeholder: 'Tools you are forced to use, deadlines, compliance, team preferences…' }
];

const IMPACT_SCORE = {
  'Minor annoyance': 1,
  'A few hours a week': 2,
  'A full working day a week': 3,
  'It blocks growth': 4,
  'We cannot operate without it': 5
};

const TIMELINE_SCORE = {
  'This week': 4,
  'Within a month': 3,
  'This quarter': 2,
  'No fixed date': 1
};

export function buildBrief(answers = {}) {
  const problem = (answers.problem || '').trim();
  const missing = QUESTION_SET
    .filter((q) => q.required && !String(answers[q.id] || '').trim())
    .map((q) => q.label);

  const impact = IMPACT_SCORE[answers.impact] || 0;
  const urgency = TIMELINE_SCORE[answers.timeline] || 0;
  const complexity = estimateComplexity(answers);

  let route = 'Consultation';
  if (!problem) route = 'Needs a conversation first';
  else if (complexity <= 2 && impact <= 2) route = 'Quick automation win';
  else if (impact >= 4) route = 'Systems engagement';
  else if (complexity >= 3) route = 'Process and automation project';

  const priority = (impact + urgency) / 2;

  return {
    version: ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    complete: missing.length === 0,
    missing,
    route,
    priority: Number(priority.toFixed(1)),
    estimatedDuration: estimateDuration(complexity, impact),
    recommendedFirstStep:
      problem
        ? 'Start with the Rapid AI Opportunity Audit — PKR 3,000, delivered within 72 hours, with a written priority list.'
        : 'Book a short discovery conversation so the problem can be described in your own words.',
    answers: {
      problem,
      volume: answers.volume || null,
      team: answers.team || null,
      tools: answers.tools || null,
      impact: answers.impact || null,
      timeline: answers.timeline || null,
      budget: answers.budget || null,
      notes: answers.notes || null
    }
  };
}

function estimateComplexity(answers) {
  let score = 1;
  const tools = String(answers.tools || '');
  const toolCount = tools.split(/[,;/]| and /i).filter((t) => t.trim().length > 1).length;
  score += Math.min(2, toolCount * 0.5);
  if (answers.team === 'One person') score += 1;
  if (answers.impact === 'It blocks growth' || answers.impact === 'We cannot operate without it') score += 1;
  if (String(answers.problem || '').length > 220) score += 0.5;
  return Math.min(5, Math.round(score * 2) / 2);
}

function estimateDuration(complexity, impact) {
  if (!complexity) return '—';
  if (complexity <= 1.5) return '3 – 7 days';
  if (complexity <= 2.5) return '1 – 2 weeks';
  if (complexity <= 3.5) return '3 – 5 weeks';
  if (complexity <= 4.5) return '6 – 10 weeks';
  return '10+ weeks (phased)';
}

export function briefToMarkdown(brief) {
  const a = brief.answers;
  const lines = [
    '# TRL — Engagement brief',
    '',
    `_Generated ${new Date(brief.createdAt).toLocaleString('en-GB')}_`,
    '',
    '## The problem',
    a.problem || '_Not yet described._',
    '',
    '## Context',
    `- **Volume:** ${a.volume || '—'}`,
    `- **Who does it today:** ${a.team || '—'}`,
    `- **Tools involved:** ${a.tools || '—'}`,
    `- **Business impact:** ${a.impact || '—'}`,
    `- **Timeline:** ${a.timeline || '—'}`,
    `- **Budget range:** ${a.budget || '—'}`,
    '',
    a.notes ? `## Notes\n${a.notes}\n` : '',
    '## TRL assessment',
    `- **Recommended route:** ${brief.route}`,
    `- **Estimated duration:** ${brief.estimatedDuration}`,
    `- **Priority (1–5):** ${brief.priority}`,
    `- **Recommended first step:** ${brief.recommendedFirstStep}`,
    '',
    '---',
    'Send this to TRL — The Right Lifestyle · +92 319 0091457 · officialtrlservice@gmail.com'
  ];
  return lines.filter((line) => line !== null).join('\n');
}
