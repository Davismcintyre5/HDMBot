const axios = require('axios');
const env = require('../../config/env');

async function queryHDMAI(prompt) {
  const url = 'https://hdmaiserver.pxxl.click/api/v1/completion';
  const key = env.HDM_AI_API_KEY || '';

  if (!key) {
    return { ok: false, error: '❌ HDM AI API key not set.' };
  }

  try {
    const { data } = await axios.post(
      url,
      {
        message: prompt,
        system_prompt: `You are ${env.BOT_NAME}, a helpful WhatsApp assistant. Keep responses concise and friendly.`
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    if (data.success && data.data?.reply) {
      return { ok: true, text: data.data.reply };
    }
    return { ok: false, error: `❌ HDM AI: ${data.message || 'No response'}` };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return { ok: false, error: `❌ HDM AI: ${msg}` };
  }
}

async function queryDeepSeek(prompt) {
  const key = env.DEEPSEEK_API_KEY;
  if (!key) return { ok: false, error: '❌ DeepSeek API key not set.' };

  try {
    const { data } = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return { ok: true, text: data.choices[0].message.content };
  } catch (err) {
    return { ok: false, error: `❌ DeepSeek: ${err.message}` };
  }
}

async function queryGemini(prompt) {
  const key = env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: '❌ Gemini API key not set.' };

  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 30000 }
    );
    return { ok: true, text: data.candidates[0].content.parts[0].text };
  } catch (err) {
    return { ok: false, error: `❌ Gemini: ${err.message}` };
  }
}

async function queryChatGPT(prompt) {
  const key = env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: '❌ ChatGPT API key not set.' };

  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return { ok: true, text: data.choices[0].message.content };
  } catch (err) {
    return { ok: false, error: `❌ ChatGPT: ${err.message}` };
  }
}

async function queryGrok(prompt) {
  const key = env.GROK_API_KEY;
  if (!key) return { ok: false, error: '❌ Grok API key not set.' };

  try {
    const { data } = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return { ok: true, text: data.choices[0].message.content };
  } catch (err) {
    return { ok: false, error: `❌ Grok: ${err.message}` };
  }
}

async function queryGroq(prompt) {
  const key = env.GROQ_API_KEY;
  if (!key) return { ok: false, error: '❌ Groq API key not set.' };

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return { ok: true, text: data.choices[0].message.content };
  } catch (err) {
    return { ok: false, error: `❌ Groq: ${err.message}` };
  }
}

const PROVIDERS = {
  hdm: { name: 'HDM AI', query: queryHDMAI, thinking: '🤖 Thinking...' },
  deepseek: { name: 'DeepSeek', query: queryDeepSeek, thinking: '🤖 DeepSeek thinking...' },
  gemini: { name: 'Gemini', query: queryGemini, thinking: '🧠 Gemini thinking...' },
  chatgpt: { name: 'ChatGPT', query: queryChatGPT, thinking: '💬 ChatGPT thinking...' },
  grok: { name: 'Grok', query: queryGrok, thinking: '🚀 Grok thinking...' },
  groq: { name: 'Groq', query: queryGroq, thinking: '⚡ Groq thinking...' }
};

function makeCommand(providerId, meta) {
  const provider = PROVIDERS[providerId];

  return {
    name: meta.name,
    aliases: meta.aliases || [],
    category: 'ai',
    desc: meta.desc,
    usage: '<question>',
    cooldownMs: 5000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}${meta.name} <question>\``);
      }

      const prompt = ctx.args.join(' ').trim();
      if (!prompt) return ctx.reply('❌ Provide a question.');

      await ctx.reply(provider.thinking);
      const result = await provider.query(prompt);

      if (!result.ok) return ctx.reply(result.error);

      const text = String(result.text || '').trim().slice(0, 4000);
      if (!text) return ctx.reply(`❌ ${provider.name}: empty response.`);

      await ctx.reply(text);
    }
  };
}

module.exports = [
  makeCommand('hdm', {
    name: 'ai',
    aliases: ['ask'],
    desc: 'Ask AI (HDM AI)'
  }),
  makeCommand('hdm', {
    name: 'hdmai',
    desc: 'Ask HDM AI'
  }),
  makeCommand('deepseek', {
    name: 'deepseek',
    aliases: ['ds'],
    desc: 'Ask DeepSeek AI'
  }),
  makeCommand('gemini', {
    name: 'gemini',
    desc: 'Ask Gemini AI'
  }),
  makeCommand('chatgpt', {
    name: 'chatgpt',
    aliases: ['gpt'],
    desc: 'Ask ChatGPT'
  }),
  makeCommand('grok', {
    name: 'grok',
    desc: 'Ask Grok AI'
  }),
  makeCommand('groq', {
    name: 'groq',
    desc: 'Ask Groq AI'
  })
];