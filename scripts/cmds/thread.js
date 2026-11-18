module.exports = {
  config: {
    name: "thread",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show information about the current Matrix room" },
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const [name, members, admins] = await Promise.all([
      api.getRoomDisplayName(event.roomId),
      api.getRoomMemberCount(event.roomId),
      api.getRoomAdminCount(event.roomId)
    ]);
    return message.reply(`Room: ${name}\nRoom ID: ${event.roomId}\nMembers: ${members}\nAdmins: ${admins}`);
  }
};
