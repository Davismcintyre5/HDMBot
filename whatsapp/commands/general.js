const os = require('os');

module.exports = [
  {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    desc: 'Check if the bot is alive',
    usage: '',
    cooldownMs: 1000,
    run: async (ctx) => {
      const start = Date.now();
      await ctx.reply('🏓 Pong!');
      const latency = Date.now() - start;
      await ctx.reply(`⏱ Latency: ${latency}ms`);
    }
  },
  {
    name: 'alive',
    aliases: ['status'],
    category: 'general',
    desc: 'Check bot uptime',
    run: async (ctx) => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      await ctx.reply(
        `✅ *${process.env.BOT_NAME || 'HDM BOT'}* is alive\n\n` +
        `⏱ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
        `💾 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\n` +
        `🖥 Platform: ${os.platform()}`
      );
    }
  },
  {
    name: 'menu',
    aliases: ['help', 'commands'],
    category: 'general',
    desc: 'List all available commands',
    run: async (ctx) => {
      const menu = require('../handlers/menu');
      const text = await menu.build(ctx.sessionId, ctx.prefix);
      await ctx.reply(text);
    }
  }
];