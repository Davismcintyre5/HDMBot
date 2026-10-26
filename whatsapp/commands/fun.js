const axios = require('axios');

module.exports = [
  {
    name: 'joke',
    aliases: ['jokes'],
    category: 'fun',
    desc: 'Get a random joke',
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const { data } = await axios.get(
          'https://v2.jokeapi.dev/joke/Any?safe-mode',
          { timeout: 5000 }
        );
        const joke = data.type === 'single' ? data.joke : `${data.setup}\n\n${data.delivery}`;
        await ctx.reply(joke);
      } catch {
        await ctx.reply('😂 Why did the dev go broke? He used up all his cache!');
      }
    }
  },

  {
    name: 'quote',
    aliases: ['quotes'],
    category: 'fun',
    desc: 'Get a random quote',
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const { data } = await axios.get('https://api.quotable.io/random', {
          timeout: 5000
        });
        await ctx.reply(`"${data.content}"\n— ${data.author}`);
      } catch {
        await ctx.reply(
          '"The only way to do great work is to love what you do." — Steve Jobs'
        );
      }
    }
  },

  {
    name: 'meme',
    category: 'fun',
    desc: 'Get a random meme from Reddit',
    cooldownMs: 5000,
    run: async (ctx) => {
      try {
        const { data } = await axios.get('https://meme-api.com/gimme', {
          timeout: 8000
        });
        if (data?.url) {
          await ctx.sock.sendMessage(ctx.chatJid, {
            image: { url: data.url },
            caption: `😂 ${data.title || ''}\n\n👍 ${data.ups || 0} | r/${data.subreddit || 'memes'}`
          });
        } else {
          await ctx.reply('❌ No meme available right now.');
        }
      } catch {
        await ctx.reply('❌ Failed to fetch meme.');
      }
    }
  },

  {
    name: 'fact',
    category: 'fun',
    desc: 'Get a random fact',
    cooldownMs: 3000,
    run: async (ctx) => {
      try {
        const { data } = await axios.get(
          'https://uselessfacts.jsph.pl/api/v2/facts/random',
          { timeout: 5000 }
        );
        await ctx.reply(`💡 *Fact:*\n\n${data.text}`);
      } catch {
        await ctx.reply('💡 Honey never spoils — edible after 3000 years.');
      }
    }
  },

  {
    name: 'dice',
    aliases: ['roll'],
    category: 'fun',
    desc: 'Roll a dice (default 6 sides)',
    usage: '[sides]',
    cooldownMs: 1000,
    run: async (ctx) => {
      const sides = parseInt(ctx.args[0], 10) || 6;
      if (sides < 2 || sides > 100) {
        return ctx.reply('❌ Sides must be between 2 and 100.');
      }
      const roll = Math.floor(Math.random() * sides) + 1;
      await ctx.reply(`🎲 Rolled *${roll}* (d${sides})`);
    }
  },

  {
    name: 'coin',
    aliases: ['flip'],
    category: 'fun',
    desc: 'Flip a coin',
    cooldownMs: 1000,
    run: async (ctx) => {
      const side = Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails';
      await ctx.reply(side);
    }
  },

  {
    name: '8ball',
    aliases: ['eightball'],
    category: 'fun',
    desc: 'Ask the magic 8-ball a question',
    usage: '<question>',
    cooldownMs: 2000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}8ball <question>\``);
      }
      const responses = [
        'It is certain.',
        'Without a doubt.',
        'Yes, definitely.',
        'You may rely on it.',
        'As I see it, yes.',
        'Most likely.',
        'Outlook good.',
        'Yes.',
        'Signs point to yes.',
        'Reply hazy, try again.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        "Don't count on it.",
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Very doubtful.'
      ];
      const answer = responses[Math.floor(Math.random() * responses.length)];
      await ctx.reply(`🎱 *Question:* ${ctx.args.join(' ')}\n\n*Answer:* ${answer}`);
    }
  },

  {
    name: 'rate',
    category: 'fun',
    desc: 'Rate something out of 10',
    usage: '<thing>',
    cooldownMs: 2000,
    run: async (ctx) => {
      if (!ctx.args.length) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}rate <thing>\``);
      }
      const thing = ctx.args.join(' ');
      const rating = Math.floor(Math.random() * 11);
      const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);
      await ctx.reply(`⭐ *Rating for:* ${thing}\n\n${bar} ${rating}/10`);
    }
  },

  {
    name: 'ship',
    category: 'fun',
    desc: 'Ship two names together',
    usage: '<name1> <name2>',
    cooldownMs: 2000,
    run: async (ctx) => {
      if (ctx.args.length < 2) {
        return ctx.reply(`❌ Usage: \`${ctx.prefix}ship <name1> <name2>\``);
      }
      const [a, b] = ctx.args;
      const percent = Math.floor(Math.random() * 101);
      const hearts = '❤️'.repeat(Math.ceil(percent / 20));
      await ctx.reply(`💕 *${a}* + *${b}*\n\n${hearts}\n${percent}% match`);
    }
  }
];