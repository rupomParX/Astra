module.exports = {
  config: {
    name: "tid",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show this Matrix room ID" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ event, message }) {
    return message.reply(event.roomId);
  }
};
