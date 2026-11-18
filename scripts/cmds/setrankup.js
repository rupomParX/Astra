module.exports = {
  config: {
    name: "setrankup",
    platform: "matrix",
    version: "1.0",
    author: "Matrix Bot",
    countDown: 0,
    role: 1,
    description: { en: "Configure rank-up announcements for this room" },
    category: "rank",
    guide: { en: "{pn} text <message> | on | off | reset" }
  },

  onStart: async function ({ args, event, rankStore, message }) {
    const action = (args[0] || "").toLowerCase();
    if (action === "text") {
      const template = args.slice(1).join(" ").trim();
      if (!template) return message.reply("Usage: !setrankup text <message>");
      rankStore.setRankupMessage(event.roomId, template);
      return message.reply("Rank-up announcement message updated.");
    }
    if (action === "on" || action === "off") {
      rankStore.setRankupEnabled(event.roomId, action === "on");
      return message.reply(`Rank-up announcements are now ${action} for this room.`);
    }
    if (action === "reset") {
      rankStore.setRankupMessage(event.roomId, undefined);
      return message.reply("Rank-up announcement message reset to the default.");
    }

    return message.reply("Usage: !setrankup text <message>, !setrankup on, !setrankup off, or !setrankup reset");
  }
};
