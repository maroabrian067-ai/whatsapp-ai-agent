import { config } from './config.js';

class ConversationMemory {
  constructor(maxTurns = 10, ttlMinutes = 30) {
    this.maxTurns = maxTurns;
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.sessions = new Map();
  }

  getSession(userId) {
    const now = Date.now();
    const session = this.sessions.get(userId);

    if (!session || now - session.lastActivity > this.ttlMs) {
      const newSession = {
        history: [],
        lastActivity: now,
      };
      this.sessions.set(userId, newSession);
      return newSession;
    }

    session.lastActivity = now;
    return session;
  }

  getHistory(userId) {
    return this.getSession(userId).history;
  }

  addUserMessage(userId, text) {
    const session = this.getSession(userId);
    session.history.push({ role: 'user', content: text });
    this.trim(session);
  }

  addAssistantMessage(userId, text) {
    const session = this.getSession(userId);
    session.history.push({ role: 'assistant', content: text });
    this.trim(session);
  }

  clearHistory(userId) {
    this.sessions.delete(userId);
  }

  trim(session) {
    const maxEntries = this.maxTurns * 2;
    if (session.history.length > maxEntries) {
      session.history = session.history.slice(session.history.length - maxEntries);
    }
  }
}

export const memory = new ConversationMemory(config.maxHistoryTurns, 30);
