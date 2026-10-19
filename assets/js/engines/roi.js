/**
 * TRL — The Right Lifestyle
 * engines/roi.js — automation opportunity model.
 *
 * Turns a client's own operating numbers into a prioritised, defensible
 * shortlist of automatable work. All outputs are *modelled from the inputs
 * the visitor supplies* — never presented as measured client results.
 */

export const ENGINE_VERSION = '1.1.0';

export const DEFAULT_INPUT = {
  teamSize: 4,
  hoursPerWeek: 20,
  hourlyCost: 1200,
  errorRate: 0.12,
  currency: 'PKR',
  tasks: [
    { name: 'Answering inbound enquiries', hours: 12, repetitiveness: 5, complexity: 2, errorRate: 0.15 },
    { name: 'Manual data entry into spreadsheets', hours: 10, repetitiveness: 5, complexity: 2, errorRate: 0.22 },
    { name: 'Preparing quotes and invoices', hours: 7, repetitiveness: 4, complexity: 3, errorRate: 0.1 },
    { name: 'Chasing overdue payments', hours: 5, repetitiveness: 4, complexity: 2, errorRate: 0.08 },
    { name: 'Reconciling delivery records', hours: 6, repetitiveness: 3, complexity: 4, errorRate: 0.18 }
  ]
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Share of a task that can realistically be automated.
 * Repetitive work with simple, rule-based decisions is the highest candidate;
 * judgement-heavy, exception-heavy work is not.
 */
export function automatableShare({ repetitiveness = 3, complexity = 3 }) {
  const rep = clamp(repetitiveness, 1, 5) / 5;
  const cpl = clamp(complexity, 1, 5);
  const share = rep * 0.88 - (cpl - 1) * 0.09;
  return clamp(share, 0.05, 0.9);
}

export function analyseTask(task, context) {
  const { hourlyCost, currency } = context;
  const hours = Math.max(0, Number(task.hours) || 0);
  const share = automatableShare(task);
  const monthlyHours = hours * share;
  const annualHours = monthlyHours * 12;
  const annualSaving = annualHours * hourlyCost;

  const errorRate = clamp(Number(task.errorRate) || 0, 0, 1);
  const currentAnnualErrors = hours * 52 * errorRate;
  const errorReduction = clamp(share * 0.65, 0, 0.8);
  const errorSaving = currentAnnualErrors * errorReduction * hourlyCost * 0.35;

  const effort = clamp(((task.complexity || 3) - 1) * 22 + (5 - (task.repetitiveness || 3)) * 8, 5, 100);
  const totalBenefit = annualSaving + errorSaving;
  const impact = clamp(Math.round((totalBenefit / 400000) * 100), 2, 100);

  const buildHours = 12 + (task.complexity || 3) * 14;
  const buildCost = buildHours * hourlyCost * 1.6;
  const monthlySaving = totalBenefit / 12;
  const paybackMonths = monthlySaving > 0 ? Math.max(0.5, buildCost / monthlySaving) : 999;

  let quadrant = 'low';
  let verdict = 'Leave alone';
  let rationale = 'The value here does not justify the build effort. Automate it only if volume grows.';
  if (impact >= 50 && effort <= 55) {
    quadrant = 'high';
    verdict = 'Automate now';
    rationale = 'High value, contained effort. This is the first thing to build.';
  } else if (impact >= 50 && effort > 55) {
    quadrant = 'planned';
    verdict = 'Plan and phase';
    rationale = 'High value but non-trivial. Scope it carefully and stage the rollout.';
  } else if (impact < 50 && effort <= 55) {
    quadrant = 'quick';
    verdict = 'Quick win';
    rationale = 'Small gain, low effort. Bundle it with a larger build rather than starting alone.';
  }

  return {
    name: task.name,
    hoursPerWeek: hours,
    automatableShare: Number(share.toFixed(2)),
    automatableHoursPerWeek: Number(monthlyHours.toFixed(1)),
    annualHoursSaved: Math.round(annualHours),
    annualSaving: Math.round(annualSaving),
    annualErrorSaving: Math.round(errorSaving),
    totalAnnualBenefit: Math.round(totalBenefit),
    effort: Math.round(effort),
    impact,
    quadrant,
    verdict,
    rationale,
    buildCost: Math.round(buildCost),
    paybackMonths: Math.round(paybackMonths * 10) / 10,
    currency
  };
}

export function analyseOpportunity(input = {}) {
  const merged = {
    ...DEFAULT_INPUT,
    ...input,
    tasks: (input.tasks && input.tasks.length ? input.tasks : DEFAULT_INPUT.tasks)
  };
  const context = {
    hourlyCost: Math.max(1, Number(merged.hourlyCost) || DEFAULT_INPUT.hourlyCost),
    currency: merged.currency || 'PKR'
  };

  const candidates = merged.tasks.map((task) => analyseTask(task, context));
  const ranked = [...candidates].sort((a, b) => b.totalAnnualBenefit - a.totalAnnualBenefit);

  const totalAnnualBenefit = candidates.reduce((sum, c) => sum + c.totalAnnualBenefit, 0);
  const totalAnnualHours = candidates.reduce((sum, c) => sum + c.annualHoursSaved, 0);
  const totalHoursNow = candidates.reduce((sum, c) => sum + c.hoursPerWeek, 0);
  const totalHoursSavedPerWeek = candidates.reduce((sum, c) => sum + c.automatableHoursPerWeek, 0);
  const quickest = ranked.find((c) => c.paybackMonths < 24) || ranked[0] || null;

  const headcountFreed = merged.teamSize > 0
    ? (totalHoursSavedPerWeek * 52) / (merged.teamSize * 40)
    : 0;

  return {
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    inputs: merged,
    candidates,
    ranked,
    totals: {
      weeklyHoursNow: Math.round(totalHoursNow * 10) / 10,
      weeklyHoursRecovered: Math.round(totalHoursSavedPerWeek * 10) / 10,
      annualHoursRecovered: Math.round(totalAnnualHours),
      annualBenefit: Math.round(totalAnnualBenefit),
      currency: context.currency,
      capacityFreedEquivalent: Math.round(headcountFreed * 100) / 100,
      fastestPaybackMonths: quickest ? quickest.paybackMonths : null
    },
    disclaimer:
      'Figures are modelled from the numbers entered above using TRL’s standard effort and cost assumptions. '
      + 'They are an estimate for prioritisation, not a guarantee, and are not results measured from a client engagement.'
  };
}

export const QUADRANTS = [
  { key: 'high', label: 'Automate now', hint: 'High impact, contained effort.' },
  { key: 'quick', label: 'Quick win', hint: 'Low effort, modest impact.' },
  { key: 'planned', label: 'Plan and phase', hint: 'High impact, higher effort.' },
  { key: 'low', label: 'Leave alone', hint: 'Not worth automating yet.' }
];
