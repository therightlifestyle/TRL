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
  constructor({ file, initial = { leads: [] } } = {}) {
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

  metrics() {
    const leads = this.state.leads || [];
    const byStage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {});
    return {
      total: leads.length,
      byStage,
      newest: leads.length ? leads[leads.length - 1].createdAt : null
    };
  }
}

export function createStore({ dataDir }) {
  return new JsonStore({
    file: join(dataDir, 'leads.json'),
    initial: { leads: [] }
  });
}
