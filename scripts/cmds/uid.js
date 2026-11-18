module.exports = {
  config: {
    name: "uid",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show your Matrix user ID or another user's ID" },
    category: "info",
    guide: { en: "{pn} [@user:server]" }
  },

  onStart: async function ({ args, event, message, prefix }) {
    const userId = args[0] || event.sender;
    if (!/^@[^:\s]+:[^\s]+$/.test(userId)) {
      return message.reply(`Usage: ${prefix}uid [@user:server]`);
    }
    return message.reply(userId);
  }
};
