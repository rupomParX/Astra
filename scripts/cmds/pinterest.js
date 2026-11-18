module.exports = {
  config: {
    name: "pinterest",
    platform: "matrix",
    aliases: ["pin"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Open a Pinterest search link" },
    category: "media",
    guide: { en: "{pn} <search terms>" }
  },

  onStart: async function ({ args, message, prefix }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply(`Usage: ${prefix}pinterest <search terms>`);
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    return message.reply(`Pinterest search for "${query}": ${url}`);
  }
};
