const BBCodeParser = require('bbcode-parser');
const BBTag = require('bbcode-parser/bbTag');
const escapeRegExp = require('lodash.escaperegexp');
const cloneDeep = require('lodash.clonedeep');
const moment = require('moment');

const defaultTag = {
  tagName: '',
  insertLineBreaks: false,
  suppressLineBreaks: false,
  noNesting: false, //Indicates if the tag supports nested tags
  markupGenerator: (tag, content, attr) => {
    return content;
  }
};

const cwTags = [
  {
    tagName: 'download',
    markupGenerator: (tag, content, attr) => {
      return `\n*FileName* : ${attr.attr}_${content}\n`;
    }
  },
  {
    tagName: 'info',
    markupGenerator: (tag, content) => {
      const str =
        '\n' +
        content.split('\n').map((l) => `> ${l ? l : '\u200c'}`).join('\n') +
        '\n';
      return str;
    }
  },
  {
    tagName: 'code',
    noNesting: true,
    markupGenerator: (tag, content) => {
      const str =
        '\n```\n' + content + '\n```\n';
      return str;
    }
  },
  {
    tagName: 'title',
    markupGenerator: (tag, content) => {
      return `*${content}*\n`;
    }
  },
  {
    tagName: 'task',
    markupGenerator: (tag, content) => {
      const str =
        '\n' +
        '> Task:\n' +
        content.split('\n').map((l) => `> ${l ? l : '\u200c'}`).join('\n') +
        '\n';
      return str;
    }
  },
  {
    tagName: 'qt',
    markupGenerator: (tag, content) => {
      const str =
        '\n' +
        '> QT:\n' +
        content.split('\n').map((l) => `> ${l ? l : '\u200c'}`).join('\n') +
        '\n';
      return str;
    }
  },
];

const cwSingleTags = [
  {
    tagName: 'qtmeta',
    markupGenerator: function (tag, content, attr) {
      const date = moment(parseInt(attr.time, 10) * 1000).locale('ja').format('LLL');
      const userName = this.userMap[attr.aid];
      const msg =
        `Said: ${userName ? userName : attr.attr }\n` +
        `Date: ${date}\n`;
      return msg;
    }
  },
  {
    tagName: 'hr',
    markupGenerator: () => {
      return '\n- - - - -\n';
    }
  },
  {
    tagName: 'To',
    markupGenerator: function (tag, content, attr) {
      const accountName = this.accountMap[attr.attr];
      return (accountName) ? `<@${accountName}> ` : `${content} `;
    }
  },
  {
    tagName: 'rp',
    markupGenerator: function (tag, content, attr) {
      const accountName = this.accountMap[attr.aid];
      return (accountName) ? `<@${accountName}> ` : 'Reply: ';
    }
  },
  {
    tagName: 'dtext',
    markupGenerator: (tag, content, attr) => {
      switch (attr.attr) {
      case 'task_added': return 'タスク追加';
      case 'file_uploaded': return ' \ud83d\udce4 ファイルアップロード';
      case 'chatroom_chat_edited': return 'チャット変更';
      case 'chatroom_member_is': return 'メンバー ';
      case 'chatroom_priv_changed': return ' を管理者にしました';
      case 'chatroom_added': return ' が入室しました';
      case 'chatroom_deleted': return ' が退室しました';
      case 'chatroom_chatname_is': return 'チャット名を\n';
      case 'chatroom_description_is': return '説明文を\n';
      case 'chatroom_changed': return '\nに変更しました';
      case 'chatroom_set': return '\nに設定しました';
      case 'chatroom_groupchat_created': return 'チャット作成';
      case 'task_done': return 'タスク終了';
      case 'nickname_suffix': return ' さん';
      case 'chatroom_over_groupchatnum': return ' は，制限により入室できません';
      default: return content;
      }
    }
  },
  {
    tagName: 'preview',
    markupGenerator: () => ''
  },
  {
    tagName: 'piconname',
    markupGenerator: function (tag, content, attr) {
      const userName = this.userMap[attr.attr];
      return (userName) ? ` ${userName} ` : content;
    }
  },
  {
    tagName: 'deleted',
    markupGenerator: () => ''
  },
];

