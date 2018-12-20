const fs = require('fs-promise');
const stringify = require('csv-stringify');
const parse = require('csv-parse');
const pify = require('pify');
const glob = pify(require('glob'));
const path = require('path');
const ChatWorkToSlack = require('./chatwork-to-slack');

const cwUsers = require('./cw_users');
const cwUserNameMap = {};
const cwUserAccountMap = {};
const cwUserNameAccountMap = {};
cwUsers.forEach((user) => {
  cwUserNameMap[ user.id ] = user.name;
  cwUserAccountMap[ user.id ] = user.account.toLowerCase();
  cwUserNameAccountMap[ user.name ] = user.account.toLowerCase();
});

const converter = new ChatWorkToSlack(cwUserNameMap, cwUserAccountMap);

const parseCSV = (data) => {
  return pify(parse)(data, {
    columns: [
      'timestamp', 'name', 'message'
    ]
  });
};
const stringifyToCSV = (arrays) => {
  return pify(stringify)(arrays, { escape: '\\' });
};

glob('./exports/*.csv')
  .then((files) => files.map((f) => path.basename(f)))
  .then((files) => {
    return Promise.all(files.map((f) => {
      const chatName = f.match(/^\d+/)[0];
      return fs.readFile(path.join('./exports', f), 'utf8')
        .then(parseCSV)
        .then((csv) => {
          csv
            .map((chat) => {
              chat.message = converter.convert(chat.message);
              chat.timestamp = Number(new Date(chat.timestamp)) / 1000;
              chat.account = cwUserNameAccountMap[chat.name] || `cw_${chat.name}`;
              return chat;
            })
            .filter((chat) => chat.message);
          return csv;
        })
        .then((csv) => {
          return csv
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((chat) => [ chat.timestamp, chatName, chat.account, chat.message ]);
        })
        .then((csv) => {
          return stringifyToCSV(csv);
        })
        .then((data) => {
          return fs.writeFile(path.join('./converted', f), data);
        });
    }));
  })
  .catch((err) => console.error(err.stack || err));
