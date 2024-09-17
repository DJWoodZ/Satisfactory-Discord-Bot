Satisfactory Discord Bot
========================

A bot that monitors a [Satisfactory Dedicated Server](https://satisfactory.fandom.com/wiki/Dedicated_servers) and posts status information in a Discord channel.

What does this bot do?
----------------------

It will show information such as the server's status, the number of players online and players who have joined or left the game. It can also purge its own messages to keep the channel tidy.

### Channel updates

This bot works with a single Satisfactory Dedicated Server and will post updates like this as the status changes:

**Satisfactory** [BOT] <sub>Today at 10:00</sub>
<br />
:rocket: The server is **back online**!
<br />
:rocket: Server version: **211839**

**Satisfactory** [BOT] <sub>Today at 10:30</sub>
<br />
:man_astronaut: **1** of 4 players online: **Player 1** (`1 January 2023 10:30`).
<br />
&nbsp;&nbsp;&nbsp;&nbsp;:arrow_right: **Player 1** just joined the server.

**Satisfactory** [BOT] <sub>Today at 10:40</sub>
<br />
:man_astronaut: **2** of 4 players online: **Player 1 and Player 2** (`1 January 2023 10:40`).
<br />
&nbsp;&nbsp;&nbsp;&nbsp;:arrow_right: **Player 2** just joined the server.

**Satisfactory** [BOT] <sub>Today at 12:45</sub>
<br />
:man_astronaut: **1** of 4 players online: **Player 2** (`1 January 2023 12:45`).
<br />
&nbsp;&nbsp;&nbsp;&nbsp;:arrow_left: **Player 1** just left the server after playing for **2 hours and 15 minutes**.

**Satisfactory** [BOT] <sub>Today at 12:50</sub>
<br />
:man_astronaut: **0** of 4 players online (`1 January 2023 12:50`).
<br />
&nbsp;&nbsp;&nbsp;&nbsp;:arrow_left: **Player 2** just left the server after playing for **2 hours and 10 minutes**.

### Activity updates

It will also update its current activity (status) to show the Dedicated Server's current status and number of online players:

**Satisfactory** [BOT]
<br />
<sup>Playing **online: 2/4**</sup>

How does it work?
-----------------

The bot is fully automatic. It does not require or respond to Discord user commands.

It retrieves the status of the server by polling the server port (default: `7777`) using [this library](https://www.npmjs.com/package/@djwoodz/satisfactory-dedicated-server-lightweight-query-probe). By default it will poll the port once per minute.

It gets the player information by monitoring the server's log file. The log file is monitored in realtime. If the bot is not running in the same environment as the Satisfactory Dedicated Server, realtime access to the log file will need to be provided (e.g. via a filesystem mount).

Permissions
-----------

The only Discord permission this bot requires is the `Send Messages` permission, which can be found in the [Discord Developer Portal](https://discord.com/developers/) under: `bot` -> `Text Permission` -> `Send Messages`

The bot does not require any additional permissions to purge its own messages.

Time zones and log files
------------------------

This bot expects log files to contain timestamps in the UTC time standard. By default, the Satisfactory Dedicated Server logs contain UTC timestamps, irrespective of the local time zone of the hosting server.

In other words, you do not need to adjust the timezone of your hosting server to UTC for this bot to work. This bot should work even if it is running on a host that has a different time zone to that of your Satisfactory Dedicated Server.

However, this bot will **not** work with a Satisfactory Dedicated Server that is running with any of the following command line arguments:

* `-LocalLogTimes`
* `-LogTimeCode`
* `-NoLogTimes`

If any of these command line arguments are detected, the bot will abort with an error.

<h2 id="env-vars">Environment Variables</h2>

Copy the `.env` file and create an `.env.local` file for your environment variables. You will then need to edit the `.env.local` file.

### Can I just edit the `.env` file?

It would work but you shouldn't do that. It is good practice to create and edit an `.env.local` file because it will be excluded from commits by the `.gitignore` file, whereas the `.env` file will not be excluded from commits.

### Which variables must I edit?

As a minimum you will need to specify a `SATISFACTORY_BOT_DISCORD_TOKEN` value, which you obtain via the [Discord Developer Portal](https://discord.com/developers/). You will also need to verify that the `SATISFACTORY_BOT_LOG_LOCATION`, `SATISFACTORY_BOT_SERVER_IP`, `SATISFACTORY_BOT_SERVER_PORT` and `SATISFACTORY_BOT_SERVER_MAX_PLAYERS` values are correct.

### Anything else to be aware of?

By default the bot will post to all channels it has access to on all servers it has been added to.

You should use Discord's roles and permissions to control which channels it can post to, but you can also specify the `SATISFACTORY_BOT_DISCORD_SERVER_NAME` and `SATISFACTORY_BOT_DISCORD_CHANNEL_NAME` values to further ensure it only posts to your chosen Discord server and/or channel. This is recommended.

Be sure to spell the server and channel names exactly as written in Discord.

### What about purging?

By default purging is disabled. When enabled, it will only purge its own messages and it will only purge from the specified channel on the specified server, both of which must be set using `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_SERVER_NAME` and `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_NAME`.

Be sure to spell the server and channel names exactly as written in Discord.

If you do not want the bot to purge its old messages, simply leave these values blank.

### Environment Variables

* `SATISFACTORY_BOT_DB_PATH` (Default: `./db.json`) - The path to the database JSON file (the file will be created if it doesn't exist)
* `SATISFACTORY_BOT_DISABLE_UNREACHABLE_FOUND_MESSAGES` (Default: `false`) - Whether to disable "The server is unreachable." and "The server has been found." messages
* `SATISFACTORY_BOT_DISCORD_CHANNEL_NAME` (Default: *blank*) - The Discord channel name to post in (leave blank for all channels the bot has access to)
* `SATISFACTORY_BOT_DISCORD_SERVER_NAME` (Default: *blank*) - The Discord server name to post in (leave blank for all servers the bot has access to)
* `SATISFACTORY_BOT_DISCORD_TOKEN` (Default: `YOUR_DISCORD_TOKEN`) - Your Discord bot token (from the [Discord Developer Portal](https://discord.com/developers/))
* `SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING` (Default: `false`) - Post player joined/left messages, when activity seen in log, even if the server is believed to be offline
* `SATISFACTORY_BOT_LOG_LOCATION` (Default: `/home/steam/SatisfactoryDedicatedServer/FactoryGame/Saved/Logs/FactoryGame.log`) - The location of the server's log file
* `SATISFACTORY_BOT_LOG_USE_WATCH_FILE` (Default: `false`) - Force use of `fs.watchFile` (try setting to `true` if the bot does not respond to log file changes)
* `SATISFACTORY_BOT_POLL_INTERVAL_MINUTES` (Default: `1`) - How frequently to poll the Dedicated Server (in minutes)
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_AFTER_DAYS` (Default: `7`) - How old messages must be before they are deleted (in days)
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_AFTER_LINES` (Default: *blank*) - The maximum number of messages to keep
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_HOUR` (Default: `2`) - The hour of the day to perform the purge in UTC (e.g. `2` for 2am (UTC))
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_NAME` (Default: *blank*) - The Discord channel name to purge (leave blank to disable purging)
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_ON_STARTUP` (Default: `false`) - Attempt a purge when the bot first connects
* `SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_SERVER_NAME` (Default: *blank*) - The Discord server name with the channel to purge (leave blank to disable purging)
* `SATISFACTORY_BOT_SERVER_IP` (Default: `127.0.0.1`) - The IP address of the Dedicated Server
* `SATISFACTORY_BOT_SERVER_MAX_PLAYERS` (Default: `4`) - The maximum number of players the server allows (this should reflect the same number as your server's `MaxPlayers` setting)
* `SATISFACTORY_BOT_SERVER_PORT` (Default: `7777`) - The Dedicated Server's port
* `SATISFACTORY_BOT_SERVER_QUERY_TIMEOUT_MS` (Default: `10000`) - The query polling timeout (in milliseconds)

Installation
------------

You can either run this project directly on a host machine, or you can run it in a docker container. If you are going to be running it directly, the dependencies will need to be installed.

### Running directly on host machine

You need [git](https://git-scm.com/) and [Node.js](https://nodejs.org/) to be installed, then you must clone this repository and install the dependencies:

```
git clone https://github.com/DJWoodZ/Satisfactory-Discord-Bot.git
cd Satisfactory-Discord-Bot
npm install
cp .env .env.local
```

You will need edit the `.env.local` file. See the [Environment Variables](#env-vars) section for details.

#### CLI Commands

* `npm start` - Run the Discord bot normally
* `npm run dev` - Run the Discord bot in 'development' mode (uses nodemon* to restart automatically on .js code changes)
* `npm run pm2:start` - Run the Discord bot as a daemon (uses PM2**)
* `npm run pm2:stop` - Stop the Discord bot daemon (uses PM2**)

\* Install nodemon globally first with `npm install nodemon -g`
<br />
\** Install PM2 globally first (see below)

#### Installing as a service (with PM2)

The `npm run pm2:start` and `npm run pm2:stop` scripts use a global PM2 NPM dependency.

##### Installing PM2 globally

```
npm install pm2@latest -g
```

##### Run as a service (Linux, etc.)

To ensure the Discord bot service starts automatically following a system reboot:

```
npm run pm2:start
pm2 startup
pm2 save
```

See the [PM2 Process Management Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/) for details.

##### Run as a service (Windows)

To run as a service on Windows, you will need to use [pm2-installer](https://github.com/jessety/pm2-installer).

To ensure the Discord bot service starts automatically following a system reboot:

```
npm run pm2:start
pm2 save
```

See the [PM2 Process Management Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/) for details.

### Running with Docker Compose

This project comes pre-configured ready for use with Docker Compose.

The default Docker Compose configuration (`compose.yaml`) will use the `.env.local` file on the host machine.

The `SATISFACTORY_BOT_DB_PATH` value in `.env.local` will be ignored by the Docker Compose configuration. The default Docker Compose configuration will create and use a database JSON file located on the host machine at: `.\docker-volumes\db\db.json`.

The `SATISFACTORY_BOT_LOG_LOCATION` value in `.env.local` will also be ignored by the Docker Compose configuration. It assumes that the Satisfactory Dedicated Server log file (`FactoryGame.log`) will be accessible on the host machine at: `/opt/satisfactory/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log`.

* **SteamCMD Log File Location**

  If you followed [these installation instructions](https://satisfactory.fandom.com/wiki/Dedicated_servers#SteamCMD), `/opt/satisfactory/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log` on the host machine should map to `/home/steam/SatisfactoryDedicatedServer/FactoryGame/Saved/Logs/FactoryGame.log` (or the equivalent thereof).

  If the log file is not accessible on the host machine at `/opt/satisfactory/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log`, you will either need to create a mount point to make the log file accessible at that location or you will need to edit the `compose.yaml` file from this project with the actual location.

* **wolveix/satisfactory-server (Docker) Log File Location**

  If you followed [these installation instructions](https://github.com/wolveix/satisfactory-server#setup), `/opt/satisfactory/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log` on the host machine should map to `/path/to/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log` (or the equivalent thereof).

  Note: `/path/to/config` is not a real path. You are expected to replace this with the actual path you chose for the wolveix/satisfactory-server config. If you chose `/opt/satisfactory/config`, no additional steps will be necessary. If the log file is not accessible on the host machine at `/opt/satisfactory/config/gamefiles/FactoryGame/Saved/Logs/FactoryGame.log`, you will either need to create a mount point to make the log file accessible at that location or you will need to edit the `compose.yaml` file from this project with the actual location.

You need [git](https://git-scm.com/), [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) to be installed and then you must clone this repository:

```
git clone https://github.com/DJWoodZ/Satisfactory-Discord-Bot.git
cd Satisfactory-Discord-Bot
cp .env .env.local
```

You will need edit the `.env.local` file. See the [Environment Variables](#env-vars) section for details.

#### Running normally

```
docker compose up
```

#### Running in detached mode

To run as a service, use detached mode:

```
docker compose up -d
```

#### Force build and recreation

If you need to force Docker Compose to build the image and recreate the container, you can use the `--build` and `--force-recreate` options:

```
docker compose up --build --force-recreate
```

This can also be used with detached mode:

```
docker compose up -d --build --force-recreate
```

For a full list of options see the [`docker compose up`](https://docs.docker.com/engine/reference/commandline/compose_up/) documentation.

#### Interacting with the container

For development only.

If you need to interact with the container, you can use this command (assuming the container is named `satisfactory-discord-bot-server-1`):

```
docker exec -it satisfactory-discord-bot-server-1 /bin/sh
```