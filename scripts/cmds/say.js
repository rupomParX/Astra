module.exports = {
  config: {
    name: "say",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 2,
    description: { en: "Make the bot send a message (bot admin only)" },
    category: "admin",
    guide: { en: "{pn} <text>" }
  },

  onStart: async function ({ api, event, args }) {
    if (!args.length) {
      return;
    }
    return api.sendMessage(args.join(" "), event.threadID);
  }
};
