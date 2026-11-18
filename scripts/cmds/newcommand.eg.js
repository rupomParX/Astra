module.exports = {
  config: {
    name: "newcommand",
    aliases: [],
    version: "1.0",
    author: "Your name",
    countDown: 3,
    role: 0,
    description: { en: "Describe what this command does" },
    category: "utility",
    guide: { en: "{pn} [text]" }
  },

  onStart: async function ({ message, args }) {
    return message.reply(args.join(" ") || "Your command is ready!");
  }
};
