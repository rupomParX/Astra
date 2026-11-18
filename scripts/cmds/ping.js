module.exports = {
  config: {
    name: "ping",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Check that the bot is alive" },
    category: "utility",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    const latency = Date.now() - (event.origin_server_ts ?? Date.now());
    return message.reply(`Pong! (~${Math.max(latency, 0)} ms)`);
  }
};
