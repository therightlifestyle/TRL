/**
 * TRL — The Right Lifestyle
 * engines/blueprint.js — the reference system architecture TRL designs toward.
 *
 * Five layers, each with the components we implement, the signals we measure,
 * the tools we usually reach for and the failure modes we design against.
 * This is the blueprint behind every engagement.
 */

export const ENGINE_VERSION = '1.0.0';

export const LAYERS = [
  {
    id: 'capture',
    index: 1,
    name: 'Capture',
    tagline: 'Every enquiry enters through one door',
    purpose:
      'Work only starts when every request — WhatsApp, email, web form, phone — lands in a single, owned place with the original message intact.',
    components: [
      'Unified enquiry inbox (WhatsApp Business, web form, email alias, phone log)',
      'Structured intake form capturing name, business, need, urgency, budget band',
      'Source tagging so we know which channel actually produces revenue',
      'Auto-acknowledgement in the customer’s language, in under 60 seconds'
    ],
    metrics: [
      { label: 'Enquiries captured', value: '100%' },
      { label: 'Acknowledgement time', value: '< 60s' },
      { label: 'Unattributed enquiries', value: '0' }
    ],
    tools: ['WhatsApp Business', 'Google Workspace', 'Tally / Typeform', 'Cloudflare'],
    failureModes: [
      'Enquiries arriving in personal WhatsApp with no record',
      'Phone enquiries lost entirely because nobody writes them down',
      'Duplicate records when the same customer writes twice'
    ],
    flow: ['Web form', 'WhatsApp', 'Email', 'Phone log', 'Inbox']
  },
  {
    id: 'route',
    index: 2,
    name: 'Route',
    tagline: 'The right work reaches the right desk',
    purpose:
      'Every captured enquiry is classified, scored and assigned. Nothing waits in a list because nobody decided who owns it.',
    components: [
      'Triage engine: intent, urgency, entities and confidence on arrival',
      'Routing rules by discipline, value and SLA',
      'Escalation path for complaints, SLA clocks and expiry alerts',
      'Gap detection: missing details are requested automatically, not chased manually'
    ],
    metrics: [
      { label: 'Time to route', value: '< 2 min' },
      { label: 'Unowned enquiries', value: '0' },
      { label: 'Details complete on arrival', value: '> 80%' }
    ],
    tools: ['TRL triage engine', 'n8n', 'Airtable', 'Zapier'],
    failureModes: [
      'Enquiries sitting unanswered because the owner was on leave',
      'The most profitable customer treated the same as a spam query',
      'Replies sent before the basic facts were known'
    ],
    flow: ['Triage', 'Score', 'Assign', 'SLA clock', 'Reply']
  },
  {
    id: 'automate',
    index: 3,
    name: 'Automate',
    tagline: 'Repetitive work runs itself',
    purpose:
      'The repeatable steps — confirmations, data entry, reminders, drafts, reports — run on rules, so the business keeps its pace without the founder in the room.',
    components: [
      'Workflow automations between the tools the business already pays for',
      'AI drafts for replies, summaries and documents, always human-approved before sending',
      'Scheduled background jobs: digests, reminders, reconciliations',
      'Integration layer so no data is retyped between systems'
    ],
    metrics: [
      { label: 'Touchless handling', value: '> 60%' },
      { label: 'Hours returned weekly', value: 'Tracked' },
      { label: 'Double-entry removed', value: '0' }
    ],
    tools: ['n8n', 'Make', 'OpenAI API', 'Supabase', 'Google Apps Script'],
    failureModes: [
      'Automations nobody can debug when they break',
      'AI sending customer-facing messages without a human in the loop',
      'Silent failures — the workflow stopped and nobody noticed for weeks'
    ],
    flow: ['Trigger', 'Enrich', 'Decide', 'Act', 'Log']
  },
  {
    id: 'document',
    index: 4,
    name: 'Document',
    tagline: 'The business runs on paper, not on memory',
    purpose:
      'Every process, decision and standard is written down in a form a new hire can follow on day one, and a departing employee cannot take with them.',
    components: [
      'Standard operating procedures for the work that matters',
      'Runbooks with failure modes, escalation paths and rollback steps',
      'Decision log: what was decided, when, why, and by whom',
      'Handover pack: accounts, credentials, documentation, ownership transfer'
    ],
    metrics: [
      { label: 'Processes documented', value: '100%' },
      { label: 'Onboarding time', value: 'Reduced' },
      { label: 'Bus factor', value: '> 1' }
    ],
    tools: ['Notion', 'Google Docs', 'Git', 'Airtable'],
    failureModes: [
      'Documentation written but never updated after a change',
      'TAC — the answer only exists in one person’s head',
      'Credentials stored in chat threads instead of a password manager'
    ],
    flow: ['Write', 'Review', 'Publish', 'Maintain', 'Archive']
  },
  {
    id: 'review',
    index: 5,
    name: 'Review',
    tagline: 'The system is measured, then improved',
    purpose:
      'A system that is never reviewed silently rots. We put review cycles, service levels and honest reporting in place so the business can see what is working.',
    components: [
      'Weekly operational digest: volume, response time, backlog, exceptions',
      'Service levels with breach alerts and a named owner',
      'Monthly review of what the automation actually returned',
      'Change log so improvements are visible and reversible'
    ],
    metrics: [
      { label: 'Response time', value: 'Tracked' },
      { label: 'SLA breaches', value: 'Tracked' },
      { label: 'Improvements shipped', value: 'Monthly' }
    ],
    tools: ['Google Sheets', 'Looker Studio', 'Grafana', 'Email digests'],
    failureModes: [
      'Reports nobody reads',
      'Metrics collected but never turned into decisions',
      'Silent degradation — a workflow quietly stopped working'
    ],
    flow: ['Measure', 'Compare', 'Decide', 'Change', 'Re-measure']
  }
];

export const PRINCIPLES = [
  { title: 'One source of truth', body: 'If a fact matters to the business, it lives in one system that everyone reads from. No shadow spreadsheets, no “I also kept a copy”.' },
  { title: 'Humans approve anything outbound', body: 'Automation prepares the work — it does not send unapproved statements to customers. Every outbound message is reviewed by a person.' },
  { title: 'Failure is designed for', body: 'Every workflow we ship has a documented failure mode, a rollback and an alert. Silent failure is the thing we design against hardest.' },
  { title: 'The founder can leave the room', body: 'The test of a system is whether it still runs, at the same quality, when the person who built it is on leave. That is the bar we work to.' },
  { title: 'Ownership transfers completely', body: 'You keep the accounts, the code, the documentation and the ability to change it. No dependency on us, by design.' }
];

export function getLayer(id) {
  return LAYERS.find((layer) => layer.id === id) || null;
}

export function listLayers() {
  return LAYERS;
}

/** Resolve which layer a given enquiry most likely belongs to (used by the Console). */
export function layerForIntent(intentId) {
  const map = {
    order: 'capture',
    support: 'route',
    complaint: 'route',
    pricing: 'route',
    automation: 'automate',
    website: 'document',
    partnership: 'document',
    hiring: 'document',
    general: 'capture'
  };
  return getLayer(map[intentId] || 'capture');
}