const emojiMap = {
  ':)': ':slightly_smiling_face:',
  ':(': ':disappointed:',
  ':D': ':smiley:',
  '8-)': ':sunglasses:',
  ':o': ':hushed:',
  ';)': ':wink:',
  ';(': ':cry:',
  '(sweat)': ':sweat:',
  ':|': ':neutral_face:',
  ':*': ':kissing_heart:',
  ':p': ':yum:',
  '(blush)': ':blush:',
  ':^)': ':thinking_face:',
  '|-)': ':sleeping:',
  '(inlove)': ':heart_eyes:',
  ']:)': ':laughing:',
  '(talk)': ':speech_balloon:',
  '(yawn)': ':sleepy:',
  '(puke)': ':weary:',
  '(emo)': ':smirk:',
  '8-|': ':nerd:',
  ':#)': ':grin:',
  '(nod)': ':thumbsup:',
  '(shake)': ':confused:',
  '(^^;)': ':sweat_smile:',
  '(whew)': ':sweat_smile:',
  '(clap)': ':clap:',
  '(bow)': ':bow:',
  '(roger)': ':chatwork-roger:',
  '(flex)': ':muscle:',
  '(dance)': ':chatwork-dance:',
  '(:/)': ':scream:',
  '(devil)': ':smiling_imp:',
  '(*)': ':star:',
  '(h)': ':heart:',
  '(F)': ':blossom:',
  '(cracker)': ':tada:',
  '(^)': ':birthday:',
  '(coffee)': ':coffee:',
  '(beer)': ':beer:',
  '(handshake)': '\ud83e\udd1d',
  '(y)': ':thumbsup:'
};

class ChatWorkToSlack {

  constructor (userMap = {}, accountMap = {}) {
    this.userMap = userMap;
    this.accountMap = accountMap;
  }

  static get emojiMap () {
    return emojiMap;
  }

  get cwBBTags () {
    const cwTagsBinded =
      cwTags.map((t) => {
        const newTags = cloneDeep(t);
        newTags.markupGenerator = newTags.markupGenerator.bind(this);
        return newTags;
      });
    const cwBBTags = {};
    cwTagsBinded.map((cwTag) => {
      const props = Object.assign({}, defaultTag, cwTag);
      const cwBBTag = new BBTag(
        props.tagName, props.insertLineBreaks, props.suppressLineBreaks,
        props.noNesting, props.markupGenerator
      );
      cwBBTags[props.tagName] = cwBBTag;
    });
    return cwBBTags;
  }

  get cwSingleTags () {
    const cwSingleTagsBinded =
      cwSingleTags.map((t) => {
        const newTags = cloneDeep(t);
        newTags.markupGenerator = newTags.markupGenerator.bind(this);
        return newTags;
      });
    return cwSingleTagsBinded;
  }

  convert (string) {
    string = this.formatCwBBTagsAttr(string);
    string = this.replaceEmoji(string);
    string = this.replaceSingleTags(string);
    string = this.replaceCwBBTags(string);
    return string;
  }

  formatCwBBTagsAttr (string) {
    string = string.replace(/\[.*?\]/g, (match) => {
      return match
        .replace(/\[(\w+):/, '[$1 attr=')
        .replace(/\w+=[\w,-]+/g, (keyval) => {
          return keyval.replace(/(\w+)=([\w,-]+)/, (_, key, value) => {
            const escapedValue = value.replace(/,/g, '_').replace(/"/g, '\\"');
            return `${key}="${escapedValue}"`;
          });
        });
    });
    return string;
  }

  replaceCwBBTags (string) {
    const parser = new BBCodeParser(this.cwBBTags);
    const generated = parser.parseString(string);
    return generated
      .replace(/<\s*br\s*\/?\s*>/g, '\n')
      .replace(/&(?:amp|lt|gt);/g, (html) => {
        const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>' };
        return map[ html ];
      });
  }

  replaceSingleTags (string) {
    const cwSingleTags = this.cwSingleTags;
    string = string.replace(/\[.*?\]/g, (match) => {
      const tagName = (match.match(/\[(\w+)/) || [])[1];
      const replacer = cwSingleTags.filter((t) => t.tagName === tagName)[0];
      const attr = {};
      (match.match(/\w+="[\w,-]+"/g) || []).forEach((keyval) => {
        const [ , key, value] = keyval.match(/(\w+)="([\w,-]+)"/);
        attr[key] = value.replace(/\\"/g, '"');
      });
      return (replacer) ? replacer.markupGenerator(null, match, attr) : match;
    });
    return string;
  }

  replaceEmoji (string) {
    const emojiMap = ChatWorkToSlack.emojiMap;
    for (let cwEmoji in emojiMap) {
      const slackEmoji = emojiMap[ cwEmoji ];
      const escapedCwEmoji = escapeRegExp(cwEmoji);
      string = string.replace(new RegExp(escapedCwEmoji, 'g'), ` ${slackEmoji} `);
    }
    return string;
  }
}

module.exports = ChatWorkToSlack;
