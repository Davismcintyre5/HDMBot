const jid = require('../../utils/jid');
const state = require('../state');
const settings = require('../../core/settings');

const antiLinkMap = new Map();
const antiStatusMap = new Map();
const antiBadWordMap = new Map();
const onlyAdminMap = new Map();
const mutedUsersMap = new Map();
const badWordsMap = new Map();
const warningLimitMap = new Map();

function parseDuration(str) {
  const match = String(str || '').match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[match[2].toLowerCase()];
}

function getTargetJid(ctx) {
  const ctxInfo = ctx.msg.message?.extendedTextMessage?.contextInfo;
  if (ctxInfo?.participant) return ctxInfo.participant;
  if (ctxInfo?.mentionedJid?.length) return ctxInfo.mentionedJid[0];
  if (ctx.args[0]) {
    const digits = ctx.args[0].replace(/[^\d]/g, '');
    if (/^\d{10,15}$/.test(digits)) return jid.toJid(digits);
  }
  return null;
}

async function requireGroupAdmin(ctx) {
  if (!ctx.isGroup) {
    await ctx.reply('❌ Groups only.');
    return false;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await ctx.reply('❌ Only group admins.');
    return false;
  }
  if (!ctx.isBotAdmin) {
    await ctx.reply('⚠️ Bot must be admin to do this.');
    return false;
  }
  return true;
}

function getCountry(num) {
  const countries = {
    '254': '🇰🇪 Kenya', '255': '🇹🇿 Tanzania', '256': '🇺🇬 Uganda',
    '1': '🇺🇸 USA', '44': '🇬🇧 UK', '91': '🇮🇳 India',
    '234': '🇳🇬 Nigeria', '233': '🇬🇭 Ghana', '27': '🇿🇦 South Africa',
    '7': '🇷🇺 Russia', '49': '🇩🇪 Germany', '33': '🇫🇷 France',
    '86': '🇨🇳 China', '81': '🇯🇵 Japan', '55': '🇧🇷 Brazil',
    '971': '🇦🇪 UAE', '966': '🇸🇦 Saudi Arabia', '20': '🇪🇬 Egypt', '61': '🇦🇺 Australia'
  };
  const n = String(num).replace(/[^\d]/g, '');
  for (const [code, name] of Object.entries(countries).sort((a, b) => b[0].length - a[0].length)) {
    if (n.startsWith(code)) return name;
  }
  return '🌍 Other';
}

async function getGroupAdmins(sock, groupJid) {
  try {
    const metadata = await state.getGroupMeta(sock, groupJid);
    if (!metadata) return { admins: [], metadata: null, participants: [] };
    const admins = metadata.participants
      .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
      .map((p) => p.id);
    return { admins, metadata, participants: metadata.participants };
  } catch {
    return { admins: [], metadata: null, participants: [] };
  }
}

