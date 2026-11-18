module.exports = {
  config: {
    name: "clear",
    platform: "matrix",
    aliases: ["cl"],
    author: "Rupom Par",
    version: "2.0",
    countDown: 5,
    role: 1,
    description: { en: "Redact recent messages sent by the bot in this room" },
    category: "moderation",
    guide: { en: "{pn} [1-100]" }
  },
  onStart: async function ({ api, event, args, message, prefix }) {
    const limit = args[0] === undefined ? 50 : Number(args[0]);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return message.reply(`Usage: ${prefix}clear [1-100]`);
    }

    const recentMessages = await api.getRoomMessages(event.roomId, limit);
    const botUserId = api.getCurrentUserID();
    const botMessages = recentMessages.filter((item) => item.sender === botUserId);
    if (!botMessages.length) {
      return message.reply(`No bot messages found among the most recent ${limit} room messages.`);
    }

    let redacted = 0;
    try {
      for (const item of botMessages) {
        await api.redactMessage(event.roomId, item.eventId);
        redacted += 1;
      }
    } catch (error) {
      console.error("Could not redact recent bot messages:", error);
      return message.reply(`Redacted ${redacted} of ${botMessages.length} bot messages. Matrix rejected a redaction; check the bot's room permissions.`);
    }

    return message.reply(`Redacted ${redacted} bot message${redacted === 1 ? "" : "s"}.`);
  }
};