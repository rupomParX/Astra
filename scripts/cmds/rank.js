function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[character]);
}

function color(value, fallback) {
  if (Array.isArray(value)) value = value[0];
  return /^#[\da-f]{6}$/i.test(value || "") ? value : fallback;
}

function levelForExperience(exp) {
  return Math.floor((1 + Math.sqrt(1 + (8 * Math.max(0, exp)) / 7)) / 2);
}

function renderCard({ name, exp, place, total, theme, avatar }) {
  const level = levelForExperience(exp);
  const currentLevelStart = Math.floor(((level * level) - level) * 7 / 2);
  const nextLevelStart = Math.floor((((level + 1) * (level + 1)) - (level + 1)) * 7 / 2);
  const needed = Math.max(1, nextLevelStart - currentLevelStart);
  const progress = Math.min(1, Math.max(0, (exp - currentLevelStart) / needed));
  const background = color(theme.main_color, "#20243a");
  const subColor = color(theme.sub_color, "#ffffff");
  const lineColor = color(theme.line_color, "#ffffff");
  const trackColor = color(theme.expNextLevel_color, "#ffffff");
  const panelOpacity = Number.isFinite(theme.alpha_subcard)
    ? Math.min(1, Math.max(0, theme.alpha_subcard))
    : 0.08;
  const barColor = color(theme.exp_color, "#67e8f9");
  const textColor = color(theme.text_color, "#f8fafc");
  const nameColor = color(theme.name_color, textColor);
  const levelColor = color(theme.level_color, "#a5b4fc");
  const rankColor = color(theme.rank_color, "#facc15");
  const label = escapeXml(name);
  const barWidth = Math.round(progress * 680);
  const avatarImage = avatar
    ? `<image href="${escapeXml(avatar)}" xlink:href="${escapeXml(avatar)}" x="64" y="96" width="128" height="128" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
    : `<circle cx="128" cy="160" r="64" fill="${textColor}" fill-opacity="0.12"/>
       <circle cx="128" cy="143" r="19" fill="${textColor}" fill-opacity="0.55"/>
       <path d="M82 220c5-25 21-38 46-38s41 13 46 38" fill="${textColor}" fill-opacity="0.55"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1000" height="320" viewBox="0 0 1000 320">
    <defs><clipPath id="avatarClip"><circle cx="128" cy="160" r="64"/></clipPath></defs>
    <rect width="1000" height="320" rx="28" fill="${background}"/>
    <rect x="28" y="28" width="944" height="264" rx="20" fill="${subColor}" fill-opacity="${panelOpacity}" stroke="${lineColor}" stroke-opacity="0.35"/>
    ${avatarImage}
    <text x="224" y="115" fill="${nameColor}" font-family="sans-serif" font-size="38" font-weight="700">${label}</text>
    <text x="224" y="166" fill="${levelColor}" font-family="sans-serif" font-size="28">Level ${level}</text>
    <text x="920" y="166" fill="${rankColor}" font-family="sans-serif" font-size="25" text-anchor="end">#${place} / ${total}</text>
    <rect x="224" y="204" width="680" height="22" rx="11" fill="${trackColor}" fill-opacity="0.4"/>
    <rect x="224" y="204" width="${barWidth}" height="22" rx="11" fill="${barColor}"/>
    <text x="224" y="266" fill="${textColor}" font-family="sans-serif" font-size="20">${exp - currentLevelStart} / ${needed} XP to next level</text>
  </svg>`;
}

module.exports = {
  config: {
    name: "rank",
    platform: "matrix",
    aliases: ["level"],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 3,
    role: 0,
    description: { en: "Show your Matrix room rank and experience" },
    category: "rank",
    guide: { en: "{pn} [Matrix user ID]" }
  },

  onStart: async function ({ api, event, args, rankStore, message }) {
    const target = args[0] || event.sender;
    if (!/^@[^:\s]+:[^\s]+$/.test(target)) {
      return message.reply("Usage: !rank [@user:server]");
    }

    const [user, users] = [rankStore.getUser(event.roomId, target), rankStore.getUsers(event.roomId)];
    const index = users.findIndex((entry) => entry.userId === target);
    const [name, avatar] = await Promise.all([
      api.getUserDisplayName(target),
      api.getUserAvatarDataUri(target)
    ]);
    const svg = renderCard({
      name,
      avatar,
      exp: user.exp,
      place: index < 0 ? users.length + 1 : index + 1,
      total: Math.max(users.length, index + 1),
      theme: rankStore.getRankCard(event.roomId)
    });

    return api.sendRankCard(svg, event.roomId);
  }
};
