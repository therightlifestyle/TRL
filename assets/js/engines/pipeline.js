/**
 * TRL — The Right Lifestyle
 * engines/pipeline.js — enquiry pipeline model.
 *
 * The stages mirror the actual TRL engagement method so the board shows the
 * real commercial flow, not a generic CRM demo.
 */

export const ENGINE_VERSION = '1.0.0';

export const STAGES = [
  { id: 'intake', name: 'Intake', description: 'Enquiry received and acknowledged.', slaHours: 4, value: 0 },
  { id: 'discovery', name: 'Discovery', description: 'Conversation about the real friction.', slaHours: 48, value: 0 },
  { id: 'scoped', name: 'Scoped', description: 'Scope, deliverables and timeline written down.', slaHours: 72, value: 15000 },
  { id: 'audit', name: 'Audit', description: 'Fixed-fee opportunity audit delivered.', slaHours: 72, value: 3000 },
  { id: 'proposal', name: 'Proposal', description: 'Quotation sent, awaiting decision.', slaHours: 120, value: 0 },
  { id: 'active', name: 'Active', description: 'Build in progress, demos each stage.', slaHours: 720, value: 0 },
  { id: 'handover', name: 'Handover', description: 'Delivered, documented, ownership transferred.', slaHours: 168, value: 0 }
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export const DISICIPLINES = [
  'AI & Automation',
  'Websites & Digital',
  'Research & Intelligence',
  'Strategy & Documentation',
  'Marketing & Content',
  'Software & Integrations',
  'Consultation'
];

export function stageById(id) {
  return STAGES.find((stage) => stage.id === id) || null;
}

export function canTransition(fromId, toId) {
  if (fromId === toId) return true;
  const from = STAGE_IDS.indexOf(fromId);
  const to = STAGE_IDS.indexOf(toId);
  if (from === -1 || to === -1) return false;
  return to !== from - 1 ? Math.abs(to - from) === 1 : true;
}

export function nextStage(id) {
  const index = STAGE_IDS.indexOf(id);
  if (index === -1 || index === STAGES.length - 1) return null;
  return STAGES[index + 1];
}

export function previousStage(id) {
  const index = STAGE_IDS.indexOf(id);
  if (index <= 0) return null;
  return STAGES[index - 1];
}

/** Aggregate board metrics. */
export function pipelineMetrics(cards = []) {
  const byStage = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  let value = 0;
  let overdue = 0;
  const now = Date.now();

  for (const card of cards) {
    if (byStage[card.stage] !== undefined) byStage[card.stage] += 1;
    value += Number(card.value) || 0;
    const stage = stageById(card.stage);
    if (stage && card.updatedAt) {
      const ageHours = (now - new Date(card.updatedAt).getTime()) / 36e5;
      if (ageHours > stage.slaHours) overdue += 1;
    }
  }

  const total = cards.length;
  const won = byStage.handover || 0;
  const open = total - won;

  return {
    total,
    open,
    byStage,
    pipelineValue: value,
    overdue,
    winRate: total ? Math.round((won / total) * 100) : 0,
    averageAgeHours: total
      ? Math.round(cards.reduce((sum, card) => {
        const t = card.updatedAt ? new Date(card.updatedAt).getTime() : now;
        return sum + (now - t) / 36e5;
      }, 0) / total)
      : 0
  };
}

/** Seed records — clearly labelled as sample data, never presented as clients. */
export function seedCards(now = Date.now()) {
  const day = 864e5;
  return [
    {
      id: 'sample-1',
      title: 'Inbound enquiry — WhatsApp, packaging supplier',
      business: 'Sample record',
      discipline: 'AI & Automation',
      value: 0,
      stage: 'intake',
      note: 'Triage engine flagged a missing reply channel.',
      createdAt: new Date(now - day * 0.4).toISOString(),
      updatedAt: new Date(now - day * 0.4).toISOString()
    },
    {
      id: 'sample-2',
      title: 'Enquiry routing review — textile manufacturer',
      business: 'Sample record',
      discipline: 'AI & Automation',
      value: 0,
      stage: 'discovery',
      note: 'Scheduled call booked for Thursday.',
      createdAt: new Date(now - day * 2).toISOString(),
      updatedAt: new Date(now - day * 1.2).toISOString()
    },
    {
      id: 'sample-3',
      title: 'Scope draft — order-to-invoice workflow',
      business: 'Sample record',
      discipline: 'Business Strategy',
      value: 15000,
      stage: 'scoped',
      note: 'Waiting on the client’s tools list.',
      createdAt: new Date(now - day * 6).toISOString(),
      updatedAt: new Date(now - day * 2).toISOString()
    },
    {
      id: 'sample-4',
      title: 'Rapid AI Opportunity Audit',
      business: 'Sample record',
      discipline: 'Consultation',
      value: 3000,
      stage: 'audit',
      note: 'In delivery — 72-hour turnaround.',
      createdAt: new Date(now - day * 3).toISOString(),
      updatedAt: new Date(now - day * 1).toISOString()
    },
    {
      id: 'sample-5',
      title: 'Website & enquiry capture build',
      business: 'Sample record',
      discipline: 'Websites & Digital',
      value: 85000,
      stage: 'proposal',
      note: 'Quotation sent, two follow-ups sent.',
      createdAt: new Date(now - day * 9).toISOString(),
      updatedAt: new Date(now - day * 3).toISOString()
    },
    {
      id: 'sample-6',
      title: 'Enquiry triage engine rollout',
      business: 'Sample record',
      discipline: 'AI & Automation',
      value: 120000,
      stage: 'active',
      note: 'Stage two of three — routing rules in build.',
      createdAt: new Date(now - day * 18).toISOString(),
      updatedAt: new Date(now - day * 1.5).toISOString()
    },
    {
      id: 'sample-7',
      title: 'Client portal build — handover',
      business: 'Sample record',
      discipline: 'Websites & Digital',
      value: 60000,
      stage: 'handover',
      note: 'Documentation and accounts transferred.',
      createdAt: new Date(now - day * 40).toISOString(),
      updatedAt: new Date(now - day * 2).toISOString()
    }
  ];
}
