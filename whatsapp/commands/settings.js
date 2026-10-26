const state = require('../state');

module.exports = [
  {
    name: 'setfooter',
    aliases: ['footer'],
    category: 'settings',
    desc: 'Set global footer text for bot replies',
    usage: '<text>',
    ownerOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}setfooter <text>\``);
      }
      await ctx.settings.set(
        ctx.sessionId,
        'footer',
        ctx.args.join(' '),
        ctx.senderJid
      );
      await ctx.reply('✅ Footer updated.');
    }
  },

  {
    name: 'mode',
    aliases: ['botmode'],
    category: 'settings',
    desc: 'Set bot mode (public/private)',
    usage: 'public|private',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const mode = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(ctx.sessionId, 'mode');

      if (!['public', 'private'].includes(mode)) {
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}mode public|private\`\nCurrent: *${current}*`
        );
      }

      await ctx.settings.set(ctx.sessionId, 'mode', mode, ctx.senderJid);
      await ctx.reply(`✅ Bot mode set to *${mode}*`);
    }
  },

  {
    name: 'alwaysonline',
    aliases: ['aon'],
    category: 'settings',
    desc: 'Toggle always-online presence',
    usage: 'on|off',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(
        ctx.sessionId,
        'always_online'
      );

      if (!['on', 'off'].includes(action)) {
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}alwaysonline on|off\`\nCurrent: *${current ? 'ON' : 'OFF'}*`
        );
      }

      await ctx.settings.set(
        ctx.sessionId,
        'always_online',
        action === 'on',
        ctx.senderJid
      );

      await ctx.reply(
        `✅ Always Online: *${action === 'on' ? 'ON' : 'OFF'}*`
      );
    }
  },

  {
    name: 'autoreply',
    aliases: ['ar'],
    category: 'settings',
    desc: 'Toggle auto-reply for unhandled messages',
    usage: 'on|off',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(
        ctx.sessionId,
        'auto_reply'
      );

      if (!['on', 'off'].includes(action)) {
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}autoreply on|off\`\nCurrent: *${current ? 'ON' : 'OFF'}*`
        );
      }

      await ctx.settings.set(
        ctx.sessionId,
        'auto_reply',
        action === 'on',
        ctx.senderJid
      );

      await ctx.reply(
        `✅ Auto-reply: *${action === 'on' ? 'ON' : 'OFF'}*`
      );
    }
  },

  {
    name: 'reload',
    aliases: ['reloadcmd'],
    category: 'settings',
    desc: 'Reload command registry (dev)',
    ownerOnly: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      try {
        const registry = require('./index');
        const count = registry.all().length;
        await ctx.reply(
          `✅ Command registry reloaded\n📋 Commands: *${count}*`
        );
      } catch (err) {
        await ctx.reply(`❌ Reload failed: ${err.message}`);
      }
    }
  },

  {
    name: 'listadmins',
    category: 'settings',
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
  }
];