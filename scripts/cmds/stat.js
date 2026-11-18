module.exports = {
  config: {
    name: "stats",
    platform: "matrix",
    aliases: ["stat", "time"],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show bot uptime and joined room count" },
    category: "system",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, message, startedAt }) {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rooms = await api.getJoinedRooms();
    return message.reply(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds % 60}s\nJoined rooms: ${rooms.length}`);
  }
};
