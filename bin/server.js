#! /usr/bin/env node

const { probe } = require('@djwoodz/satisfactory-dedicated-server-query-port-probe');
const {
  Client, GatewayIntentBits, PermissionsBitField, ChannelType,
} = require('discord.js');
const merge = require('deepmerge');
const fs = require('fs');
const { onExit } = require('signal-exit');
const { Tail } = require('tail');
const config = require('dotenv-flow').config();
const waitOn = require('wait-on');

if (Object.keys(config.parsed).length === 0 && !process.env.SATISFACTORY_BOT_DOCKER) {
  console.error('Environment variables could not be loaded. Did you create a .env or .env.local file?');
  process.exit(1);
}

const { parse } = require('../src/utils/parser');
const {
  getDefaultDatabase,
  getOnlinePlayers,
  getTimestamp,
  formatList,
  formatMinutes,
  formatPlayers,
} = require('../src/utils/utils');
const { getNextPurge, willPurge, purgeOldMessages } = require('../src/utils/purge');

const invalidUnknownNamesAndIds = ['INVALID', 'UNKNOWN'];

const dbPath = process.env.SATISFACTORY_BOT_DB_PATH;
const pollIntervalMillis = Math.max(
  parseInt(process.env.SATISFACTORY_BOT_POLL_INTERVAL_MINUTES, 10) || 1, // integer or 1
  1, // minimum of 1
) * 60000;

let intervalTimer = null;

let db = getDefaultDatabase();

let nextPurge = 0;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const sendMessage = (message) => {
  if (message) {
    client.channels.cache.filter((channel) => (
      // if we do not have a server name, or we do and it matches
      !process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
        || channel.guild.name === process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
    )
      // and if we do not have a channel name, or we do and it matches
      && (!process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME
          || channel.name === process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME)
      // channel is a text channel
      && channel.type === ChannelType.GuildText
      // we have permission to view and send
      && channel.guild.members.me.permissionsIn(channel)
        .has(PermissionsBitField.Flags.ViewChannel)
      && channel.guild.members.me.permissionsIn(channel)
        .has(PermissionsBitField.Flags.SendMessages)
      // channel can be sent to
      && channel.send).forEach((channel) => {
      console.log(`Sending message to: ${channel.guild.name}: ${channel.name}`);
      channel.send(message)
        .catch((error) => {
          console.error(error);
        });
    });
  }
};

