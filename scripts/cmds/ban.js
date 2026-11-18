module.exports = {
  config: {
    name: "ban",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 1,
    description: { en: "Ban or unban a Matrix user in this room" },
    category: "moderation",
    guide: { en: "{pn} @user:server [reason] | {pn} unban @user:server" }
  },

  onStart: async function ({ args, event, api, message, prefix }) {
    const action = (args[0] || "").toLowerCase();
    if (action === "unban") {
      const target = args[1];
      if (!/^@[^:\s]+:[^\s]+$/.test(target || "")) {
        return message.reply(`Usage: ${prefix}ban unban @user:server`);
      }
      if (target === api.getCurrentUserID()) return message.reply("The bot cannot unban itself.");
      await api.unbanUser(target, event.roomId);
      return message.reply(`Unbanned ${target} from this room.`);
    }

    const target = args[0];
    if (!/^@[^:\s]+:[^\s]+$/.test(target || "")) {
      return message.reply(`Usage: ${prefix}ban @user:server [reason]`);
    }
    if (target === event.sender || target === api.getCurrentUserID()) {
      return message.reply("You cannot ban yourself or the bot.");
    }
    const reason = args.slice(1).join(" ").trim() || "Banned by a room admin";
    await api.banUser(target, event.roomId, reason);
    return message.reply(`Banned ${target}. Reason: ${reason}`);
  }
};
