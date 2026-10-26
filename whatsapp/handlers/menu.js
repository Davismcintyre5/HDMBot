const env = require('../../config/env');
const commandRegistry = require('../../core/commandRegistry');

const CATEGORY_ORDER = ['general', 'admin', 'group', 'media', 'ai', 'utility', 'fun', 'bug', 'settings'];

async function build(sessionId, prefix) {
  const commands = await commandRegistry.list({ sessionId });
  const grouped = {};
  for (const cmd of commands) {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  }

  const categories = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const lines = [];
  lines.push(`🤖 *${env.BOT_NAME}*`);
  lines.push(`👑 Owner: ${env.OWNER_NAME}`);
  lines.push(`🔖 Prefix: \`${prefix}\``);
  lines.push(`📋 Total: ${commands.length} commands`);
  lines.push('');

  for (const cat of categories) {
    lines.push(`*─── ${cat.toUpperCase()} ───*`);
    for (const cmd of grouped[cat]) {
      const usage = cmd.usage ? ` ${cmd.usage}` : '';
      lines.push(`• \`${prefix}${cmd.name}${usage}\` — ${cmd.desc || ''}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

async function buildCategory(sessionId, prefix, category) {
  const commands = await commandRegistry.list({ sessionId, category });
  if (commands.length === 0) return null;
  const lines = [`*─── ${category.toUpperCase()} ───*`];
  for (const cmd of commands) {
    const usage = cmd.usage ? ` ${cmd.usage}` : '';
    lines.push(`• \`${prefix}${cmd.name}${usage}\` — ${cmd.desc || ''}`);
  }
  return lines.join('\n');
}

async function buildCommand(sessionId, prefix, name) {
  const cmd = await commandRegistry.get(name);
  if (!cmd) return null;
  if (!cmd.enabled) return null;
  const lines = [
    `*${cmd.name}*`,
    cmd.desc || '(no description)',
    '',
    `Category: ${cmd.category}`
  ];
  if (cmd.aliases.length) lines.push(`Aliases: ${cmd.aliases.join(', ')}`);
  if (cmd.usage) lines.push(`Usage: \`${prefix}${cmd.name} ${cmd.usage}\``);
  if (cmd.ownerOnly) lines.push('🔒 Owner only');
  if (cmd.adminOnly) lines.push('🔒 Admins only');
  if (cmd.groupOnly) lines.push('👥 Group only');
  if (cmd.cooldownMs > 0) lines.push(`⏱ Cooldown: ${Math.round(cmd.cooldownMs / 1000)}s`);
  return lines.join('\n');
}

module.exports = { build, buildCategory, buildCommand };