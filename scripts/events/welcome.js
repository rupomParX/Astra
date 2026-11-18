module.exports = {
  config: {
    name: "welcome",
    version: "2.0",
    author: "Matrix Bot"
  },

  onEvent: async function ({ api, event, roomId, roomSettings }) {
    if (event.type !== "m.room.member" || event.content?.membership !== "join") return;
    const userId = event.state_key;
    if (!userId || userId === api.getCurrentUserID()) return;
    if (event.unsigned?.prev_content?.membership === "join") return;
    const settings = roomSettings.getWelcome(roomId);
    if (!settings.enabled) return;

    const userName = event.content.displayname || await api.getUserDisplayName(userId);
    const [membersCount, adminsCount, roomName] = await Promise.all([
      api.getRoomMemberCount(roomId),
      api.getRoomAdminCount(roomId),
      api.getRoomDisplayName(roomId)
    ]);
    const dateTime = new Date(event.origin_server_ts || Date.now()).toLocaleString();
    const template = settings.message || process.env.MATRIX_WELCOME_MESSAGE ||
      "Welcome {userName} to {roomName}! 🎉\nMembers: {membersCount} · Admins: {adminsCount}\nTime: {dateTime}";
    const text = template
      .replace(/\{userName\}/g, userName)
      .replace(/\{membersCount\}/g, String(membersCount))
      .replace(/\{adminsCount\}/g, String(adminsCount))
      .replace(/\{roomName\}/g, roomName)
      .replace(/\{dateTime\}/g, dateTime);

    await api.sendMessage(text, roomId);
  }
};
