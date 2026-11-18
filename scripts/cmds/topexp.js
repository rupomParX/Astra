module.exports = {
  config: {
    name: "topexp",
    platform: "matrix",
    aliases: ["ranktop"],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show the top 10 users by Matrix room XP" },
    category: "rank",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ event, rankStore, message }) {
    const leaders = rankStore.getUsers(event.roomId).slice(0, 10);
    if (!leaders.length) return message.reply("No room XP has been recorded yet.");
    const lines = leaders.map((user, index) => `${index + 1}. ${user.userId} — ${user.exp} XP`);
    return message.reply(`Top room ranks:\n${lines.join("\n")}`);
  }
};
