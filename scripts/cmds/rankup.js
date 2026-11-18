module.exports = {
  config: {
    name: "rankup",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 1,
    description: { en: "Enable or disable rank-up announcements for this room" },
    category: "rank",
    guide: { en: "{pn} on | off" }
  },

  onStart: async function ({ args, event, rankStore, message }) {
    const setting = (args[0] || "").toLowerCase();
    if (setting !== "on" && setting !== "off") {
      return message.reply("Usage: !rankup on or !rankup off");
    }

    const enabled = setting === "on";
    rankStore.setRankupEnabled(event.roomId, enabled);
    return message.reply(`Rank-up announcements are now ${setting} for this room.`);
  }
};
