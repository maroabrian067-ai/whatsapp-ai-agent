import OpenAI from 'openai';
import { config } from './config.js';
import { memory } from './memory.js';

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && config.openai.apiKey) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

/**
 * Generate response using Google Gemini API
 */
async function generateWithGemini(userId, userMessage) {
  const apiKey = config.gemini.apiKey;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return 'Setup required: Please configure your GEMINI_API_KEY in the .env file to enable smart responses.';
  }

  const history = memory.getHistory(userId);
  const contents = history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const rawModel = config.gemini.model || 'gemini-1.5-flash';
  const cleanModel = rawModel.trim().replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: config.systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error('No response returned by Gemini model.');
  }

  return replyText.trim();
}

/**
 * Generate response using OpenAI ChatGPT API
 */
async function generateWithOpenAI(userId, userMessage) {
  const client = getOpenAIClient();
  if (!client) {
    return 'Setup required: Please configure your OPENAI_API_KEY in the .env file to enable smart responses.';
  }

  const history = memory.getHistory(userId);
  const messages = [
    { role: 'system', content: config.systemPrompt },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: userMessage },
  ];

  const completion = await client.chat.completions.create({
    model: config.openai.model || 'gpt-4o-mini',
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const replyText = completion.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error('No response returned by OpenAI model.');
  }

  return replyText.trim();
}

/**
 * Main AI dispatcher
 */
export async function generateSmartResponse(userId, userMessage) {
  const trimmed = userMessage.trim().toLowerCase();
  if (trimmed === '/reset' || trimmed === '/clear') {
    memory.clearHistory(userId);
    return 'Conversation reset: My memory of our previous messages has been cleared.';
  }

  if (trimmed === '/help') {
    return (
      `WhatsApp AI Agent Help\n\n` +
      `• Ask me anything directly in this chat\n` +
      `• /reset or /clear: Reset conversation memory\n` +
      `• /provider: Shows current AI provider (${config.aiProvider})\n` +
      `• Powered by ${config.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'}`
    );
  }

  if (trimmed === '/provider') {
    return `Current AI Provider: ${config.aiProvider.toUpperCase()}\nModel: ${
      config.aiProvider === 'gemini' ? config.gemini.model : config.openai.model
    }`;
  }

  let reply;
  try {
    if (config.aiProvider === 'openai') {
      reply = await generateWithOpenAI(userId, userMessage);
    } else {
      reply = await generateWithGemini(userId, userMessage);
    }

    memory.addUserMessage(userId, userMessage);
    memory.addAssistantMessage(userId, reply);

    return reply;
  } catch (error) {
    console.error(`[AI Error for ${userId}]:`, error.message);
    return `Sorry, I encountered an error while thinking: ${error.message}`;
  }
}
