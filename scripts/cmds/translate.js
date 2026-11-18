module.exports = {
  config: {
    name: "translate",
    platform: "matrix",
    aliases: ["trans"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Translate text using a target language code" },
    category: "utility",
    guide: { en: "{pn} <text> -> <language code>" }
  },

  onStart: async function ({ args, message, prefix }) {
    const input = args.join(" ").trim();
    const match = /^(.*?)\s*(?:->|=>)\s*([a-z]{2,3}(?:-[A-Z]{2})?)$/i.exec(input);
    if (!match || !match[1].trim()) {
      return message.reply(`Usage: ${prefix}translate <text> -> <language code>`);
    }

    const language = match[2].toLowerCase();
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: language,
      dt: "t",
      q: match[1].trim()
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation service returned HTTP ${response.status}`);
    const result = await response.json();
    const translated = result?.[0]?.map((part) => part?.[0] || "").join("");
    if (!translated) throw new Error("Translation service returned no text");
    return message.reply(`${translated}\n\nTranslated to ${language}.`);
  }
};
