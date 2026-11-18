# Matrix Home Bot

A small bot for your own Matrix homeserver, built on
[matrix-bot-sdk](https://turt2live.github.io/matrix-bot-sdk/).

## Commands

Commands are loaded from `scripts/cmds` at startup. Compatible scripts include
the basic utilities, Matrix rank and room settings commands, room moderation,
weather/translation/Quran lookups, room information (`!admin`, `!count`,
`!thread`), and a per-room virtual coin wallet. Use `!help` for the live command
list; `!say`, `!set`, and `!listbox` are bot-admin only.

### Adding a command

Create a `.js` file in `scripts/cmds` using the GoatBot v2 command-module shape:

```js
module.exports = {
  config: {
    name: "hello",
    platform: "matrix",
    aliases: ["hi"],
    version: "1.0",
    author: "Your name",
    countDown: 3,
    role: 0,
    description: { en: "Say hello" },
    category: "utility",
    guide: { en: "{pn} [name]" }
  },

  onStart: async function ({ message, args }) {
    return message.reply(`Hello, ${args.join(" ") || "there"}!`);
  }
};
```

`config.name` is required. `config.aliases` is optional, `countDown` is a
per-user cooldown in seconds, and `role` is `0` (everyone), `1` (Matrix room
power level 50 or higher), or `2` (a user listed in `ADMINS`). `adminOnly: true`
is also supported and means role 2. Add `.eg.js` to a filename to keep it as an
example without loading it. Add `platform: "matrix"` inside `config`; scripts
without that marker are skipped so Facebook-only GoatBot modules are not
mistakenly imported or advertised as usable commands.

The command context includes `message.reply(text)`, `message.send(text)`,
`api.sendMessage(text, roomId)`, `api.getCurrentUserID()`, `args`, `event`,
`role`, `prefix`, `commands`, `aliases`, and the persistent `rankStore`,
`roomSettings`, and `economyStore` services. Media commands can use
`api.uploadMedia` and `api.sendMedia`; moderation commands can use
`api.getMessageSender` and `api.redactMessage`. `event` includes
GoatBot-compatible `threadID`, `senderID`, `messageID`, and `isGroup` fields
alongside Matrix event data. `onLoad({ api })` is supported for startup
initialization.

Rank XP, virtual coins, room preferences, welcome/leave templates, rules,
warnings, and SCX data are stored in `data/bot.sqlite`. On the first startup
after upgrading, existing `rank-data.json`, `economy.json`,
`room-settings.json`, and `scx-data.json` files are imported into SQLite.
`data/bot.json` remains the Matrix SDK's sync-token storage. The database is
shared through the existing Docker `./data` volume, and provides a stable
storage layer for a web UI in a later change; no web UI is included yet.
Matrix message history and user profiles remain on the homeserver rather than
being copied into the bot database.

The `!setrankup text <message>` command stores a per-room rank-up template.
Use `{userName}`, `{oldRank}`, and `{currentRank}` as placeholders.
`!setrankup on|off` toggles announcements and `!setrankup reset` restores the
default message. YouTube search (`!yt`) returns a YouTube results link without
downloading video files. `!waifu [category]` sends an image through Matrix,
`!unsend` redacts a bot message when replying to it, and `!scxcard` opens the
existing SCX card command.

Matrix event scripts go in
`scripts/events` and export `config.name` plus an `onEvent(context)` function.
The loader calls it with `{ api, event, roomId, rankStore, roomSettings,
economyStore, startedAt }` at startup, so restart the bot after adding or
editing an event script. The included `welcome.js` and `leave.js` handle Matrix
membership events. Other
GoatBot modules that rely on Facebook APIs or GoatBot database models still
need to be ported before they can run here.

Room admins can use `!prefix`, `!rules`, `!setwelcome`, `!setleave`,
`!kick`, `!ban`, `!warn`, and `!clear [1-100]` to redact the bot's messages
among the most recent room messages. Warning number three triggers a Matrix room ban;
the bot needs sufficient room power for moderation actions. `!scx` provides
the cultivation cards, realm list, leaderboards, theme settings, and
breakthrough notifications. Its experience, themes, and notification settings
are stored in `data/bot.sqlite`; optional tuning uses `SCX_BASE_EXP`,
`SCX_GROWTH`, `SCX_EXP_PER_MESSAGE`, `SCX_COOLDOWN`, `SCX_ANNOUNCE_COUNT`,
`SCX_VIDEO_WIDTH`, `SCX_VIDEO_FPS`, and `SCX_TTS_LANG`. `!daily`,
`!balance`, `!slot`, and bot-admin-only `!set money` use virtual coins stored
per room. `!pinterest` returns a search link only; media-downloader scripts
that scrape or download third-party video/image content are not enabled.

## Setup

1. **Create the bot account** on your homeserver (via Element's register page,
   or as admin, e.g. Synapse: `register_new_matrix_user -c homeserver.yaml http://localhost:8008`).

2. **Install**
   ```bash
   npm install
   cp .env.example .env
   ```

3. **Edit `.env`**: set `HOMESERVER_URL`, `BOT_USERNAME`, `BOT_PASSWORD`, and `ADMINS`.

4. **Get an access token** (one-time):
   ```bash
   npm run login
   ```
   Paste the printed token into `ACCESS_TOKEN` in `.env`, then delete `BOT_PASSWORD`.

5. **Run** (Node.js 22.13 or newer is required for SQLite)
   ```bash
   npm run dev          # development
   # or
   npm run build && npm start
   ```

6. **Use it**: invite the bot's user (e.g. `@mybot:example.org`) to a room.
   It joins automatically. Type `!help`.

## Run permanently with Docker

```bash
docker compose up -d --build
docker compose logs -f
```

## Notes

- Encrypted (E2EE) rooms are **not** supported in this setup. Use unencrypted rooms,
  or see the SDK's [encryption tutorial](https://turt2live.github.io/matrix-bot-sdk/tutorial-encryption-bots.html).
- If the bot runs on the same machine as the homeserver, `HOMESERVER_URL` can be
  `http://localhost:8008`.
- Commands are loaded from `scripts/cmds`; restart the bot after adding or editing one.
