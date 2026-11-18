# Writing command scripts

This bot loads JavaScript command modules from `scripts/cmds` when it starts.
Commands use CommonJS (`module.exports`) and the Matrix script context described
below. Restart the bot after creating or changing a command.

## Create a command

Create a file such as `scripts/cmds/greet.js`:

```js
module.exports = {
  config: {
    name: "greet",
    platform: "matrix",
    aliases: ["hello"],
    version: "1.0",
    author: "Your name",
    countDown: 3,
    role: 0,
    description: { en: "Greet someone" },
    category: "utility",
    guide: { en: "!greet [name]" }
  },

  onStart: async function ({ args, event, message }) {
    const name = args.join(" ") || event.sender;
    return message.reply(`Hello, ${name}!`);
  }
};
```

In a room, try `!greet Matrix` (or `!hello Matrix`). The default prefix is `!`;
rooms may have their own prefix.

## File and registration rules

- The file must end in `.js` and be inside `scripts/cmds`.
- Add `platform: "matrix"` to `config`. Scripts without this marker are skipped.
- Files ending in `.eg.js` are examples and are not loaded.
- `config.name` is required, cannot contain whitespace, and is normalized to
  lowercase.
- `config.aliases` is optional and must be an array of unique, non-empty
  strings. Names and aliases must not conflict with already loaded commands.
- `onStart` is required. It may be `async` and should return/await any
  `message.reply`, `message.send`, or API calls.
- A script with `onLoad({ api })` can perform startup initialization. It runs
  while commands are loading.

If a command fails to load, look for `[commands] Failed to load ...` in the
bot log. Validation and loading behavior is implemented in
[`src/script-loader.ts`](src/script-loader.ts).

## Configuration options

| Option | Meaning |
| --- | --- |
| `name` | Required command name. |
| `platform` | Must be `"matrix"`. |
| `aliases` | Optional alternative names. |
| `description` | Description shown by `!help`; use a string or `{ en: "..." }`. |
| `shortDescription` | Optional short description. |
| `category` | Optional category label. |
| `version`, `author` | Optional command metadata. |
| `countDown` | Per-user cooldown in seconds; must be a non-negative number. |
| `role` | Required permission level: `0`, `1`, or `2`. Defaults to `0`. |
| `adminOnly` | If `true`, requires level `2`. |
| `guide` | Optional usage text shown by `!help <command>`. The text is displayed as written. |

Permission levels:

- `0`: anyone in the room.
- `1`: a room member with Matrix power level 50 or higher.
- `2`: a user listed in the bot's `ADMINS` environment variable.

The bot account also needs sufficient room power for moderation actions.

## Command context

`onStart` receives the following values:

- `args`: arguments split on whitespace. Quotes do not group words.
- `event`: Matrix event details and compatibility fields:
  - `sender` / `senderID`: sender's Matrix user ID.
  - `roomId` / `threadID`: room ID.
  - `messageID`: event ID, when available.
  - `body`: original message text.
  - `type`, `isGroup`, and `timestamp`.
  - `event`: the original Matrix event object.
- `message.reply(text)`: reply to the triggering event with a notice.
- `message.send(text)`: send a text message to the room.
- `api`: Matrix helper methods listed below.
- `prefix`: prefix currently used in this room.
- `role`: sender's permission level, from `0` to `2`.
- `commands` and `aliases`: maps of the loaded commands and aliases.
- `startedAt`: bot startup time in milliseconds.
- `rankStore`, `roomSettings`, `economyStore`: persistent bot data stores.

The store methods and data shapes are defined in
[`src/rank-store.ts`](src/rank-store.ts), `src/room-settings.ts`, and
`src/economy-store.ts`.

## Matrix API helpers

All API methods are asynchronous except `getCurrentUserID()`.

