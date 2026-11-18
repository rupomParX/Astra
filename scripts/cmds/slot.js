module.exports = {
  config: {
    name: "slot",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 0,
    description: { en: "Bet virtual coins on a 50/50 slot game" },
    category: "games",
    guide: { en: "{pn} <bet>" }
  },

  onStart: async function ({ args, event, economyStore, message, prefix }) {
    const bet = Number(args[0]);
    if (!Number.isSafeInteger(bet) || bet < 1) {
      return message.reply(`Usage: ${prefix}slot <positive whole-number bet>`);
    }
    const balance = economyStore.getBalance(event.roomId, event.sender);
    if (bet > balance) return message.reply(`You have ${balance} coins, not enough for that bet.`);

    const won = Math.random() < 0.5;
    const newBalance = economyStore.adjustBalance(event.roomId, event.sender, won ? bet : -bet);
    return message.reply(`${won ? `You won ${bet} coins!` : `You lost ${bet} coins.`} Balance: ${newBalance}.`);
  }
};
