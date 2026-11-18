function isMatrixUserId(value) {
  return /^@[^:\s]+:[^\s]+$/.test(value || "");
}

module.exports = {
  config: {
    name: "warn",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 1,
    description: { en: "Record and manage room warnings; three warnings trigger a ban" },
    category: "moderation",
    guide: { en: "{pn} @user:server [reason] | info @user:server | list | unwarn @user:server | reset confirm | unban @user:server" }
  },

  onStart: async function ({ args, event, api, message, prefix, roomSettings }) {
    const action = (args[0] || "").toLowerCase();
    if (action === "list") {
      const warnings = roomSettings.getWarnings(event.roomId);
      const lines = Object.entries(warnings)
        .map(([userId, records]) => `${userId}: ${records.length} warning(s)`)
        .sort();
      return message.reply(lines.join("\n") || "No warnings in this room.");
    }

    if (action === "info") {
      const target = args[1] || event.sender;
      if (!isMatrixUserId(target)) return message.reply(`Usage: ${prefix}warn info @user:server`);
      const records = roomSettings.getWarnings(event.roomId, target);
      return message.reply(records.length
        ? `${target} has ${records.length} warning(s):\n${records.map((item, index) => `${index + 1}. ${item.reason} (${item.timestamp})`).join("\n")}`
        : `${target} has no warnings.`);
    }

    if (action === "unwarn") {
      const target = args[1];
      if (!isMatrixUserId(target)) return message.reply(`Usage: ${prefix}warn unwarn @user:server`);
      const records = roomSettings.removeWarning(event.roomId, target);
      return message.reply(records.length
        ? `Removed the latest warning for ${target}. ${records.length} remain.`
        : `Removed the latest warning for ${target}.`);
    }

    if (action === "reset") {
      if (args[1]?.toLowerCase() !== "confirm") {
        return message.reply(`Confirm with ${prefix}warn reset confirm.`);
      }
      roomSettings.clearWarnings(event.roomId);
      return message.reply("Cleared all warning records for this room.");
    }

    if (action === "unban") {
      const target = args[1];
      if (!isMatrixUserId(target)) return message.reply(`Usage: ${prefix}warn unban @user:server`);
      await api.unbanUser(target, event.roomId);
      roomSettings.clearWarnings(event.roomId, target);
      return message.reply(`Unbanned ${target} and cleared their warnings.`);
    }

    const target = isMatrixUserId(args[0]) ? args[0] : "";
    if (!target || target === event.sender || target === api.getCurrentUserID()) {
      return message.reply(`Usage: ${prefix}warn @user:server [reason]`);
    }
    if (!(await api.getJoinedRoomMembers(event.roomId)).includes(target)) {
      return message.reply(`${target} is not joined to this room.`);
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided";
    const existing = roomSettings.getWarnings(event.roomId, target);
    const records = existing.length >= 3
      ? existing
      : roomSettings.addWarning(event.roomId, target, reason);
    if (records.length < 3) {
      return message.reply(`Warned ${target} (${records.length}/3). Reason: ${reason}`);
    }

    try {
      await api.banUser(target, event.roomId, `Three warnings: ${reason}`);
      return message.reply(`${target} reached three warnings and was banned. Reason: ${reason}`);
    } catch (error) {
      console.error(`Could not ban ${target} after three warnings:`, error);
      return message.reply(`${target} has three warnings, but Matrix could not ban them. Check the bot's room power level.`);
    }
  }
};