module.exports = [
  {
    name: 'link',
    aliases: ['grouplink', 'invitelink'],
    category: 'group',
    desc: 'Get group invite link',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const code = await ctx.sock.groupInviteCode(ctx.chatJid);
        await ctx.reply(`🔗 https://chat.whatsapp.com/${code}`);
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'antilink',
    aliases: ['antilinks'],
    category: 'group',
    desc: 'Toggle anti-link protection',
    usage: '<delete|kick|warn> <on|off>',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const stateArg = (ctx.args[1] || '').toLowerCase();

      if (!action || !stateArg) {
        const current = antiLinkMap.get(ctx.chatJid) || { enabled: false, action: 'delete' };
        return ctx.reply(
          `🛡️ Anti-Link: ${current.enabled ? 'ON' : 'OFF'} | ${current.action}\n` +
          `Usage: \`${ctx.prefix}antilink <delete|kick|warn> <on|off>\``
        );
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return ctx.reply('❌ Only group admins.');
      }
      if (!['delete', 'kick', 'warn'].includes(action)) {
        return ctx.reply('❌ Action: delete, kick, warn');
      }
      if (!['on', 'off'].includes(stateArg)) {
        return ctx.reply('❌ State: on, off');
      }

      antiLinkMap.set(ctx.chatJid, { enabled: stateArg === 'on', action });
      await ctx.reply(`✅ Anti-link ${stateArg === 'on' ? 'enabled' : 'disabled'} (${action})`);
    }
  },

  {
    name: 'delete',
    aliases: ['del'],
    category: 'group',
    desc: 'Delete quoted message',
    cooldownMs: 2000,
    run: async (ctx) => {
      const info = ctx.msg.message?.extendedTextMessage?.contextInfo;
      if (!info?.stanzaId) {
        return ctx.reply('❌ Reply to a message to delete it.');
      }
      try {
        await ctx.sock.sendMessage(ctx.chatJid, {
          delete: {
            remoteJid: ctx.chatJid,
            fromMe: false,
            id: info.stanzaId,
            participant: info.participant
          }
        });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'tagall',
    aliases: ['everyone', 'all'],
    category: 'group',
    desc: 'Tag all group members',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 10000,
    run: async (ctx) => {
      try {
        const meta = await state.getGroupMeta(ctx.sock, ctx.chatJid);
        if (!meta?.participants?.length) {
          return ctx.reply('❌ Could not fetch members.');
        }
        const mentions = meta.participants.map((p) => p.id);
        const extra = ctx.args.length ? `\n${ctx.args.join(' ')}\n` : '';
        await ctx.sock.sendMessage(ctx.chatJid, {
          text: `📢 *Attention everyone!*\n${extra}`,
          mentions
        });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'hidetag',
    aliases: ['ht'],
    category: 'group',
    desc: 'Silent tag all members',
    usage: '<message>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 10000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}hidetag <message>\``);
      }
      try {
        const meta = await state.getGroupMeta(ctx.sock, ctx.chatJid);
        if (!meta?.participants?.length) {
          return ctx.reply('❌ Could not fetch members.');
        }
        const mentions = meta.participants.map((p) => p.id);
        await ctx.sock.sendMessage(ctx.chatJid, {
          text: ctx.args.join(' '),
          mentions
        });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'groupinfo',
    aliases: ['ginfo'],
    category: 'group',
    desc: 'Show group information',
    groupOnly: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      try {
        const meta = await state.getGroupMeta(ctx.sock, ctx.chatJid);
        if (!meta) return ctx.reply('❌ Could not fetch group info.');
        const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'Unknown';
        await ctx.reply(
          `*${meta.subject || 'Group'}*\n` +
          `🆔 \`${ctx.chatJid}\`\n` +
          `👥 ${meta.participants?.length || 0} members\n` +
          `📋 ${meta.desc || 'No description'}\n` +
          `📅 Created: ${created}`
        );
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'admins',
    aliases: ['gadmins'],
    category: 'group',
    desc: 'List group admins',
    groupOnly: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      try {
        const { admins, participants } = await getGroupAdmins(ctx.sock, ctx.chatJid);
        if (!admins.length) return ctx.reply('📋 No admins.');
        const lines = [`👑 *Group Admins (${admins.length})*\n`];
        for (const aid of admins) {
          const p = participants.find((x) => x.id === aid);
          const name = p?.notify || p?.name || jid.fromJid(aid);
          const role = p?.admin === 'superadmin' ? ' (superadmin)' : '';
          lines.push(`• ${name}${role}`);
        }
        await ctx.reply(lines.join('\n'));
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'members',
    aliases: ['gmembers'],
    category: 'group',
    desc: 'Show member statistics by country',
    groupOnly: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      try {
        const { admins, participants } = await getGroupAdmins(ctx.sock, ctx.chatJid);
        const countries = {};
        for (const p of participants) {
          const num = jid.fromJid(p.id);
          const c = getCountry(num);
          countries[c] = (countries[c] || 0) + 1;
        }
        let text = `👥 *Members*\n📊 Total: ${participants.length}\n👑 Admins: ${admins.length}\n\n🌍 *By Country:*\n`;
        const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
        sorted.slice(0, 15).forEach(([c, cnt]) => { text += `${c}: ${cnt}\n`; });
        if (sorted.length > 15) {
          const remaining = sorted.slice(15).reduce((sum, [, cnt]) => sum + cnt, 0);
          text += `Other: ${remaining}\n`;
        }
        await ctx.reply(text);
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'mutelist',
    category: 'group',
    desc: 'List muted members',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const mutes = mutedUsersMap.get(ctx.chatJid) || {};
      const now = Date.now();
      const active = Object.entries(mutes).filter(([, data]) => data.until > now);

      if (!active.length) return ctx.reply('📋 No muted members.');

      let text = '🔇 *Muted Members*\n\n';
      for (const [uid, data] of active) {
        const mins = Math.max(0, Math.floor((data.until - now) / 60000));
        text += `• @${jid.fromJid(uid)} - ${mins}min\n`;
      }
      const mentions = active.map(([uid]) => uid);
      await ctx.sock.sendMessage(ctx.chatJid, { text, mentions });
    }
  },

  {
    name: 'welcome',
    category: 'group',
    desc: 'Set welcome message template',
    usage: 'on|off|<text>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const key = `welcome.${ctx.chatJid}`;
      const sub = (ctx.args[0] || '').toLowerCase();

      if (sub === 'on') {
        await settings.set(ctx.sessionId, key, '👋 Welcome @user to *{groupName}*!\n\n📋 {groupDesc}\n\nEnjoy your stay! 🎉', ctx.senderJid);
        return ctx.reply('✅ Welcome enabled!');
      }
      if (sub === 'off') {
        await settings.reset(ctx.sessionId, key);
        return ctx.reply('✅ Welcome disabled.');
      }
      if (ctx.args.length) {
        await settings.set(ctx.sessionId, key, ctx.args.join(' '), ctx.senderJid);
        return ctx.reply('✅ Custom welcome set!');
      }

      const current = await settings.getOrDefault(ctx.sessionId, key);
      await ctx.reply(
        `👋 *Welcome Settings*\nCurrent: ${current || 'None'}\n` +
        `Usage: \`${ctx.prefix}welcome on|off|<text>\``
      );
    }
  },

  {
    name: 'goodbye',
    category: 'group',
    desc: 'Set goodbye message template',
    usage: 'on|off|<text>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const key = `goodbye.${ctx.chatJid}`;
      const sub = (ctx.args[0] || '').toLowerCase();

      if (sub === 'on') {
        await settings.set(ctx.sessionId, key, "😢 @user has left. We'll miss you!", ctx.senderJid);
        return ctx.reply('✅ Goodbye enabled.');
      }
      if (sub === 'off') {
        await settings.reset(ctx.sessionId, key);
        return ctx.reply('✅ Goodbye disabled.');
      }
      if (ctx.args.length) {
        await settings.set(ctx.sessionId, key, ctx.args.join(' '), ctx.senderJid);
        return ctx.reply('✅ Custom goodbye set!');
      }

      const current = await settings.getOrDefault(ctx.sessionId, key);
      await ctx.reply(
        `🚪 *Goodbye Settings*\nCurrent: ${current || 'None'}\n` +
        `Usage: \`${ctx.prefix}goodbye on|off|<text>\``
      );
    }
  },

  {
    name: 'listbadword',
    aliases: ['badwords', 'listbadwords'],
    category: 'group',
    desc: 'List filtered bad words',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const words = badWordsMap.get(ctx.chatJid) || [];
      if (!words.length) return ctx.reply('📋 No bad words.');
      await ctx.reply(`🚫 *Bad Words (${words.length})*\n${words.sort().join(', ')}`);
    }
  },

  {
    name: 'addbadword',
    aliases: ['addword'],
    category: 'group',
    desc: 'Add a word to the filter',
    usage: '<word>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const word = (ctx.args[0] || '').toLowerCase();
      if (!word) return ctx.reply(`❌ Usage: \`${ctx.prefix}addbadword <word>\``);
      const words = badWordsMap.get(ctx.chatJid) || [];
      if (words.includes(word)) return ctx.reply('❌ Already in list.');
      words.push(word);
      badWordsMap.set(ctx.chatJid, words);
      await ctx.reply(`✅ "${word}" added.`);
    }
  },

  {
    name: 'removebadword',
    aliases: ['delword', 'rmword'],
    category: 'group',
    desc: 'Remove a word from the filter',
    usage: '<word>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const word = (ctx.args[0] || '').toLowerCase();
      if (!word) return ctx.reply(`❌ Usage: \`${ctx.prefix}removebadword <word>\``);
      const words = badWordsMap.get(ctx.chatJid) || [];
      const idx = words.indexOf(word);
      if (idx === -1) return ctx.reply('❌ Not found.');
      words.splice(idx, 1);
      badWordsMap.set(ctx.chatJid, words);
      await ctx.reply(`✅ "${word}" removed.`);
    }
  },

  {
    name: 'setwarn',
    aliases: ['warnlimit'],
    category: 'group',
    desc: 'Set warning limit',
    usage: '<1-10>',
    groupOnly: true,
    adminOnly: true,
    cooldownMs: 2000,
    run: async (ctx) => {
      const limit = parseInt(ctx.args[0], 10);
      if (isNaN(limit) || limit < 1 || limit > 10) {
        return ctx.reply('❌ Provide limit 1-10.');
      }
      warningLimitMap.set(ctx.chatJid, limit);
      await ctx.reply(`✅ Warning limit set to ${limit}.`);
    }
  },

  {
    name: 'kick',
    aliases: ['remove'],
    category: 'group',
    desc: 'Kick a member from the group',
    usage: '@user | reply | <number>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) return ctx.reply(`❌ Usage: \`${ctx.prefix}kick @user / reply / <number>\``);
      try {
        await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'remove');
        await ctx.reply(`✅ Kicked @${jid.fromJid(target)}`, { mentions: [target] });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'promote',
    aliases: ['admin'],
    category: 'group',
    desc: 'Promote a member to admin',
    usage: '@user | reply | <number>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) return ctx.reply(`❌ Usage: \`${ctx.prefix}promote @user / reply / <number>\``);
      try {
        await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'promote');
        await ctx.reply(`✅ Promoted @${jid.fromJid(target)}`, { mentions: [target] });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'demote',
    aliases: ['unadmin'],
    category: 'group',
    desc: 'Demote an admin to member',
    usage: '@user | reply | <number>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) return ctx.reply(`❌ Usage: \`${ctx.prefix}demote @user / reply / <number>\``);
      try {
        await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'demote');
        await ctx.reply(`✅ Demoted @${jid.fromJid(target)}`, { mentions: [target] });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'antistatusmention',
    category: 'group',
    desc: 'Toggle anti-status mention',
    usage: '<delete|kick|warn> <on|off>',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const stateArg = (ctx.args[1] || '').toLowerCase();

      if (!action || !stateArg) {
        const current = antiStatusMap.get(ctx.chatJid) || { enabled: false, action: 'delete' };
        return ctx.reply(
          `📱 Anti-Status: ${current.enabled ? 'ON' : 'OFF'} | ${current.action}\n` +
          `Usage: \`${ctx.prefix}antistatusmention <delete|kick|warn> <on|off>\``
        );
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return ctx.reply('❌ Only group admins.');
      }
      if (!['delete', 'kick', 'warn'].includes(action)) {
        return ctx.reply('❌ Action: delete, kick, warn');
      }
      if (!['on', 'off'].includes(stateArg)) {
        return ctx.reply('❌ State: on, off');
      }

      antiStatusMap.set(ctx.chatJid, { enabled: stateArg === 'on', action });
      await ctx.reply(`✅ Anti-status mention ${stateArg === 'on' ? 'enabled' : 'disabled'} (${action})`);
    }
  },

  {
    name: 'onlyadmin',
    category: 'group',
    desc: 'Toggle admin-only mode',
    usage: 'on|off',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const stateArg = (ctx.args[0] || '').toLowerCase();

      if (!['on', 'off'].includes(stateArg)) {
        const current = onlyAdminMap.get(ctx.chatJid) || false;
        return ctx.reply(
          `🔒 Admin-Only: ${current ? 'ON' : 'OFF'}\n` +
          `Usage: \`${ctx.prefix}onlyadmin on|off\``
        );
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return ctx.reply('❌ Only group admins.');
      }

      onlyAdminMap.set(ctx.chatJid, stateArg === 'on');
      await ctx.reply(`✅ Admin-only ${stateArg === 'on' ? 'enabled' : 'disabled'}.`);
    }
  },

  {
    name: 'kickall',
    category: 'group',
    desc: 'Kick all non-admin members (dangerous)',
    usage: 'CONFIRM',
    groupOnly: true,
    ownerOnly: true,
    botAdminNeeded: true,
    cooldownMs: 60000,
    run: async (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ Groups only.');
      if (!ctx.isBotAdmin) return ctx.reply('⚠️ Bot must be admin.');

      const { admins, participants } = await getGroupAdmins(ctx.sock, ctx.chatJid);
      const nonAdmins = participants.filter((p) => !admins.includes(p.id));

      if (!nonAdmins.length) return ctx.reply('❌ No non-admins to kick.');

      if ((ctx.args[0] || '').toUpperCase() !== 'CONFIRM') {
        return ctx.reply(
          `⚠️ This will kick *${nonAdmins.length}* non-admin members.\n\n` +
          `Type \`${ctx.prefix}kickall CONFIRM\` to proceed.`
        );
      }

      await ctx.reply(`🔄 Kicking ${nonAdmins.length} members...`);

      let kicked = 0;
      for (let i = 0; i < nonAdmins.length; i += 20) {
        const batch = nonAdmins.slice(i, i + 20).map((p) => p.id);
        try {
          await ctx.sock.groupParticipantsUpdate(ctx.chatJid, batch, 'remove');
          kicked += batch.length;
        } catch {}
        await new Promise((r) => setTimeout(r, 2000));
      }

      await ctx.reply(`✅ Kicked ${kicked} members.`);
    }
  },

  {
    name: 'groupdesc',
    aliases: ['desc', 'setdesc', 'description'],
    category: 'group',
    desc: 'Set group description',
    usage: '<text>',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        try {
          const meta = await state.getGroupMeta(ctx.sock, ctx.chatJid);
          return ctx.reply(`📋 *Description:*\n${meta?.desc || 'None'}`);
        } catch {
          return ctx.reply('❌ Failed to get description.');
        }
      }

      if (!ctx.isAdmin && !ctx.isOwner) return ctx.reply('❌ Only group admins.');
      if (!ctx.isBotAdmin) return ctx.reply('⚠️ Bot must be admin.');

      try {
        await ctx.sock.groupUpdateDescription(ctx.chatJid, ctx.args.join(' '));
        await ctx.reply('✅ Description updated!');
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'mute',
    category: 'group',
    desc: 'Mute a member for a duration',
    usage: '@user <time> (10m, 1h, 1d)',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}mute @user <time>\`\nTime: 10s, 10m, 1h, 1d`);
      }
      const timeStr = ctx.args[ctx.args.length - 1];
      const dur = parseDuration(timeStr);
      if (!dur) return ctx.reply('❌ Invalid time. Use: 10s, 10m, 1h, 1d');

      const mutes = mutedUsersMap.get(ctx.chatJid) || {};
      mutes[target] = { until: Date.now() + dur, by: ctx.senderJid };
      mutedUsersMap.set(ctx.chatJid, mutes);

      await ctx.reply(`🔇 @${jid.fromJid(target)} muted for ${timeStr}.`, { mentions: [target] });
    }
  },

  {
    name: 'unmute',
    category: 'group',
    desc: 'Unmute a member',
    usage: '@user | reply | <number>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) return ctx.reply(`❌ Usage: \`${ctx.prefix}unmute @user / <number>\``);

      const mutes = mutedUsersMap.get(ctx.chatJid) || {};
      delete mutes[target];
      mutedUsersMap.set(ctx.chatJid, mutes);

      await ctx.reply(`🔊 @${jid.fromJid(target)} unmuted.`, { mentions: [target] });
    }
  },

  {
    name: 'add',
    aliases: ['invite', 'addmember'],
    category: 'group',
    desc: 'Add a member to the group',
    usage: '<number>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    cooldownMs: 5000,
    run: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = getTargetJid(ctx);
      if (!target) return ctx.reply(`❌ Usage: \`${ctx.prefix}add <number>\``);
      try {
        await ctx.sock.groupParticipantsUpdate(ctx.chatJid, [target], 'add');
        await ctx.reply(`✅ Added @${jid.fromJid(target)}`, { mentions: [target] });
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'antibadword',
    category: 'group',
    desc: 'Toggle bad word filter',
    usage: '<delete|warn|kick|mute> <on|off>',
    groupOnly: true,
    cooldownMs: 3000,
    run: async (ctx) => {
      const action = (ctx.args[0] || '').toLowerCase();
      const stateArg = (ctx.args[1] || '').toLowerCase();

      if (!action || !stateArg) {
        return ctx.reply(
          `🚫 Bad Word Filter\n` +
          `Usage: \`${ctx.prefix}antibadword <delete|warn|kick|mute> <on|off>\``
        );
      }

      if (!ctx.isAdmin && !ctx.isOwner) return ctx.reply('❌ Only group admins.');
      if (!['delete', 'warn', 'kick', 'mute'].includes(action)) {
        return ctx.reply('❌ Action: delete, warn, kick, mute');
      }
      if (!['on', 'off'].includes(stateArg)) return ctx.reply('❌ State: on, off');

      antiBadWordMap.set(ctx.chatJid, { enabled: stateArg === 'on', action });
      await ctx.reply(`✅ Bad word filter ${stateArg === 'on' ? 'enabled' : 'disabled'} (${action}).`);
    }
  }
];