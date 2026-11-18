module.exports = {
  config: {
    name: "kick",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 1,
    description: { en: "Remove a joined user from this Matrix room" },
    category: "moderation",
    guide: { en: "{pn} @user:server [reason]" }
  },

  onStart: async function ({ args, event, api, message, prefix }) {
    const target = args[0];
    if (!/^@[^:\s]+:[^\s]+$/.test(target || "")) {
      return message.reply(`Usage: ${prefix}kick @user:server [reason]`);
    }
    if (target === event.sender || target === api.getCurrentUserID()) {
      return message.reply("You cannot kick yourself or the bot.");
    }
    if (!(await api.getJoinedRoomMembers(event.roomId)).includes(target)) {
      return message.reply(`${target} is not joined to this room.`);
    }

    const reason = args.slice(1).join(" ").trim() || "Removed by a room admin";
    await api.kickUser(target, event.roomId, reason);
    return message.reply(`Removed ${target} from this room.`);
  }
};
