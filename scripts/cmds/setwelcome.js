module.exports = {
  config: {
    name: "setwelcome",
    platform: "matrix",
    aliases: ["setwc"],
    version: "2.0",
    author: "Matrix Bot",
    role: 1,
    description: { en: "Configure welcome messages for room joins" },
    category: "settings",
    guide: { en: "{pn} on|off|text <message>|text reset" }
  },

  onStart: async function ({ args, event, roomSettings, message, prefix }) {
    const action = (args[0] || "").toLowerCase();
    const settings = roomSettings.getWelcome(event.roomId);
    if (action === "on" || action === "off") {
      roomSettings.setWelcome(event.roomId, action === "on", settings.message);
      return message.reply(`Welcome messages are now ${action}.`);
    }
    if (action === "text") {
      if (args[1]?.toLowerCase() === "reset") {
        roomSettings.setWelcome(event.roomId, settings.enabled, undefined);
        return message.reply("Welcome message reset to the default.");
      }
      const text = args.slice(1).join(" ").trim();
      if (!text) return message.reply(`Usage: ${prefix}setwelcome text <message>`);
      roomSettings.setWelcome(event.roomId, settings.enabled, text.slice(0, 1000));
      return message.reply("Welcome message updated.");
    }
    return message.reply(`Usage: ${prefix}setwelcome on|off|text <message>|text reset`);
  }
};
