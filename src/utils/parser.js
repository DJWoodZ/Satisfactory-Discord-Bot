const logFileOpenRegex = /Log file open, (.*)$/;
const logFileCommandLineRegex = /^LogInit: Command Line: (.*)$/;
const loginRequestRegex = /^\[(.+?)\]\[.+\]LogNet: Login request: .*\?Name=(.*?)? userId: (.*)? platform: .*$/;
const joinRequestRegex = /^\[(.+?)\]\[.+\]LogNet: Join request: .*\?Name=(.*?)?\?SplitscreenCount=.*$/;
const joinSucceededRegex = /^\[(.+?)\]\[.+\]LogNet: Join succeeded: (.*?)?$/;
const connectionCloseRegex = /^\[(.+?)\]\[.+\]LogNet: UNetConnection::Close: .*, Driver: GameNetDriver .*, UniqueId: (.*?),.*$/;

const parseTimestamp = (timestamp) => Date.parse(
  `${timestamp.replace('-', 'T')
    .replace(':', '.')
    .replace('.', '-')
    .replace('.', '-')
    .replace('.', ':')
    .replace('.', ':')}Z`,
);

const parser = {
  parse: (message) => {
    const logFileOpen = message.match(logFileOpenRegex);
    const logFileCommandLine = message.match(logFileCommandLineRegex);
    const loginRequest = message.match(loginRequestRegex);
    const joinRequest = message.match(joinRequestRegex);
    const joinSucceeded = message.match(joinSucceededRegex);
    const connectionClose = message.match(connectionCloseRegex);

    if (Array.isArray(logFileOpen)) {
      return {
        type: 'Log file open',
        date: logFileOpen[1],
      };
    }

    if (Array.isArray(logFileCommandLine)) {
      return {
        type: 'Command line',
        commandLine: logFileCommandLine[1],
      };
    }

    if (Array.isArray(loginRequest)) {
      return {
        type: 'Login request',
        timestamp: parseTimestamp(loginRequest[1]),
        name: loginRequest[2],
        userId: loginRequest[3],
      };
    }

    if (Array.isArray(joinRequest)) {
      return {
        type: 'Join request',
        timestamp: parseTimestamp(joinRequest[1]),
        name: joinRequest[2],
      };
    }

    if (Array.isArray(joinSucceeded)) {
      return {
        type: 'Join succeeded',
        timestamp: parseTimestamp(joinSucceeded[1]),
        name: joinSucceeded[2],
      };
    }

    if (Array.isArray(connectionClose)) {
      return {
        type: 'Connection close',
        timestamp: parseTimestamp(connectionClose[1]),
        userId: connectionClose[2],
      };
    }

    return null;
  },
};

module.exports = parser;
