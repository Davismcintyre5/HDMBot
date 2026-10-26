const state = require('../state');
const jid = require('../../utils/jid');

function normalizeTarget(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

module.exports = [
  {
    name: 'addbotadmin',
    aliases: ['addadmin'],
    category: 'admin',
    desc: 'Add a bot admin (sudo)',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}addbotadmin <number>\``);
      }
      const admins = state.getGlobalSetting('adminNumbers', []);
      if (admins.includes(target)) {
        return ctx.reply('❌ Already a bot admin.');
      }
      admins.push(target);
      state.setGlobalSetting('adminNumbers', admins);
      await ctx.reply(`✅ @${target} added as bot admin.`, {
        mentions: [jid.toJid(target)]
      });
    }
  },

  {
    name: 'listbotadmins',
    aliases: ['admins'],
    category: 'admin',
    desc: 'List all bot admins',
    cooldownMs: 3000,
    run: async (ctx) => {
      const env = require('../../config/env');
      const admins = state.getGlobalSetting('adminNumbers', []);
      const all = [env.OWNER_NUMBER, ...admins].filter(Boolean);

      const lines = [`👑 *Bot Admins (${all.length})*\n`];
      if (all.length === 0) {
        lines.push('_None configured._');
      } else {
        all.forEach((n, i) => {
          const tag = i === 0 ? ' (owner)' : '';
          lines.push(`${i + 1}. ${n}${tag}`);
        });
      }
      await ctx.reply(lines.join('\n'));
    }
  },

  {
    name: 'removebotadmin',
    aliases: ['deladmin', 'rmadmin'],
    category: 'admin',
    desc: 'Remove a bot admin',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}removebotadmin <number>\``);
      }
      const admins = state.getGlobalSetting('adminNumbers', []);
      const idx = admins.indexOf(target);
      if (idx === -1) return ctx.reply('❌ Not a bot admin.');
      admins.splice(idx, 1);
      state.setGlobalSetting('adminNumbers', admins);
      await ctx.reply(`✅ @${target} removed.`, {
        mentions: [jid.toJid(target)]
      });
    }
  },

  {
    name: 'addsudo',
    aliases: ['sudo'],
    category: 'admin',
    desc: 'Add a super admin',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}addsudo <number>\``);
      }
      const admins = state.getGlobalSetting('adminNumbers', []);
      if (!admins.includes(target)) admins.push(target);
      state.setGlobalSetting('adminNumbers', admins);
      await ctx.reply(`✅ @${target} added as super admin.`, {
        mentions: [jid.toJid(target)]
      });
    }
  },

  {
    name: 'setsudo',
    aliases: ['setowner'],
    category: 'admin',
    desc: 'Change bot owner number',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}setsudo <number>\``);
      }
      state.setGlobalSetting('ownerNumber', target);
      await ctx.reply(
        `✅ Owner changed to @${target}\n\n_Note: env OWNER_NUMBER still takes precedence on restart._`,
        { mentions: [jid.toJid(target)] }
      );
    }
  },

  {
    name: 'ownerinfo',
    aliases: ['whoami'],
    category: 'admin',
    desc: 'Show current owner info',
    cooldownMs: 5000,
    run: async (ctx) => {
      const env = require('../../config/env');
      const owner = state.getGlobalSetting('ownerNumber', env.OWNER_NUMBER);
      await ctx.reply(
        `👑 *Owner Info*\n\n` +
        `🤖 *Bot:* ${env.BOT_NAME}\n` +
        `👤 *Name:* ${env.OWNER_NAME}\n` +
        `📱 *Number:* +${owner}`
      );
    }
  },

  {
    name: 'antidelete',
    aliases: ['antidel', 'ad'],
    category: 'admin',
    desc: 'Toggle anti-delete (recover deleted messages)',
    usage: 'on|off|status',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(ctx.sessionId, 'anti_delete');

      if (!action || action === 'status') {
        return ctx.reply(`🛡️ Anti-delete: *${current ? 'ON' : 'OFF'}*`);
      }

      if (['on', 'enable', '1', 'true'].includes(action)) {
        if (current) return ctx.reply('Already ON.');
        await ctx.settings.set(ctx.sessionId, 'anti_delete', true, ctx.senderJid);
        return ctx.reply('🛡️ Anti-delete *enabled*');
      }

      if (['off', 'disable', '0', 'false'].includes(action)) {
        if (!current) return ctx.reply('Already OFF.');
        await ctx.settings.set(ctx.sessionId, 'anti_delete', false, ctx.senderJid);
        return ctx.reply('🛡️ Anti-delete *disabled*');
      }

      return ctx.reply(`Usage: \`${ctx.prefix}antidelete on|off|status\``);
    }
  },

  {
    name: 'autoview',
    aliases: ['autoviewstatus', 'avs'],
    category: 'admin',
    desc: 'Auto-view WhatsApp statuses',
    usage: 'on|off|status',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(ctx.sessionId, 'autoview_status');

      if (!action || action === 'status') {
        return ctx.reply(`👁️ Auto-view status: *${current ? 'ON' : 'OFF'}*`);
      }

      if (['on', 'enable', '1', 'true'].includes(action)) {
        if (current) return ctx.reply('Auto-view is already ON.');
        await ctx.settings.set(ctx.sessionId, 'autoview_status', true, ctx.senderJid);
        return ctx.reply('👁️ Auto-view status *enabled*\n\n_Bot will view every new status instantly._');
      }

      if (['off', 'disable', '0', 'false'].includes(action)) {
        if (!current) return ctx.reply('Auto-view is already OFF.');
        await ctx.settings.set(ctx.sessionId, 'autoview_status', false, ctx.senderJid);
        return ctx.reply('👁️ Auto-view status *disabled*');
      }

      return ctx.reply(`Usage: \`${ctx.prefix}autoview on|off|status\``);
    }
  },

  {
    name: 'autoreact',
    aliases: ['autoreactstatus', 'ars'],
    category: 'admin',
    desc: 'Auto-react to WhatsApp statuses',
    usage: 'on|off|status',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(ctx.sessionId, 'autoreact_status');
      const emoji = await ctx.settings.getOrDefault(ctx.sessionId, 'status_reaction');

      if (!action || action === 'status') {
        return ctx.reply(
          `💚 Auto-react status: *${current ? 'ON' : 'OFF'}*\n` +
          `Current reaction: *${emoji}*\n\n` +
          `_Change reaction with_ \`${ctx.prefix}statusreaction 1|2|3\``
        );
      }

      if (['on', 'enable', '1', 'true'].includes(action)) {
        if (current) return ctx.reply('Auto-react is already ON.');
        await ctx.settings.set(ctx.sessionId, 'autoreact_status', true, ctx.senderJid);
        return ctx.reply(`💚 Auto-react status *enabled*\n\nReaction: *${emoji}*`);
      }

      if (['off', 'disable', '0', 'false'].includes(action)) {
        if (!current) return ctx.reply('Auto-react is already OFF.');
        await ctx.settings.set(ctx.sessionId, 'autoreact_status', false, ctx.senderJid);
        return ctx.reply('💚 Auto-react status *disabled*');
      }

      return ctx.reply(`Usage: \`${ctx.prefix}autoreact on|off|status\``);
    }
  },

  {
    name: 'statusreaction',
    aliases: ['sr', 'reactstatus'],
    category: 'admin',
    desc: 'Set auto-react emoji for statuses',
    usage: '1|2|3',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const map = { '1': '💚', '2': '😂', '3': '👍' };
      const labels = { '1': 'Green heart', '2': 'Laugh', '3': 'Thumbs up' };
      const arg = (ctx.args[0] || '').trim();

      if (!arg) {
        const current = await ctx.settings.getOrDefault(ctx.sessionId, 'status_reaction');
        return ctx.reply(
          `🎨 *Status Reaction*\n\n` +
          `Current: *${current}*\n\n` +
          `Options:\n` +
          `1. 💚 Green heart\n` +
          `2. 😂 Laugh\n` +
          `3. 👍 Thumbs up\n\n` +
          `Usage: \`${ctx.prefix}statusreaction 1|2|3\``
        );
      }

      if (!map[arg]) {
        return ctx.reply('❌ Invalid option. Use 1, 2, or 3.');
      }

      await ctx.settings.set(ctx.sessionId, 'status_reaction', map[arg], ctx.senderJid);
      const autoReact = await ctx.settings.getOrDefault(ctx.sessionId, 'autoreact_status');

      return ctx.reply(
        `✅ Status reaction set to *${map[arg]}* (${labels[arg]})\n\n` +
        `Auto-react is currently *${autoReact ? 'ON' : 'OFF'}*${autoReact ? '' : `\n_Enable it with_ \`${ctx.prefix}autoreact on\``}`
      );
    }
  },

  {
    name: 'setprefix',
    aliases: ['prefix'],
    category: 'admin',
    desc: 'Change command prefix for this session',
    usage: '<char>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const newPrefix = ctx.args[0];
      if (!newPrefix) {
        return ctx.reply(
          `Current prefix: \`${ctx.prefix}\`\nUsage: \`${ctx.prefix}setprefix <char>\``
        );
      }
      if (newPrefix.length !== 1 || !/^[!-/:-@\[-`{-~]$/.test(newPrefix)) {
        return ctx.reply('❌ Prefix must be a single ASCII punctuation character.');
      }
      if (newPrefix === ctx.prefix) {
        return ctx.reply('That is already the current prefix.');
      }
      await ctx.settings.set(ctx.sessionId, 'prefix', newPrefix, ctx.senderJid);
      await ctx.reply(
        `✅ Prefix changed to \`${newPrefix}\`\n\nExample: \`${newPrefix}help\``
      );
    }
  },

  {
    name: 'resetprefix',
    category: 'admin',
    desc: 'Reset prefix to default',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      await ctx.settings.reset(ctx.sessionId, 'prefix');
      const env = require('../../config/env');
      await ctx.reply(`✅ Prefix reset to default \`${env.DEFAULT_PREFIX}\``);
    }
  },

  {
    name: 'sync',
    aliases: ['backup'],
    category: 'admin',
    desc: 'Force session backup to MongoDB',
    ownerOnly: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      const sessionManager = require('../sessionManager');
      await sessionManager.syncToMongo(ctx.sessionId);
      await ctx.reply('✅ Session backed up to MongoDB.');
    }
  },

  {
    name: 'restart',
    category: 'admin',
    desc: 'Restart the bot process',
    ownerOnly: true,
    cooldownMs: 30000,
    run: async (ctx) => {
      await ctx.reply('🔄 Restarting in 2 seconds...');
      setTimeout(() => process.exit(0), 2000);
    }
  },

  {
    name: 'shutdown',
    category: 'admin',
    desc: 'Shut down the bot process',
    ownerOnly: true,
    cooldownMs: 30000,
    run: async (ctx) => {
      await ctx.reply('🛑 Shutting down in 2 seconds...');
      setTimeout(() => process.exit(0), 2000);
    }
  }
];