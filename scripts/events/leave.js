module.exports = {
  config: {
    name: "leave",
    version: "2.0",
    author: "Matrix Bot"
  },

  onEvent: async function ({ api, event, roomId, roomSettings }) {
    if (event.type !== "m.room.member" || event.content?.membership !== "leave") return;
    const userId = event.state_key;
    if (!userId || userId === api.getCurrentUserID()) return;
    if (event.unsigned?.prev_content?.membership !== "join") return;
    const settings = roomSettings.getLeave(roomId);
    if (!settings.enabled) return;

    const userName = event.unsigned?.prev_content?.displayname ||
      await api.getUserDisplayName(userId);
    const roomName = await api.getRoomDisplayName(roomId);
    const type = event.sender === userId ? "left" : "was removed from";
    const template = settings.message || process.env.MATRIX_LEAVE_MESSAGE ||
      "{userName} {type} {roomName}.";
    const text = template
      .replace(/\{userName\}/g, userName)
      .replace(/\{type\}/g, type)
      .replace(/\{roomName\}/g, roomName);

    await api.sendMessage(text, roomId);
  }
};
