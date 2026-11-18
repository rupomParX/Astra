module.exports = {
  config: {
    name: "set",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 2,
    description: { en: "Set a user's virtual coin balance (bot admins only)" },
    category: "admin",
    guide: { en: "{pn} money @user:server <amount>" }
  },

  onStart: async function ({ args, event, economyStore, message, prefix }) {
    if (args[0]?.toLowerCase() !== "money" || !/^@[^:\s]+:[^\s]+$/.test(args[1] || "")) {
      return message.reply(`Usage: ${prefix}set money @user:server <amount>`);
    }
    const amount = Number(args[2]);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) {
      return message.reply("Amount must be a whole number between 0 and 1,000,000,000.");
    }
    economyStore.setBalance(event.roomId, args[1], amount);
    return message.reply(`Set ${args[1]}'s balance to ${amount} coins.`);
  }
};
