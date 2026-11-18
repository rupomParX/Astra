module.exports = {
  config: {
    name: "prefix",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 1,
    description: { en: "View or change this room's command prefix" },
    category: "settings",
    guide: { en: "{pn} [new prefix|reset]" }
  },

  onStart: async function ({ args, event, prefix, roomSettings, message }) {
    if (!args.length) {
      return message.reply(`This room's command prefix is "${prefix}".`);
    }

    if (args[0].toLowerCase() === "reset") {
      roomSettings.setPrefix(event.roomId, undefined);
      return message.reply(`Room prefix reset to "${process.env.PREFIX || "!"}".`);
    }

    const newPrefix = args.join(" ");
    if (newPrefix.length > 8 || /\s/.test(newPrefix)) {
      return message.reply("Prefix must be 1-8 characters and contain no spaces.");
    }

    roomSettings.setPrefix(event.roomId, newPrefix);
    return message.reply(`Room prefix changed to "${newPrefix}".`);
  }
};
