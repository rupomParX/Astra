module.exports = {
  config: {
    name: "avatar",
    platform: "matrix",
    aliases: ["profile", "pfp"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 0,
    description: { en: "Show a Matrix user's avatar URL" },
    category: "profile",
    guide: { en: "{pn} [@user:server]" }
  },

  onStart: async function ({ args, event, api, message, prefix }) {
    const userId = args[0] || event.sender;
    if (!/^@[^:\s]+:[^\s]+$/.test(userId)) {
      return message.reply(`Usage: ${prefix}avatar [@user:server]`);
    }

    const [displayName, avatarUrl] = await Promise.all([
      api.getUserDisplayName(userId),
      api.getUserAvatarUrl(userId)
    ]);
    return message.reply(avatarUrl
      ? `${displayName} (${userId})\n${avatarUrl}`
      : `No avatar is set for ${displayName} (${userId}).`);
  }
};
