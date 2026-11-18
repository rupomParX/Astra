module.exports = {
  config: {
    name: "hello",
    platform: "matrix",
    aliases: ["hi"],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Say hello" },
    category: "utility",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    return message.reply(`Hello ${event.sender}!`);
  }
};
