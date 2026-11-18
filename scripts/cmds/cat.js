module.exports = {
  config: {
    name: "cat",
    platform: "matrix",
    aliases: ["catfact"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Send a random cat fact and image link" },
    category: "utility",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message }) {
    const [imageResponse, factResponse] = await Promise.all([
      fetch("https://api.thecatapi.com/v1/images/search"),
      fetch("https://catfact.ninja/fact")
    ]);
    if (!imageResponse.ok || !factResponse.ok) {
      throw new Error(`Cat services returned HTTP ${imageResponse.status}/${factResponse.status}`);
    }

    const [images, fact] = await Promise.all([imageResponse.json(), factResponse.json()]);
    if (!Array.isArray(images) || typeof images[0]?.url !== "string" || typeof fact?.fact !== "string") {
      throw new Error("Cat services returned an invalid response");
    }
    return message.reply(`${fact.fact}\n${images[0].url}`);
  }
};
