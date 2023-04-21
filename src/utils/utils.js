const _ = require('lodash');

const utils = {
  getDefaultDatabase: () => (_.cloneDeep({
    server: {
      version: '',
      online: false,
      unreachable: false,
    },
    players: {},
  })),

  formatList: (list) => {
    const formatter = new Intl.ListFormat('en', { style: 'long', type: 'disjunction' });
    return formatter.format(_.cloneDeep(list).sort());
  },

  formatMinutes: (minutes) => {
    const remainingDays = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;

    let string = '';
    if (remainingDays > 0) {
      string += `${remainingDays} day${(remainingDays !== 1 ? 's' : '')}, `;
    }
    if (remainingDays > 0 || remainingHours > 0) {
      string += `${remainingHours} hour${(remainingHours !== 1 ? 's' : '')} and `;
    }
    return `${string}${remainingMinutes} minute${(remainingMinutes !== 1 ? 's' : '')}`;
  },

  formatPlayers: (players) => {
    const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
    return formatter.format(players.map(({ name }) => name)
      .sort((playerA, playerB) => playerA.toLowerCase()
        .localeCompare(playerB.toLowerCase())));
  },

  getOnlinePlayers: (db) => Object.values(db.players).filter((player) => player.joined > 0),

  getTimestamp: () => `<t:${Math.floor(new Date().getTime() / 1000)}>`,
};

module.exports = utils;
