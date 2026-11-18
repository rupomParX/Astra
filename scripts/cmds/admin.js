module.exports = {
  config: {
    name: "admin",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "List admins in the current Matrix room" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const admins = await api.getRoomAdmins(event.roomId);
    return message.reply(admins.length
      ? `Room admins:\n${admins.join("\n")}`
      : "No room admins were identified from Matrix power levels.");
  }
};
