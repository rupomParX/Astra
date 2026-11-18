module.exports = {
  config: {
    name: "echo",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Repeat your message" },
    category: "utility",
    guide: { en: "{pn} <text>" }
  },

  onStart: async function ({ message, args }) {
    if (!args.length) {
      return message.reply("Usage: !echo <text>");
    }
    return message.reply(args.join(" "));
  }
};
