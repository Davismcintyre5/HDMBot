const state = require('../state');
const jid = require('../../utils/jid');

function normalizeTarget(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

module.exports = [
  {
    name: 'poll',
    category: 'utility',
    desc: 'Create a text poll',
    usage: '"Q" "A" "B"',
    cooldownMs: 3000,
    run: async (ctx) => {
      const text = ctx.args.join(' ');
      const matches = text.match(/"([^"]*)"/g);

      if (!matches || matches.length < 3) {
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}poll "Question?" "Option A" "Option B"\``
        );
      }

      const parts = matches.map((m) => m.replace(/"/g, ''));
      const question = parts[0];
      const options = parts.slice(1, 6);

      let pollText = `📊 *POLL*\n\n${question}\n\n`;
      options.forEach((opt, i) => {
        pollText += `${i + 1}️⃣ ${opt}\n`;
      });
      pollText += '\n_Reply with number!_';

      await ctx.reply(pollText);
    }
  },

  {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'utility',
    desc: 'Broadcast a message to all groups',
    usage: '<message>',
    ownerOnly: true,
    cooldownMs: 60000,
    run: async (ctx) => {
      const message = ctx.args.join(' ');
      if (!message) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}broadcast <message>\``);
      }

      try {
        const groups = await ctx.sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);

        if (!groupIds.length) {
          return ctx.reply('❌ Bot is not in any groups.');
        }

        await ctx.reply(`📢 Broadcasting to ${groupIds.length} group(s)...`);

        let sent = 0;
        let failed = 0;

        for (const gid of groupIds) {
          try {
            await ctx.sock.sendMessage(gid, { text: `📢 *BROADCAST*\n\n${message}` });
            sent++;
          } catch {
            failed++;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }

        await ctx.reply(`✅ Done\n\n✔️ Sent: ${sent}\n❌ Failed: ${failed}`);
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'pair',
    aliases: ['paircode'],
    category: 'utility',
    desc: 'Request a pairing code for a phone number',
    usage: '<number>',
    ownerOnly: true,
    cooldownMs: 10000,
    run: async (ctx) => {
      const phone = normalizeTarget(ctx.args[0]);
      if (!phone) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}pair <phone>\``);
      }

      try {
        const code = await ctx.sock.requestPairingCode(phone);
        state.setPairingCode(code, { phone, timestamp: Date.now() });

        await ctx.reply(
          `🔗 *Pairing Code*\n\n` +
          `📱 Phone: +${phone}\n` +
          `🔑 Code: \`${code}\`\n\n` +
          `_Enter this in WhatsApp → Linked Devices → Link with phone number_\n` +
          `_Expires in 5 minutes._`
        );
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'calc',
    aliases: ['math', 'evaluate'],
    category: 'utility',
    desc: 'Evaluate a math expression',
    usage: '<expression>',
    cooldownMs: 2000,
    run: async (ctx) => {
      const expr = ctx.args.join(' ');
      if (!expr) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}calc 2 + 2 * 10\``);
      }

      if (!/^[\d\s+\-*/().%]+$/.test(expr)) {
        return ctx.reply('❌ Only numbers and + - * / ( ) . % are allowed.');
      }

      try {
        const result = Function(`'use strict'; return (${expr});`)();
        if (typeof result !== 'number' || !Number.isFinite(result)) {
          return ctx.reply('❌ Invalid expression.');
        }
        await ctx.reply(`🧮 \`${expr}\` = *${result}*`);
      } catch {
        await ctx.reply('❌ Could not evaluate expression.');
      }
    }
  },

  {
    name: 'time',
    aliases: ['clock'],
    category: 'utility',
    desc: 'Show current server time',
    cooldownMs: 1000,
    run: async (ctx) => {
      const now = new Date();
      const utc = now.toISOString();
      const local = now.toLocaleString();
      await ctx.reply(`🕐 *Server Time*\n\nLocal: ${local}\nUTC: ${utc}`);
    }
  },

  {
    name: 'base64',
    aliases: ['b64', 'encode'],
    category: 'utility',
    desc: 'Encode text to base64',
    usage: '<text>',
    cooldownMs: 1000,
    run: async (ctx) => {
      const text = ctx.args.join(' ');
      if (!text) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}base64 <text>\``);
      }
      const encoded = Buffer.from(text).toString('base64');
      await ctx.reply(`🔒 \`${encoded}\``);
    }
  },

  {
    name: 'decode',
    aliases: ['b64decode'],
    category: 'utility',
    desc: 'Decode base64 to text',
    usage: '<base64>',
    cooldownMs: 1000,
    run: async (ctx) => {
      const input = ctx.args.join(' ');
      if (!input) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}decode <base64>\``);
      }
      try {
        const decoded = Buffer.from(input, 'base64').toString('utf8');
        await ctx.reply(`🔓 \`${decoded}\``);
      } catch {
        await ctx.reply('❌ Invalid base64.');
      }
    }
  },

  {
    name: 'hash',
    aliases: ['sha256', 'md5'],
    category: 'utility',
    desc: 'Hash text (sha256 by default)',
    usage: '[algo] <text>',
    cooldownMs: 2000,
    run: async (ctx) => {
      const crypto = require('crypto');

      let algo = 'sha256';
      let text = ctx.args.join(' ');

      if (['md5', 'sha1', 'sha256', 'sha512'].includes(ctx.args[0])) {
        algo = ctx.args[0];
        text = ctx.args.slice(1).join(' ');
      }

      if (!text) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}hash [md5|sha1|sha256|sha512] <text>\``);
      }

      const hash = crypto.createHash(algo).update(text).digest('hex');
      await ctx.reply(`🔐 *${algo.toUpperCase()}*\n\`${hash}\``);
    }
  }
];