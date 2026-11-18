module.exports = {
  config: {
    name: "unsend",
    platform: "matrix",
    aliases: ["unsent", "uns"],
    version: "1.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Redact one of the bot's messages" },
    category: "moderation",
    guide: { en: "Reply to a bot message with {pn}" }
  },

  onStart: async function ({ message, event, api }) {
    const relation = event.event?.content?.["m.relates_to"]?.["m.in_reply_to"];
    const targetEventId = relation?.event_id;
    if (typeof targetEventId !== "string") {
      return message.reply("Reply to a message sent by the bot, then run !unsend.");
    }

    const sender = await api.getMessageSender(event.roomId, targetEventId);
    if (sender !== api.getCurrentUserID()) {
      return message.reply("I can only unsend messages sent by this bot.");
    }

    await api.redactMessage(event.roomId, targetEventId);
    return message.reply("Message redacted.");
  }
};
