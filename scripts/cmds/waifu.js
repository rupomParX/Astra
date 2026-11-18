const categories = [
  "waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "kiss",
  "hug", "awoo", "pat", "smug", "bonk", "yeet", "blush", "smile", "wave",
  "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill", "kick",
  "happy", "wink", "poke", "dance", "cringe", "tickle"
];

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  config: {
    name: "waifu",
    platform: "matrix",
    aliases: ["neko", "shinobu", "megumin"],
    version: "1.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 0,
    category: "anime",
    description: { en: "Get a SFW anime image" },
    guide: { en: "{pn} [category]" }
  },

  onStart: async function ({ api, event, args, message, prefix }) {
    const invocation = event.body.trim().split(/\s+/)[0].slice(prefix.length).toLowerCase();
    const aliasCategory = ["neko", "shinobu", "megumin"].includes(invocation) ? invocation : "waifu";
    const requested = (args[0] || aliasCategory).toLowerCase();
    if (!categories.includes(requested)) {
      return message.reply(`Unknown category. Choose one of: ${categories.join(", ")}`);
    }

    const response = await fetch(`https://nekos.best/api/v2/${encodeURIComponent(requested)}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Anime image API returned HTTP ${response.status}`);

    const payload = await response.json();
    const item = isRecord(payload) && Array.isArray(payload.results) ? payload.results[0] : undefined;
    if (!isRecord(item) || typeof item.url !== "string") {
      throw new Error("Anime image API returned an invalid result");
    }
    const imageUrl = new URL(item.url);
    if (imageUrl.protocol !== "https:"
      || (imageUrl.hostname !== "nekos.best" && !imageUrl.hostname.endsWith(".nekos.best"))) {
      throw new Error("Anime image API returned an unsupported image host");
    }

    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      redirect: "error"
    });
    const contentType = (imageResponse.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!imageResponse.ok) throw new Error(`Anime image host returned HTTP ${imageResponse.status}`);
    if (!/^image\/(png|jpeg|gif|webp)$/.test(contentType)) {
      throw new Error(`Anime image host returned an unsupported content type: ${contentType || "unknown"}`);
    }
    const contentLength = Number(imageResponse.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) {
      throw new Error("Anime image exceeds the 8 MB limit");
    }
    const reader = imageResponse.body?.getReader();
    if (!reader) throw new Error("Anime image response did not contain a readable body");
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Anime image exceeds the 8 MB limit");
      }
      chunks.push(Buffer.from(value));
    }
    if (!size) throw new Error("Anime image is empty");
    const data = Buffer.concat(chunks, size);

    const mxcUrl = await api.uploadMedia(data, contentType, `waifu.${contentType.split("/")[1]}`);
    const anime = typeof item.anime_name === "string" ? item.anime_name : "Original / Unknown";
    return api.sendMedia(event.roomId, "m.image", mxcUrl, `Category: ${requested}\nAnime: ${anime}`, {
      mimetype: contentType,
      size: data.length
    });
  }
};
