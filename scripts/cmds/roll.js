module.exports = {
  config: {
    name: "roll",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "Roll dice, for example 2d6" },
    category: "games",
    guide: { en: "{pn} [NdM]" }
  },

  onStart: async function ({ message, args }) {
    const match = /^(\d{1,2})?d(\d{1,4})$/i.exec(args[0] ?? "1d6");
    if (!match) {
      return message.reply("Usage: !roll [NdM], e.g. 2d6");
    }

    const count = Math.max(1, parseInt(match[1] ?? "1", 10));
    const sides = Math.max(2, parseInt(match[2], 10));
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    return message.reply(`🎲 ${rolls.join(" + ")} = ${total}`);
  }
};
