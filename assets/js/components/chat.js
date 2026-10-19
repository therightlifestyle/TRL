/**
 * TRL — The Right Lifestyle
 * components/chat.js — assistant chat surface.
 *
 * The assistant answers from TRL's published knowledge base using the local
 * retrieval engine. Nothing typed is transmitted or stored.
 */

import { el, escapeHtml } from '../core/dom.js';
import { ask, starterQuestions } from '../engines/assistant.js';
import { icon } from './icons.js';

function renderMarkdown(text = '') {
  const blocks = String(text).split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n');
    if (lines.every((line) => /^\s*[-•]\s+/.test(line))) {
      const items = lines
        .map((line) => `<li>${inline(line.replace(/^\s*[-•]\s+/, ''))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

function inline(text = '') {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function createChat(root, { knowledge = [], greeting = null, onAsk = null } = {}) {
  root.classList.add('chat');
  root.innerHTML = '';

  const log = el('div', { class: 'chat-log', role: 'log', 'aria-live': 'polite' });
  const input = el('textarea', {
    rows: '1',
    placeholder: 'Ask about services, pricing, process or timelines…',
    'aria-label': 'Message the TRL assistant'
  });
  const sendBtn = el('button', { class: 'btn btn-sm btn-gold', type: 'button', 'aria-label': 'Send message' },
    icon('send', 15));
  const form = el('form', { class: 'chat-input' }, input, sendBtn);
  const suggestions = el('div', { class: 'chat-sugs' });

  root.append(log, suggestions, form);

  function addMessage(role, text, meta = {}) {
    const node = el('div', { class: `msg ${role}` });
    node.innerHTML = renderMarkdown(text);
    if (meta.sources?.length) {
      const src = el('div', { class: 'msg-src' },
        `Source: ${meta.sources.map((s) => s.title).join(' · ')}`);
      node.append(src);
    }
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function showTyping() {
    const node = el('div', { class: 'msg bot' }, '<span class="typing"><i></i><i></i><i></i></span>');
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function setSuggestions(list = []) {
    suggestions.innerHTML = '';
    list.slice(0, 4).forEach((question) => {
      suggestions.append(el('button', {
        type: 'button',
        onclick: () => submit(question)
      }, question));
    });
  }

  function submit(question) {
    const text = String(question ?? input.value).trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    const typing = showTyping();

    // Small deliberate delay so the answer does not appear instantly — it
    // reads as a considered response rather than a lookup.
    window.setTimeout(() => {
      typing.remove();
      const result = ask(text, knowledge);
      addMessage('bot', result.answer, { sources: result.sources });
      setSuggestions(result.suggestions);
      onAsk?.(result);
    }, 420);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });

  setSuggestions(starterQuestions(knowledge));

  if (greeting) addMessage('bot', greeting);

  return { submit, addMessage, setSuggestions, log };
}
