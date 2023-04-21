const {
  PermissionsBitField, ChannelType,
} = require('discord.js');

const fetchMessages = (channel, lastKey) => channel.messages.fetch({
  limit: 100,
  ...(lastKey && { before: lastKey }),
});

const purge = {
  getNextPurge: () => {
    const now = new Date().getTime();
    const timeToday = now % (24 * 60 * 60 * 1000);
    const upcomingMidnight = now - timeToday + (24 * 60 * 60 * 1000);
    const purgeHour = Math.max(parseInt(process.env
      .SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_HOUR, 10), 0) || 2;
    return upcomingMidnight + (purgeHour * 60 * 60 * 1000);
  },

  willPurge: () => (process.env
    .SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_SERVER_NAME // if we have a server to purge
      // and we have a channel to purge
      && process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_NAME
      // and we don't have a posting server name, or we do and it matches the purge server name
      && (!process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
          || process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_SERVER_NAME
          === process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME)
      // and we don't have a posting channel name, or we do and it matches the purge channel name
      && (!process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME
        || process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_NAME
        === process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME)),

  purgeOldMessages: (client) => {
    if (!client) {
      return;
    }

    const channels = client.channels.cache.filter((channel) => (
    // if the server name matches
      channel.guild.name === process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_SERVER_NAME
        // and the channel name matches
        && channel.name === process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_NAME)
        // channel is a text channel
        && channel.type === ChannelType.GuildText
        // we have permission to view
        && channel.guild.members.me.permissionsIn(channel)
          .has(PermissionsBitField.Flags.ViewChannel));

    if (channels.size === 1) {
      const now = new Date().getTime();
      const purgeTime = now - (parseInt(
        process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_AFTER_DAYS,
        10,
      ) || 7) * 24 * 60 * 60 * 1000;

      // there will only be one
      channels.forEach(async (channel) => {
        const botUserId = channel.guild.members.me.user.id;

        let messages = [];
        let lastKey;

        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const fetchedMessages = await fetchMessages(channel, lastKey);
          if (fetchedMessages.size === 0) {
            break;
          }
          messages = messages.concat(Array.from(fetchedMessages.values()));
          lastKey = fetchedMessages.lastKey();
        }

        const botMessages = messages.filter((message) => message.author.bot
            && message.author.id === botUserId);

        const oldBotMessages = botMessages
          .filter((message) => message.createdTimestamp < purgeTime);

        if (oldBotMessages.length > 0) {
          console.log(`Purging ${oldBotMessages.length} of ${botMessages.length} messages...`);

          oldBotMessages.forEach((message) => {
            message.delete();
          });
        }
      });
    } else if (channels.size > 1) {
      console.warn('Not purging. Ambiguous server/channel.', channels.size);
    }
  },
};

module.exports = purge;