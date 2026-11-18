module.exports = {
  config: {
    name: "daily",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Claim 100 virtual coins once per UTC day" },
    category: "economy",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ event, economyStore, message }) {
    const result = economyStore.claimDaily(event.roomId, event.sender, 100);
    if (!result.claimed) return message.reply("You already claimed today's reward. Try again after 00:00 UTC.");
    return message.reply(`You received 100 coins. Your balance is now ${result.balance}.`);
  }
};