- `sendMessage(text, roomId)`
- `sendRankCard(svg, roomId)`
- `uploadMedia(data, contentType, filename?)`
- `sendMedia(roomId, msgtype, mxcUrl, body, info?)`
- `downloadMedia(mxcUrl)`
- `getCurrentUserID()`
- `getUserDisplayName(userId)`
- `getUserAvatarUrl(userId)`
- `getUserAvatarDataUri(userId)`
- `getRoomMemberCount(roomId)`
- `getRoomAdminCount(roomId)`
- `getRoomAdmins(roomId)`
- `getRoomDisplayName(roomId)`
- `getJoinedRooms()`
- `getJoinedRoomMembers(roomId)`
- `kickUser(userId, roomId, reason?)`
- `banUser(userId, roomId, reason?)`
- `unbanUser(userId, roomId)`

For example, `getUserAvatarUrl` returns a URL or `undefined`; validate
user-supplied IDs and arguments before making API calls.

## Upload and download images, GIFs, video, and audio

Media is uploaded to the Matrix homeserver first. `uploadMedia` accepts a
Node.js `Buffer` and returns an `mxc://` URI. `sendMedia` sends that URI as a
Matrix room message. The following code is inside a command's `onStart`
handler:

```js
const fs = require("node:fs/promises");
const path = require("node:path");

// Keep command assets in a known directory; don't accept arbitrary file paths
// from room messages.
const filePath = path.join(__dirname, "assets", "welcome.gif");
const data = await fs.readFile(filePath);
const mimetype = "image/gif";
const mxcUrl = await api.uploadMedia(data, mimetype, "welcome.gif");

return api.sendMedia(
  event.roomId,
  "m.image",
  mxcUrl,
  "Welcome!",
  { mimetype, size: data.length }
);
```

Use the Matrix message type and MIME type appropriate for the media:

| Media | `msgtype` | Example MIME type | Notes |
| --- | --- | --- | --- |
| Image | `m.image` | `image/png`, `image/jpeg` | Add `w` and `h` to `info` when known. |
| Animated GIF | `m.image` | `image/gif` | Animation support depends on the receiving client. |
| Video | `m.video` | `video/mp4` | Add `w`, `h`, and `duration` (milliseconds) when known. |
| Audio | `m.audio` | `audio/mpeg`, `audio/ogg` | Add `duration` (milliseconds) when known. |
| Other file | `m.file` | For example, `application/pdf` | Use for downloadable files that are not displayed as image, video, or audio. |

`info` is optional and may contain `mimetype`, `size` (bytes), `w`, `h`, and
`duration` (milliseconds). Given a `videoBuffer` (for example, read from a
bundled file as above), send a video from `onStart` like this:

```js
const mxcUrl = await api.uploadMedia(videoBuffer, "video/mp4", "clip.mp4");
return api.sendMedia(
  event.roomId,
  "m.video",
  mxcUrl,
  "A short clip",
  { mimetype: "video/mp4", size: videoBuffer.length, w: 1280, h: 720, duration: 8200 }
);
```

`downloadMedia` downloads an existing Matrix `mxc://` URI and returns
`{ data: Buffer, contentType: string }`. For example, a command can accept an
MXC URI as an argument. This code is also inside `onStart`:

```js
const mxcUrl = args[0];
if (!mxcUrl || !mxcUrl.startsWith("mxc://")) {
  return message.reply(`Usage: ${prefix}mediainfo mxc://server/media-id`);
}

const media = await api.downloadMedia(mxcUrl);
return message.reply(`Downloaded ${media.data.length} bytes (${media.contentType}).`);
```

Downloads are held in memory as a `Buffer`; avoid downloading untrusted or
very large files without checking their size. Encrypted media is not supported
by this bot.

## Test and troubleshoot

1. Save the command as a `.js` file in `scripts/cmds`.
2. Start or restart the bot with `npm run dev`.
3. Check startup output for `[commands] Loaded <name> from <file>`.
4. In a joined, unencrypted room, try the command and its alias.
5. Run `!help <name>` to check its description and usage.

Commands are handled for ordinary Matrix text messages. Encrypted rooms are
not supported by this bot. A thrown error is logged and the user receives a
generic command-failed notice, so use the bot log to diagnose failures.
