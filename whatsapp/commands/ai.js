const axios = require('axios');
const env = require('../../config/env');

const PROVIDERS = {
  hdm: {
    name: 'HDM AI',
    url: 'https://hdmaiserver.pxxl.click/api/v1/projects/general/public-chat',
    keyEnv: 'HDM_AI_API_KEY',
    kind: 'hdm'
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY',
    kind: 'openai'
  },
  gemini: {
    name: 'Gemini',
    model: 'gemini-1.5-flash',
    keyEnv: 'GEMINI_API_KEY',
    kind: 'gemini'
  },
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    keyEnv: 'OPENAI_API_KEY',
    kind: 'openai'
  },
  grok: {
    name: 'Grok',
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-latest',
    keyEnv: 'GROK_API_KEY',
    kind: 'openai'
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY',
    kind: 'openai'
  }
};

function getKey(keyEnv) {
  return process.env[keyEnv] || '';
}

async function callProvider(providerId, prompt) {
  const p = PROVIDERS[providerId];
  if (!p) throw new Error(`Unknown provider: ${providerId}`);

  const key = getKey(p.keyEnv);
  if (!key) throw new Error(`${p.name} API key not configured (${p.keyEnv})`);

  const systemPrompt = `${env.BOT_NAME} is a helpful WhatsApp assistant. Keep responses concise and friendly.`;

  if (p.kind === 'hdm') {
    const { data } = await axios.post(
      p.url,
      { message: prompt, system_prompt: systemPrompt },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    if (data.success && data.data?.reply) return data.data.reply;
    throw new Error(data.message || 'HDM AI: no response');
  }

  if (p.kind === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent?key=${key}`;
    const { data } = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
      },
      { timeout: 30000 }
    );
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini: empty response');
    return text;
  }

  const { data } = await axios.post(
    p.url,
    {
      model: p.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
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

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${p.name}: empty response`);
  return text;
}

function makeCommand(providerId, meta) {
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
      if (!prompt) {
        return ctx.reply('❌ Provide a question.');
      }

      await ctx.reply(meta.thinkingMessage || '🤖 Thinking...');

      try {
        const reply = await callProvider(providerId, prompt);
        const trimmed = String(reply).trim().slice(0, 4000);
        await ctx.reply(trimmed);
      } catch (err) {
        await ctx.reply(`❌ ${err.message}`);
      }
    }
  };
}

module.exports = [
  makeCommand('hdm', {
    name: 'ai',
    aliases: ['ask'],
    desc: 'Ask AI (default: HDM AI)',
    thinkingMessage: '🤖 Thinking...'
  }),
  makeCommand('hdm', {
    name: 'hdmai',
    desc: 'Ask HDM AI',
    thinkingMessage: '🤖 HDM AI thinking...'
  }),
  makeCommand('deepseek', {
    name: 'deepseek',
    aliases: ['ds'],
    desc: 'Ask DeepSeek AI',
    thinkingMessage: '🤖 DeepSeek thinking...'
  }),
  makeCommand('gemini', {
    name: 'gemini',
    desc: 'Ask Gemini AI',
    thinkingMessage: '🧠 Gemini thinking...'
  }),
  makeCommand('chatgpt', {
    name: 'chatgpt',
    aliases: ['gpt'],
    desc: 'Ask ChatGPT',
    thinkingMessage: '💬 ChatGPT thinking...'
  }),
  makeCommand('grok', {
    name: 'grok',
    desc: 'Ask Grok AI',
    thinkingMessage: '🚀 Grok thinking...'
  }),
  makeCommand('groq', {
    name: 'groq',
    desc: 'Ask Groq AI',
    thinkingMessage: '⚡ Groq thinking...'
  })
];