const state = require('../state');
const jid = require('../../utils/jid');

const attacks = new Map();

function normalizeTarget(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

function getBugUsers() {
  return state.getGlobalSetting('bugUsers', []);
}

function setBugUsers(list) {
  state.setGlobalSetting('bugUsers', list);
}

function getBugLogs() {
  return state.getGlobalSetting('bugLogs', []);
}

function appendBugLog(entry) {
  const logs = getBugLogs();
  logs.push(entry);
  while (logs.length > 100) logs.shift();
  state.setGlobalSetting('bugLogs', logs);
}

module.exports = [
  {
    name: 'bugmenu',
    category: 'bug',
    desc: 'Show bug command menu',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      await ctx.reply(
        `🐛 *BUG MENU*\n\n` +
        `\`${ctx.prefix}bug <num> <msg> <count> <interval>\`\n` +
        `\`${ctx.prefix}stopbug\`\n\n` +
        `Example: \`${ctx.prefix}bug 254712345678 "Hi" 50 2\`\n\n` +
        `_Bug commands send repeated messages to a number. Use responsibly._`
      );
    }
  },

  {
    name: 'bug',
    category: 'bug',
    desc: 'Send repeated messages (owner only)',
    usage: '<num> <msg> <count> <interval>',
    ownerOnly: true,
    cooldownMs: 10000,
    run: async (ctx) => {
      if (ctx.args.length < 4) {
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}bug <num> <msg> <count> <interval>\``
        );
      }

      try {
        const target = normalizeTarget(ctx.args[0]);
        if (!target) {
          return ctx.reply('❌ Invalid target number.');
        }

        const interval = parseFloat(ctx.args[ctx.args.length - 1]);
        const count = parseInt(ctx.args[ctx.args.length - 2], 10);
        const message = ctx.args.slice(1, -2).join(' ');

        if (!message) {
          return ctx.reply('❌ Message required.');
        }

        const BUG_MAX = parseInt(process.env.BUG_MAX_MESSAGES, 10) || 1000;
        if (count < 1 || count > BUG_MAX) {
          return ctx.reply(`❌ Count must be 1–${BUG_MAX}.`);
        }
        if (isNaN(interval) || interval < 0.01 || interval > 60) {
          return ctx.reply('❌ Interval must be 0.01–60 seconds.');
        }

        const targetJid = jid.toJid(target);
        const attackId = `${Date.now()}_${target}`;

        attacks.set(attackId, {
          stopped: false,
          from: ctx.senderJid,
          target: targetJid,
          chatJid: ctx.chatJid,
          count,
          sent: 0
        });

        const sendLoop = async () => {
          const attack = attacks.get(attackId);
          if (!attack || attack.stopped || attack.sent >= attack.count) {
            attacks.delete(attackId);
            try {
              await ctx.sock.sendMessage(attack?.chatJid || ctx.chatJid, {
                text: `✅ Done: ${attack?.sent || 0}/${count}`
              });
            } catch {}
            return;
          }
          try {
            await ctx.sock.sendMessage(targetJid, { text: message });
            attack.sent++;
          } catch {}
          setTimeout(sendLoop, interval * 1000);
        };

        sendLoop();

        appendBugLog({
          attacker: ctx.senderJid,
          target: targetJid,
          count,
          interval,
          command: 'bug',
          timestamp: new Date().toISOString()
        });

        await ctx.reply(
          `🐛 Started\n📱 Target: ${target}\n📨 Count: ${count}\n⏱ Interval: ${interval}s`
        );
      } catch (err) {
        await ctx.reply(`❌ ${err.message}`);
      }
    }
  },

  {
    name: 'stopbug',
    category: 'bug',
    desc: 'Stop bug attacks',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      let stopped = 0;
      for (const [id, attack] of attacks) {
        if (attack.from === ctx.senderJid) {
          attack.stopped = true;
          attacks.delete(id);
          stopped++;
        }
      }
      await ctx.reply(
        stopped ? `✅ Stopped ${stopped} attack(s).` : '❌ No active attacks.'
      );
    }
  },

  {
    name: 'addbuguser',
    category: 'bug',
    desc: 'Add a user to bug users list',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}addbuguser <number>\``);
      }

      const list = getBugUsers();
      if (list.includes(target)) {
        return ctx.reply('❌ Already a bug user.');
      }

      list.push(target);
      setBugUsers(list);

      await ctx.reply(`✅ @${target} added as bug user.`, {
        mentions: [jid.toJid(target)]
      });
    }
  },

  {
    name: 'listbugusers',
    category: 'bug',
    desc: 'List bug users',
    ownerOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const list = getBugUsers();
      const lines = [`🐛 *Bug Users (${list.length})*\n`];
      if (list.length === 0) {
        lines.push('_None configured._');
      } else {
        list.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
      }
      await ctx.reply(lines.join('\n'));
    }
  },

  {
    name: 'removebuguser',
    category: 'bug',
    desc: 'Remove a user from bug users',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const target = normalizeTarget(ctx.args[0]);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}removebuguser <number>\``);
      }

      const list = getBugUsers();
      const idx = list.indexOf(target);
      if (idx === -1) {
        return ctx.reply('❌ Not a bug user.');
      }

      list.splice(idx, 1);
      setBugUsers(list);

      await ctx.reply(`✅ @${target} removed.`, {
        mentions: [jid.toJid(target)]
      });
    }
  },

  {
    name: 'antibug',
    aliases: ['antispam'],
    category: 'bug',
    desc: 'Toggle anti-bug protection',
    usage: 'on|off',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const current = await ctx.settings.getOrDefault(ctx.sessionId, 'anti_bug');

      if (!['on', 'off'].includes(action)) {
        return ctx.reply(
          `🛡️ Anti-Bug: *${current ? 'ON' : 'OFF'}*\n` +
          `Usage: \`${ctx.prefix}antibug on|off\``
        );
      }

      await ctx.settings.set(
        ctx.sessionId,
        'anti_bug',
        action === 'on',
        ctx.senderJid
      );

      await ctx.reply(
        `✅ Anti-bug ${action === 'on' ? '*enabled*' : '*disabled*'}`
      );
    }
  },

  {
    name: 'buglogs',
    category: 'bug',
    desc: 'Show recent bug command logs',
    ownerOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const logs = getBugLogs();
      if (!logs.length) {
        return ctx.reply('📋 No bug logs.');
      }

      const lines = ['🐛 *Bug Logs (last 10)*\n'];
      logs
        .slice(-10)
        .reverse()
        .forEach((log, i) => {
          lines.push(`${i + 1}. ${log.attacker}`);
          lines.push(`   → ${log.target} | ${log.count}x @ ${log.interval}s`);
          lines.push(`   ${log.timestamp}\n`);
        });

      await ctx.reply(lines.join('\n'));
    }
  },

  {
    name: 'clearbuglogs',
    category: 'bug',
    desc: 'Clear bug logs',
    ownerOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      state.setGlobalSetting('bugLogs', []);
      await ctx.reply('✅ Bug logs cleared.');
    }
  }
];