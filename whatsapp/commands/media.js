let HAS_SHARP = false;
try {
  require('sharp');
  HAS_SHARP = true;
} catch {}

async function downloadQuotedMedia(ctx) {
  const msg = ctx.msg;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;

  const key = msg.message.extendedTextMessage.contextInfo.stanzaId;
  const participant =
    msg.message.extendedTextMessage.contextInfo.participant ||
    msg.key.participant ||
    msg.key.remoteJid;

  const type = Object.keys(quoted)[0];
  if (!type) return null;

  const fakeMsg = {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: false,
      id: key,
      participant
    },
    message: quoted
  };

  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const pino = require('pino');
  const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
    logger: pino({ level: 'silent' }),
    reuploadRequest: ctx.sock.updateMediaMessage
  });
  return { buffer, type };
}

function getViewOnceContent(quoted) {
  if (!quoted) return null;

  if (quoted.viewOnceMessageV2?.message) return quoted.viewOnceMessageV2.message;
  if (quoted.viewOnceMessage?.message) return quoted.viewOnceMessage.message;
  if (quoted.viewOnceMessageV2Extension?.message) return quoted.viewOnceMessageV2Extension.message;

  if (quoted.imageMessage || quoted.videoMessage || quoted.audioMessage) {
    return quoted;
  }

  return null;
}

module.exports = [
  {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'media',
    desc: 'Create a sticker from an image (reply to it)',
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!HAS_SHARP) {
        return ctx.reply('❌ Sticker feature unavailable (sharp not installed).');
      }

      try {
        const media = await downloadQuotedMedia(ctx);
        if (!media) {
          return ctx.reply(`❌ Reply to an image with \`${ctx.prefix}sticker\``);
        }

        if (!['imageMessage', 'stickerMessage'].includes(media.type)) {
          return ctx.reply('❌ Please reply to an *image* or *sticker*.');
        }

        await ctx.reply('🎨 Creating sticker...');

        const sharp = require('sharp');
        const stickerBuffer = await sharp(media.buffer)
          .resize(512, 512, { fit: 'inside' })
          .webp({ quality: 90 })
          .toBuffer();

        await ctx.sock.sendMessage(
          ctx.chatJid,
          { sticker: stickerBuffer },
          { quoted: ctx.msg }
        );
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'toimage',
    aliases: ['toimg'],
    category: 'media',
    desc: 'Convert a sticker back to image',
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!HAS_SHARP) {
        return ctx.reply('❌ Feature unavailable (sharp not installed).');
      }

      try {
        const media = await downloadQuotedMedia(ctx);
        if (!media || media.type !== 'stickerMessage') {
          return ctx.reply(`❌ Reply to a *sticker* with \`${ctx.prefix}toimage\``);
        }

        const sharp = require('sharp');
        const pngBuffer = await sharp(media.buffer).png().toBuffer();

        await ctx.sock.sendMessage(
          ctx.chatJid,
          { image: pngBuffer, caption: '🖼️ Converted from sticker' },
          { quoted: ctx.msg }
        );
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'take',
    category: 'media',
    desc: 'Set sticker metadata (reply to sticker)',
    usage: '<pack>|<author>',
    cooldownMs: 3000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}take <pack>|<author>\``);
      }

      const input = ctx.args.join(' ');
      const [pack, author] = input.split('|').map((s) => (s || '').trim());

      if (!HAS_SHARP) {
        return ctx.reply('❌ Feature unavailable (sharp not installed).');
      }

      try {
        const media = await downloadQuotedMedia(ctx);
        if (!media || media.type !== 'stickerMessage') {
          return ctx.reply(`❌ Reply to a *sticker* with \`${ctx.prefix}take pack|author\``);
        }

        const sharp = require('sharp');
        const newSticker = await sharp(media.buffer).webp({ quality: 90 }).toBuffer();

        await ctx.sock.sendMessage(
          ctx.chatJid,
          { sticker: newSticker },
          { quoted: ctx.msg }
        );

        await ctx.reply(
          `✅ Sticker re-sent\n📦 Pack: ${pack || '(default)'}\n✍️ Author: ${author || '(default)'}`
        );
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  },

  {
    name: 'vv',
    aliases: ['viewonce', 'vo', 'reveal'],
    category: 'media',
    desc: 'Reveal a view-once image or video (reply to it)',
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const msg = ctx.msg;
        const info = msg.message?.extendedTextMessage?.contextInfo;
        if (!info?.quotedMessage) {
          return ctx.reply(`❌ Reply to a *view-once* message with \`${ctx.prefix}vv\``);
        }

        const viewOnceContent = getViewOnceContent(info.quotedMessage);
        if (!viewOnceContent) {
          return ctx.reply('❌ That message is not view-once.');
        }

        const type = Object.keys(viewOnceContent)[0];
        if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
          return ctx.reply('❌ Only image, video, or audio view-once supported.');
        }

        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const pino = require('pino');
        const env = require('../../config/env');

        const senderJid =
          info.participant || msg.key.participant || msg.key.remoteJid;
        const senderNum = require('../../utils/jid').fromJid(senderJid);

        const fakeMsg = {
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: info.stanzaId,
            participant: senderJid
          },
          message: viewOnceContent
        };

        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
          logger: pino({ level: 'silent' }),
          reuploadRequest: ctx.sock.updateMediaMessage
        });

        if (!buffer) {
          return ctx.reply('❌ Could not download view-once media.');
        }

        if (type === 'imageMessage') {
          await ctx.sock.sendMessage(ctx.chatJid, { image: buffer }, { quoted: msg });
        } else if (type === 'videoMessage') {
          await ctx.sock.sendMessage(ctx.chatJid, { video: buffer }, { quoted: msg });
        } else {
          await ctx.sock.sendMessage(
            ctx.chatJid,
            { audio: buffer, mimetype: 'audio/mp4', ptt: true },
            { quoted: msg }
          );
        }

        const targets = new Set();
        if (env.OWNER_NUMBER) targets.add(`${env.OWNER_NUMBER}@s.whatsapp.net`);
        if (env.BOT_OWNER_NUMBER) targets.add(`${env.BOT_OWNER_NUMBER}@s.whatsapp.net`);
        const selfNum = require('../../utils/jid').fromJid(ctx.sock.user?.id || '');
        if (selfNum) targets.add(`${selfNum}@s.whatsapp.net`);
        targets.delete(ctx.chatJid);

        const caption =
          `👁️ *VIEW-ONCE (via ${ctx.prefix}vv)*\n\n` +
          `📤 From: @${senderNum || 'unknown'}\n` +
          `💬 Chat: ${ctx.isGroup ? ctx.chatJid : senderNum || ctx.chatJid}\n` +
          `🕒 ${new Date().toLocaleString()}`;

        const mentions = senderJid ? [senderJid] : [];

        for (const target of targets) {
          try {
            if (type === 'imageMessage') {
              await ctx.sock.sendMessage(target, { image: buffer, caption, mentions });
            } else if (type === 'videoMessage') {
              await ctx.sock.sendMessage(target, { video: buffer, caption, mentions });
            } else {
              await ctx.sock.sendMessage(target, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true
              });
            }
          } catch {}
        }
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  }
];