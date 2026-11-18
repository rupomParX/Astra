module.exports = {
  config: {
    name: "uptime",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Show how long the bot has been running" },
    category: "utility",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, startedAt }) {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return message.reply(`Up for ${days}d ${hours}h ${minutes}m ${seconds % 60}s`);
  }
};