const update = async () => {
  try {
    const previouslyUnreachable = db.server.unreachable;
    const previouslyOnline = db.server.online;

    console.log('Updating...');
    const rawData = await probe(
      process.env.SATISFACTORY_BOT_SERVER_IP,
      process.env.SATISFACTORY_BOT_SERVER_QUERY_PORT,
      process.env.SATISFACTORY_BOT_SERVER_QUERY_TIMEOUT_MS,
    );

    if (previouslyUnreachable) {
      if (process.env.SATISFACTORY_BOT_DISABLE_UNREACHABLE_FOUND_MESSAGES !== 'true') {
        sendMessage(':thumbsup: The server has been **found**.');
      }
      db.server.unreachable = false;
    }

    if (rawData.serverState === 'Game ongoing') {
      if (!previouslyOnline) {
        sendMessage(':rocket: The server is **back online**!');
        sendMessage(`:rocket: Server version: **${rawData.serverVersion}**`);
      }

      db.server = {
        version: rawData.serverVersion,
        online: true,
        unreachable: false,
      };
    } else {
      if (previouslyOnline) {
        sendMessage(':tools: The server has gone **offline**.');
      }

      db.server = {
        version: rawData.serverVersion,
        online: false,
        unreachable: false,
      };
    }

    if (db?.server?.online) {
      client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
    } else {
      client.user.setActivity('offline');
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error(error);
    client.user.setActivity('unknown');
    if (!db.server.unreachable) {
      if (process.env.SATISFACTORY_BOT_DISABLE_UNREACHABLE_FOUND_MESSAGES !== 'true') {
        sendMessage(':man_shrugging: The server is **unreachable**.');
      }
      db.server.unreachable = true;
      db.server.online = false;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    }
  }

  const now = new Date().getTime();
  if (willPurge() && now >= nextPurge) {
    // set next purge time
    nextPurge = getNextPurge();
    console.log('Looking for messages to purge...');
    try {
      purgeOldMessages(client);
    } catch (e) {
      console.error(e);
    }
    console.log(`Next purge will be ${new Date(nextPurge)}`);
  }
};

const getPlayerFromDB = (userId) => db?.players?.[userId];

client.on('ready', async () => {
  const initTime = new Date().getTime();

  if (willPurge()) {
    nextPurge = getNextPurge();
    console.log(`First purge will be ${new Date(nextPurge)}`);
  }

  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  await update();

  intervalTimer = setInterval(() => {
    update();
  }, pollIntervalMillis);

  try {
    if (!fs.existsSync(process.env.SATISFACTORY_BOT_LOG_LOCATION)) {
      console.log(`Waiting for log file to exist: ${process.env.SATISFACTORY_BOT_LOG_LOCATION}`);
      await waitOn({
        resources: [
          process.env.SATISFACTORY_BOT_LOG_LOCATION,
        ],
      });
    }

    const tail = new Tail(process.env.SATISFACTORY_BOT_LOG_LOCATION, {
      fromBeginning: true,
    });

    tail.on('line', (message) => {
      const data = parse(message);

      if (data !== null) {
        let userId;
        let leftPlayerName;
        let leftPlayerJoinTime;
        let commandLine;
        let commandLineArgument;

        switch (data.type) {
          case 'Log file open':
            // new log file
            console.log('Log file open', data.date);
            db.players = {};
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
            break;
          case 'Command line':
            commandLine = data.commandLine.match(/\S+/g);
            if (Array.isArray(commandLine)) {
              commandLine.forEach((arg) => {
                commandLineArgument = arg.match(/^-(?:NoLogTimes|LocalLogTimes|LogTimeCode)$/i);
                if (Array.isArray(commandLineArgument)) {
                  console.error(`Unsupported command line argument '${commandLineArgument[0]}' detected. Aborting...`);
                  process.exit(2);
                }
              });
            }

            break;
          case 'Login request':
            // if player not in database
            console.log('Login request', data.userId, data.name);
            if (invalidUnknownNamesAndIds.includes(data.userId)) {
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                sendMessage(`:warning: **${data.name}'s** user ID is **${formatList(invalidUnknownNamesAndIds)}**. Character inventory may be missing. Please try restarting and rejoining...`);
              }
            } else if (!getPlayerFromDB(data.userId)) {
              db.players[data.userId] = {
                userId: data.userId,
                name: data.name,
                joinRequested: 0,
                joined: 0,
              };
            } else {
              // update/reset player
              getPlayerFromDB(data.userId).name = data.name;
              getPlayerFromDB(data.userId).joinRequested = 0;
              getPlayerFromDB(data.userId).joined = 0;
            }
            break;
          case 'Join request':
            console.log('Join request', data.name);
            userId = Object.values(db.players)
              .filter(({ name }) => name === data.name)?.[0]?.userId;
            if (userId && getPlayerFromDB(userId)) {
              // increment joinRequested
              getPlayerFromDB(userId).joinRequested += 1;
            }
            break;
          case 'Join succeeded':
            console.log('Join succeeded', data.name);
            userId = Object.values(db.players)
              .filter(({ name }) => name === data.name)?.[0]?.userId;
            if (userId && getPlayerFromDB(userId) && getPlayerFromDB(userId).joinRequested > 0) {
              getPlayerFromDB(userId).joined += 1;

              // set joinTime based on most recent join
              getPlayerFromDB(userId).joinTime = data.timestamp;

              // notify of each new join
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                const onlinePlayers = getOnlinePlayers(db);
                let string = `:astronaut: **${onlinePlayers.length}** of ${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS} players online${(onlinePlayers.length > 0 ? `: **${formatPlayers(onlinePlayers)}**` : '')} (${getTimestamp()}).\n`;
                string += `    :arrow_right: **${data.name}** just joined the server.`;
                sendMessage(string);
                if (db?.server?.online) {
                  client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
                }
              }
            }

            break;
          case 'Connection close':
            // if the player is in database
            console.log('Connection close', data.userId);
            if (invalidUnknownNamesAndIds.includes(data.userId)) {
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                sendMessage(`:information_source: An **${formatList(invalidUnknownNamesAndIds)}** connection was closed.`);
              }
            } else if (getPlayerFromDB(data.userId)) {
              // delete
              leftPlayerName = getPlayerFromDB(data.userId).name;
              leftPlayerJoinTime = getPlayerFromDB(data.userId).joinTime;
              delete db.players[data.userId];

              // notify of each leave
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                const onlinePlayers = getOnlinePlayers(db);
                const playTimeInMinutes = Math
                  .round((new Date().getTime() - leftPlayerJoinTime) / 60000);
                let string = `:astronaut: **${onlinePlayers.length}** of ${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS} players online${(onlinePlayers.length > 0 ? `: **${formatPlayers(onlinePlayers)}**` : '')} (${getTimestamp()}).\n`;
                string += `    :arrow_left: **${leftPlayerName}** just left the server after playing for **${formatMinutes(playTimeInMinutes)}**.`;
                sendMessage(string);
                if (db?.server?.online) {
                  client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
                }
              }
            }
            break;
          default:
            break;
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      }
    });
  } catch (error) {
    console.error(error);
    process.exit(3);
  }
});

const initialise = () => {
  console.log(`Poll interval: ${pollIntervalMillis} milliseconds`);
  if (fs.existsSync(dbPath)) {
    try {
      db = merge(db, JSON.parse(fs.readFileSync(dbPath, 'utf8')));
      // reset players
      db.players = {};
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      console.log(`Found: ${dbPath}`);
    } catch (e) {
      console.error(`Unable to read: ${dbPath}`);
    }
  } else {
    console.log(`New DB written: ${dbPath}`);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  }

  client.login(process.env.SATISFACTORY_BOT_DISCORD_TOKEN);
};

process.on('beforeExit', (code) => {
  console.log('Process beforeExit event with code: ', code);
});

onExit(() => {
  console.log('Logging out');
  client.destroy();
});

initialise();
