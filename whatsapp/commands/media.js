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

        await ctx.sock.sendMessage(ctx.chatJid, { sticker: stickerBuffer }, { quoted: ctx.msg });
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
        return ctx.reply(
          `❌ Usage: \`${ctx.prefix}take <pack>|<author>\``
        );
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
        const newSticker = await sharp(media.buffer)
          .webp({ quality: 90 })
          .toBuffer();

        await ctx.sock.sendMessage(
          ctx.chatJid,
          {
            sticker: newSticker
          },
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
    name: 'viewonce',
    aliases: ['vo', 'reveal'],
    category: 'media',
    desc: 'Reveal a view-once image/video (reply to it)',
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const msg = ctx.msg;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
          return ctx.reply(`❌ Reply to a *view-once* message with \`${ctx.prefix}viewonce\``);
        }

        const viewOnceContent =
          quoted.viewOnceMessageV2?.message ||
          quoted.viewOnceMessage?.message ||
          quoted.viewOnceMessageV2Extension?.message;

        if (!viewOnceContent) {
          return ctx.reply('❌ That message is not view-once.');
        }

        const type = Object.keys(viewOnceContent)[0];
        if (!['imageMessage', 'videoMessage'].includes(type)) {
          return ctx.reply('❌ Only image and video view-once supported.');
        }

        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const pino = require('pino');
        const key = msg.message.extendedTextMessage.contextInfo.stanzaId;
        const participant =
          msg.message.extendedTextMessage.contextInfo.participant ||
          msg.key.participant ||
          msg.key.remoteJid;

        const fakeMsg = {
          key: { remoteJid: msg.key.remoteJid, fromMe: false, id: key, participant },
          message: viewOnceContent
        };

        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
          logger: pino({ level: 'silent' }),
          reuploadRequest: ctx.sock.updateMediaMessage
        });

        if (type === 'imageMessage') {
          await ctx.sock.sendMessage(
            ctx.chatJid,
            { image: buffer, caption: '👁️ View-once revealed' },
            { quoted: ctx.msg }
          );
        } else {
          await ctx.sock.sendMessage(
            ctx.chatJid,
            { video: buffer, caption: '👁️ View-once revealed' },
            { quoted: ctx.msg }
          );
        }
      } catch (err) {
        await ctx.reply(`❌ Failed: ${err.message}`);
      }
    }
  }
];