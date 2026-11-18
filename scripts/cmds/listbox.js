module.exports = {
  config: {
    name: "listbox",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 2,
    description: { en: "List rooms the bot has joined (bot admins only)" },
    category: "admin",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, message }) {
    const rooms = await api.getJoinedRooms();
    const names = await Promise.all(rooms.map((roomId) => api.getRoomDisplayName(roomId)));
    const lines = rooms.map((roomId, index) => `${index + 1}. ${names[index]} (${roomId})`);
    return message.reply(lines.join("\n") || "The bot has not joined any rooms.");
  }
};
