module.exports = {
  config: {
    name: "yt",
    platform: "matrix",
    aliases: ["youtube", "yts"],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    category: "media",
    description: { en: "Search YouTube and get a link to the results" },
    guide: { en: "{pn} <search terms>" }
  },

  onStart: async function ({ args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: !yt <search terms>");

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return message.reply(`YouTube results for "${query}":\n${searchUrl}`);
  }
};
