const presets = {
  demon: {
    main_color: "#0f0f12",
    exp_color: "#ff4500",
    text_color: "#f0f0f0",
    name_color: "#ff3344",
    rank_color: "#ff7b00",
    level_color: "#ff0055"
  },
  cyberpunk: {
    main_color: "#0b0c10",
    exp_color: "#66fcf1",
    text_color: "#c5c6c7",
    name_color: "#66fcf1",
    rank_color: "#45a29e",
    level_color: "#66fcf1"
  },
  ocean: {
    main_color: "#000032",
    exp_color: "#0a9396",
    text_color: "#e9d8a6",
    name_color: "#94d2bd",
    rank_color: "#ee9b00",
    level_color: "#0a9396"
  }
};

const colorKeys = {
  maincolor: "main_color",
  background: "main_color",
  subcolor: "sub_color",
  linecolor: "line_color",
  expcolor: "exp_color",
  progresscolor: "exp_color",
  expbarcolor: "expNextLevel_color",
  textcolor: "text_color",
  namecolor: "name_color",
  rankcolor: "rank_color",
  levelcolor: "level_color"
};

module.exports = {
  config: {
    name: "customrankcard",
    platform: "matrix",
    aliases: ["crc", "customrank"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 0,
    description: { en: "Customize your room's rank card theme" },
    category: "rank",
    guide: { en: "{pn} preset <demon|cyberpunk|ocean> | {pn} <color> <#RRGGBB> | {pn} alphasubcolor <0-1> | {pn} reset" }
  },

  onStart: async function ({ args, event, rankStore, message }) {
    const [option, value] = args;
    if (!option) {
      return message.reply("Usage: !customrankcard preset <demon|cyberpunk|ocean>, !customrankcard <color> <#RRGGBB>, or !customrankcard reset");
    }

    if (option.toLowerCase() === "reset") {
      rankStore.setRankCard(event.roomId, {});
      return message.reply("Rank card theme reset to the default.");
    }

    if (option.toLowerCase() === "preset") {
      const preset = presets[(value || "").toLowerCase()];
      if (!preset) {
        return message.reply("Unknown preset. Choose demon, cyberpunk, or ocean.");
      }
      rankStore.setRankCard(event.roomId, preset);
      return message.reply(`Applied the ${value.toLowerCase()} rank card preset. Try !rank to preview it.`);
    }

    if (["alphasubcolor", "alphasubcard"].includes(option.toLowerCase())) {
      const alpha = Number(value);
      if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
        return message.reply("Opacity must be a number from 0 to 1.");
      }
      const theme = rankStore.getRankCard(event.roomId);
      theme.alpha_subcard = alpha;
      rankStore.setRankCard(event.roomId, theme);
      return message.reply("Updated card panel opacity. Try !rank to preview it.");
    }

    const key = colorKeys[option.toLowerCase()];
    if (!key) {
      return message.reply(`Unknown setting. Available colors: ${Object.keys(colorKeys).join(", ")}.`);
    }
    if (!/^#[\da-f]{6}$/i.test(value || "")) {
      return message.reply("Use a six-digit hex color, for example #39aaff.");
    }

    const theme = rankStore.getRankCard(event.roomId);
    theme[key] = value;
    rankStore.setRankCard(event.roomId, theme);
    return message.reply(`Updated ${option.toLowerCase()} to ${value}. Try !rank to preview it.`);
  }
};
