module.exports = {
  config: {
    name: "balance",
    platform: "matrix",
    aliases: ["bal"],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Check your room wallet or another user's balance" },
    category: "economy",
    guide: { en: "{pn} [@user:server]" }
  },

  onStart: async function ({ args, event, economyStore, message, prefix }) {
    const userId = args[0] || event.sender;
    if (!/^@[^:\s]+:[^\s]+$/.test(userId)) {
      return message.reply(`Usage: ${prefix}balance [@user:server]`);
    }
    return message.reply(`${userId} has ${economyStore.getBalance(event.roomId, userId)} coins.`);
  }
};
