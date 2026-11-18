module.exports = {
  config: {
    name: "surah",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Show the opening verses of a Quran surah" },
    category: "utility",
    guide: { en: "{pn} <1-114>" }
  },

  onStart: async function ({ args, message, prefix }) {
    const number = Number(args[0]);
    if (!Number.isInteger(number) || number < 1 || number > 114) {
      return message.reply(`Usage: ${prefix}surah <number from 1 to 114>`);
    }

    const [arabicResponse, englishResponse] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${number}`),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/en.sahih`)
    ]);
    if (!arabicResponse.ok || !englishResponse.ok) {
      throw new Error(`Quran service returned HTTP ${arabicResponse.status}/${englishResponse.status}`);
    }
    const [arabic, english] = await Promise.all([arabicResponse.json(), englishResponse.json()]);
    const surah = arabic.data;
    const translation = english.data;
    if (arabic.code !== 200 || english.code !== 200 || !surah?.ayahs?.length || !translation?.ayahs?.length) {
      throw new Error("Quran service returned invalid surah data");
    }

    return message.reply(
      `${surah.englishName} (${surah.name})\n` +
      `Surah ${surah.number} · ${surah.numberOfAyahs} ayahs · ${surah.revelationType}\n\n` +
      `First ayah:\n${surah.ayahs[0].text}\n\n${translation.ayahs[0].text}`
    );
  }
};
