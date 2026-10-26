const os = require('os');

module.exports = [
  {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    desc: 'Check bot latency and status',
    cooldownMs: 1000,
    run: async (ctx) => {
      const start = Date.now();
      await ctx.reply('📡 *Pinging...*');
      const latency = Date.now() - start;

      const registry = require('./index');
      const count = registry.all().length;

      await ctx.reply(
        `🏓 *Pong!*\n\n` +
        `⏱️ Latency: *${latency}ms*\n` +
        `📋 Commands: *${count}*\n` +
        `💾 Storage: *MongoDB*\n` +
        `🔌 Status: *${ctx.sock.user ? 'CONNECTED' : 'DISCONNECTED'}*`
      );
    }
  },

  {
    name: 'help',
    aliases: ['h'],
    category: 'general',
    desc: 'Show quick help',
    cooldownMs: 2000,
    run: async (ctx) => {
      const { BOT_NAME, OWNER_NAME } = process.env;
      const bot = BOT_NAME || 'HDM BOT';
      const owner = OWNER_NAME || 'Owner';
      const p = ctx.prefix;

      await ctx.reply(
        `╔═══════════════════════╗\n` +
        `║   📚 *${bot} HELP*   ║\n` +
        `╚═══════════════════════╝\n\n` +
        `📌 *Prefix:* \`${p}\`\n\n` +
        `🔹 *Quick Commands:*\n` +
        `${p}menu - Full command list\n` +
        `${p}ping - Check latency\n` +
        `${p}info - Bot information\n` +
        `${p}owner - Owner details\n` +
        `${p}help - This message\n\n` +
        `💡 *Tip:* Use \`${p}menu\` for the full list!\n\n` +
        `✨ *Powered by ${owner}*`
      );
    }
  },

  {
    name: 'menu',
    aliases: ['m', 'commands'],
    category: 'general',
    desc: 'Show all commands by category',
    cooldownMs: 2000,
    run: async (ctx) => {
      const menu = require('../handlers/menu');
      const text = await menu.build(ctx.sessionId, ctx.prefix);
      await ctx.reply(text);
    }
  },

  {
    name: 'info',
    aliases: ['about', 'botinfo'],
    category: 'general',
    desc: 'Bot information and stats',
    cooldownMs: 3000,
    run: async (ctx) => {
      const { BOT_NAME, OWNER_NAME } = process.env;
      const bot = BOT_NAME || 'HDM BOT';
      const owner = OWNER_NAME || 'Owner';

      const registry = require('./index');
      const count = registry.all().length;

      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      const mem = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;

      await ctx.reply(
        `╔═══════════════════════╗\n` +
        `║   🤖 *BOT INFORMATION*  ║\n` +
        `╚═══════════════════════╝\n\n` +
        `👤 *Name:* ${bot}\n` +
        `👑 *Owner:* ${owner}\n` +
        `📌 *Prefix:* \`${ctx.prefix}\`\n` +
        `📊 *Commands:* ${count}\n` +
        `⏱️ *Uptime:* ${h}h ${m}m ${s}s\n` +
        `💾 *Memory:* ${mem}MB\n` +
        `🖥️ *Platform:* ${os.platform()} ${os.arch()}\n` +
        `📦 *Storage:* MongoDB\n` +
        `🔌 *Status:* ${ctx.sock.user ? 'CONNECTED' : 'DISCONNECTED'}\n\n` +
        `✨ *Powered by ${owner}*`
      );
    }
  },

  {
    name: 'status',
    aliases: ['conn', 'connection'],
    category: 'general',
    desc: 'Connection status',
    cooldownMs: 2000,
    run: async (ctx) => {
      const connected = !!ctx.sock.user;
      await ctx.reply(
        `📊 *Status*\n\n` +
        `WhatsApp: ${connected ? '✅ Connected' : '❌ Disconnected'}\n` +
        `Storage: ☁️ MongoDB\n` +
        `Prefix: \`${ctx.prefix}\`\n` +
        `Session: \`${ctx.sessionId}\``
      );
    }
  },

  {
    name: 'getid',
    aliases: ['id', 'myid'],
    category: 'general',
    desc: 'Get your JID and chat info',
    cooldownMs: 2000,
    run: async (ctx) => {
      const jid = require('../../utils/jid');
      const senderNum = jid.fromJid(ctx.senderJid);
      const chatNum = jid.fromJid(ctx.chatJid);

      let text = `🆔 *Your Info*\n\n📱 Number: *${senderNum || 'unknown'}*\n`;

      if (ctx.isGroup) {
        text += `👥 Group ID: \`${ctx.chatJid}\`\n`;
        text += `👤 Sender JID: \`${ctx.senderJid}\`\n`;
      }

      text += `🔖 Chat Type: ${ctx.isGroup ? 'Group' : 'Private'}`;

      await ctx.reply(text);
    }
  },

  {
    name: 'echo',
    aliases: ['say'],
    category: 'general',
    desc: 'Repeat a message back',
    usage: '<message>',
    cooldownMs: 1000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}echo <message>\``);
      }
      await ctx.reply(ctx.args.join(' '));
    }
  },

  {
    name: 'test',
    aliases: ['alive', 'working'],
    category: 'general',
    desc: 'Test if the bot is working',
    cooldownMs: 1000,
    run: async (ctx) => {
      const { BOT_NAME } = process.env;
      const bot = BOT_NAME || 'HDM BOT';
      await ctx.reply(
        `✅ *Bot is working!*\n\n` +
        `🤖 ${bot}\n` +
        `⏱️ ${new Date().toLocaleString()}\n` +
        `📌 Prefix: \`${ctx.prefix}\`\n\n` +
        `Test successful! 🎉`
      );
    }
  },

  {
    name: 'rules',
    category: 'general',
    desc: 'Show bot usage rules',
    cooldownMs: 3000,
    run: async (ctx) => {
      await ctx.reply(
        `╔═══════════════════════╗\n` +
        `║   📜 *BOT RULES*       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `1. 🤝 Respect all users\n` +
        `2. 🚫 No spam or abuse\n` +
        `3. 📵 No illegal content\n` +
        `4. 🤖 Don't abuse AI commands\n` +
        `5. 👑 Follow admin instructions\n` +
        `6. 🔒 Keep session secure\n\n` +
        `⚠️ Violations may result in ban.\n` +
        `✨ *Powered by HDM*`
      );
    }
  },

  {
    name: 'owner',
    aliases: ['contact', 'creator'],
    category: 'general',
    desc: 'Show owner contact info',
    cooldownMs: 5000,
    run: async (ctx) => {
      const env = require('../../config/env');
      await ctx.reply(
        `╔═══════════════════════╗\n` +
        `║   👑 *BOT OWNER*       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `👤 *Name:* ${env.OWNER_NAME}\n` +
        `🤖 *Bot:* ${env.BOT_NAME}\n` +
        `📱 *Contact:* +${env.OWNER_NUMBER}\n\n` +
        `📞 *For:*\n` +
        `• Bug reports\n` +
        `• Feature requests\n` +
        `• Partnership`
      );
    }
  }
];