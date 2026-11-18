module.exports = {
  config: {
    name: "setleave",
    platform: "matrix",
    aliases: ["setl"],
    version: "2.0",
    author: "Matrix Bot",
    role: 1,
    description: { en: "Configure leave messages for room departures" },
    category: "settings",
    guide: { en: "{pn} on|off|text <message>|text reset" }
  },

  onStart: async function ({ args, event, roomSettings, message, prefix }) {
    const action = (args[0] || "").toLowerCase();
    const settings = roomSettings.getLeave(event.roomId);
    if (action === "on" || action === "off") {
      roomSettings.setLeave(event.roomId, action === "on", settings.message);
      return message.reply(`Leave messages are now ${action}.`);
    }
    if (action === "text") {
      if (args[1]?.toLowerCase() === "reset") {
        roomSettings.setLeave(event.roomId, settings.enabled, undefined);
        return message.reply("Leave message reset to the default.");
      }
      const text = args.slice(1).join(" ").trim();
      if (!text) return message.reply(`Usage: ${prefix}setleave text <message>`);
      roomSettings.setLeave(event.roomId, settings.enabled, text.slice(0, 1000));
      return message.reply("Leave message updated.");
    }
    return message.reply(`Usage: ${prefix}setleave on|off|text <message>|text reset`);
  }
};
