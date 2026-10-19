/**
 * TRL — The Right Lifestyle
 * server/src/store.mjs — file-backed JSON store.
 *
 * Deliberately simple and dependency-free: a single JSON file, loaded into
 * memory on boot and written back atomically (temp file + rename) after
 * every mutation. Swap this module for a database adapter if the volume
 * ever justifies it — the rest of the server only talks to this interface.
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.mjs';

export class JsonStore {
  constructor({ file, initial = { leads: [], subscribers: [] } } = {}) {
    this.file = file;
    this.initial = initial;
    this.state = structuredClone(initial);
    this.writeQueue = Promise.resolve();
  }

  async load() {
    try {
      if (!existsSync(this.file)) {
        await this.#ensureDir();
        await this.#write(this.state);
        logger.info('store.created', { file: this.file });
        return this.state;
      }
      const raw = await readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = { ...structuredClone(this.initial), ...parsed };
      logger.info('store.loaded', { file: this.file, leads: (this.state.leads || []).length });
      return this.state;
    } catch (err) {
      logger.error('store.load_failed', { file: this.file, error: err.message });
      this.state = structuredClone(this.initial);
      return this.state;
    }
  }

  async #ensureDir() {
    await mkdir(dirname(this.file), { recursive: true });
  }

  async #write(state) {
    await this.#ensureDir();
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmp, this.file);
  }

  /** Serialised write so concurrent requests cannot interleave. */
  #persist() {
    this.writeQueue = this.writeQueue
      .then(() => this.#write(this.state))
      .catch((err) => logger.error('store.write_failed', { file: this.file, error: err.message }));
    return this.writeQueue;
  }

  listLeads({ stage = null, limit = 100 } = {}) {
    const leads = this.state.leads || [];
    const filtered = stage ? leads.filter((lead) => lead.stage === stage) : leads;
    return filtered.slice(-limit).reverse();
  }

  getLead(id) {
    return (this.state.leads || []).find((lead) => lead.id === id) || null;
  }

  async createLead(payload) {
    const now = new Date().toISOString();
    const lead = {
      id: randomUUID(),
      ...payload,
      stage: 'intake',
      createdAt: now,
      updatedAt: now
    };
    this.state.leads = [...(this.state.leads || []), lead];
    await this.#persist();
    return lead;
  }

  async updateLead(id, patch) {
    const leads = this.state.leads || [];
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return null;
    const updated = { ...leads[index], ...patch, id, updatedAt: new Date().toISOString() };
    leads[index] = updated;
    this.state.leads = leads;
    await this.#persist();
    return updated;
  }

  /** Remove a lead. Returns the removed record, or null when it never existed. */
  async deleteLead(id) {
    const leads = this.state.leads || [];
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return null;
    const [removed] = leads.splice(index, 1);
    this.state.leads = leads;
    await this.#persist();
    return removed;
  }

  /** Append a history entry so stage moves are auditable, not overwritten. */
  async appendHistory(id, entry) {
    const lead = this.getLead(id);
    if (!lead) return null;
    const history = [...(lead.history || []), { at: new Date().toISOString(), ...entry }].slice(-50);
    return this.updateLead(id, { history });
  }

  listSubscribers({ topic = null, limit = 500 } = {}) {
    const subscribers = this.state.subscribers || [];
    const filtered = topic ? subscribers.filter((sub) => sub.topic === topic) : subscribers;
    return filtered.slice(-limit).reverse();
  }

  /** Idempotent subscribe: a repeat address updates the topic instead of duplicating. */
  async subscribe({ email, topic = 'general' }) {
    const subscribers = this.state.subscribers || [];
    const existing = subscribers.find((sub) => sub.email === email);
    const now = new Date().toISOString();
    if (existing) {
      existing.topic = topic;
      existing.updatedAt = now;
      this.state.subscribers = subscribers;
      await this.#persist();
      return { subscriber: existing, created: false };
    }
    const subscriber = { email, topic, createdAt: now, updatedAt: now };
    this.state.subscribers = [...subscribers, subscriber];
    await this.#persist();
    return { subscriber, created: true };
  }

  metrics() {
    const leads = this.state.leads || [];
    const byStage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {});
    const byIntent = leads.reduce((acc, lead) => {
      const intent = lead.triage?.intent || 'unclassified';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});

    const last7 = leads.filter((lead) => {
      const age = Date.now() - new Date(lead.createdAt).getTime();
      return Number.isFinite(age) && age < 7 * 24 * 60 * 60 * 1000;
    });

    return {
      total: leads.length,
      byStage,
      byIntent,
      subscribers: (this.state.subscribers || []).length,
      last7Days: last7.length,
      newest: leads.length ? leads[leads.length - 1].createdAt : null
    };
  }
}

export function createStore({ dataDir }) {
  return new JsonStore({
    file: join(dataDir, 'leads.json'),
    initial: { leads: [], subscribers: [] }
  });
}
