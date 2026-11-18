module.exports = {
  config: {
    name: "count",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show the number of joined room members" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const count = await api.getRoomMemberCount(event.roomId);
    return message.reply(`This room has ${count} joined members.`);
  }
};
