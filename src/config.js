import dotenv from 'dotenv';
dotenv.config();

export const config = {
  aiProvider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  systemPrompt:
    process.env.SYSTEM_PROMPT ||
    'You are a personal WhatsApp executive assistant. You schedule tasks, draft concise messages, and reply with a professional tone. Do not use emojis.',
  autoRead: process.env.AUTO_READ !== 'false',
  respondToGroups: process.env.RESPOND_TO_GROUPS === 'true',
  ignoreSelf: process.env.IGNORE_SELF !== 'false',
  maxHistoryTurns: parseInt(process.env.MAX_HISTORY_TURNS || '10', 10),
};

export function validateConfig() {
  if (config.aiProvider === 'gemini') {
    if (!config.gemini.apiKey || config.gemini.apiKey === 'your_gemini_api_key_here') {
      console.warn(
        '⚠️ Warning: GEMINI_API_KEY is not configured in .env. Please add your key from https://aistudio.google.com/'
      );
    }
  } else if (config.aiProvider === 'openai') {
    if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
      console.warn(
        '⚠️ Warning: OPENAI_API_KEY is not configured in .env. Please add your key from https://platform.openai.com/'
      );
    }
  } else {
    throw new Error(
      `Invalid AI_PROVIDER "${config.aiProvider}". Must be either "gemini" or "openai".`
    );
  }
}
