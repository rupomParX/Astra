import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import {
    AutojoinRoomsMixin,
    LogLevel,
    LogService,
    MatrixClient,
    SimpleFsStorageProvider,
} from "matrix-bot-sdk";
import { loadEvents, EventScript } from "./event-loader";
import { loadCommands, LoadedCommands, MatrixScriptApi, ScriptContext } from "./script-loader";
import { RankStore } from "./rank-store";
import { RoomSettingsStore } from "./room-settings";
import { EconomyStore } from "./economy-store";
import { ScxStore } from "./scx-store";
import { SQLiteDatabase } from "./database";

// ---------- Config ----------
const homeserverUrl = process.env.HOMESERVER_URL;
const accessToken = process.env.ACCESS_TOKEN;
const prefix = process.env.PREFIX || "!";
const admins = (process.env.ADMINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const storageFile = process.env.STORAGE_FILE || "data/bot.json";

if (!homeserverUrl || !accessToken) {
    console.error("HOMESERVER_URL and ACCESS_TOKEN must be set (see .env.example).");
    process.exit(1);
}

LogService.setLevel(LogLevel.INFO);

// ---------- Client setup ----------
fs.mkdirSync(path.dirname(storageFile), { recursive: true });
const storage = new SimpleFsStorageProvider(storageFile);
const client = new MatrixClient(homeserverUrl, accessToken, storage);
const dataDirectory = path.resolve(process.cwd(), "data");
const database = new SQLiteDatabase(path.join(dataDirectory, "bot.sqlite"));
const rankStore = new RankStore(database, path.join(dataDirectory, "rank-data.json"));
const roomSettings = new RoomSettingsStore(database, path.join(dataDirectory, "room-settings.json"));
const economyStore = new EconomyStore(database, path.join(dataDirectory, "economy.json"));
const scxStore = new ScxStore(database, path.join(dataDirectory, "scx-data.json"));

function isHttpNotFound(error: unknown): boolean {
    return !!error
        && typeof error === "object"
        && "statusCode" in error
        && error.statusCode === 404;
}

// Accept every room invite automatically
AutojoinRoomsMixin.setupOnClient(client);

const startedAt = Date.now();
let myUserId = "";

const scriptApi: MatrixScriptApi = {
    sendMessage: (text, roomId) => client.sendText(roomId, text),
    getRoomMessages: async (roomId, limit) => {
        const path = `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages`;
        const messages: { eventId: string; sender: string }[] = [];
        let from: string | undefined;

        while (messages.length < limit) {
            const query: { dir: string; limit: number; from?: string } = { dir: "b", limit };
            if (from) query.from = from;
            const response = await client.doRequest("GET", path, query, null);
            if (!Array.isArray(response?.chunk)) {
                throw new Error("Matrix room history response did not contain an event list");
            }

            for (const event of response.chunk) {
                if (typeof event?.event_id !== "string"
                    || typeof event?.sender !== "string"
                    || typeof event?.type !== "string") {
                    throw new Error("Matrix room history contained an invalid event");
                }
                if (event.type === "m.room.message") {
                    messages.push({ eventId: event.event_id, sender: event.sender });
                }
            }

            if (messages.length >= limit
                || !response.end
                || response.end === from
                || response.chunk.length === 0) {
                break;
            }
            from = response.end;
        }

        return messages.slice(0, limit);
    },
    redactMessage: async (roomId, eventId) => {
        await client.redactEvent(roomId, eventId);
    },
    getMessageSender: async (roomId, eventId) => {
        const path = `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/event/${encodeURIComponent(eventId)}`;
        const event = await client.doRequest("GET", path, undefined, null);
        if (typeof event?.sender !== "string") {
            throw new Error("Matrix event response did not contain a sender");
        }
        return event.sender;
    },
    sendRankCard: async (svg, roomId) => {
        const buffer = Buffer.from(svg, "utf8");
        const url = await client.uploadContent(buffer, "image/svg+xml", "rank-card.svg");
        return client.sendMessage(roomId, {
            msgtype: "m.image",
            body: "Rank card",
            url,
            info: {
                mimetype: "image/svg+xml",
                size: buffer.length,
                w: 1000,
                h: 320,
            },
        });
    },
    uploadMedia: (data, contentType, filename) => client.uploadContent(data, contentType, filename),
    sendMedia: (roomId, msgtype, mxcUrl, body, info = {}) => {
        if (!mxcUrl.startsWith("mxc://")) {
            throw new Error("Media URL must be a Matrix mxc:// URI");
        }
        return client.sendMessage(roomId, { msgtype, url: mxcUrl, body, info });
    },
    downloadMedia: (mxcUrl) => client.downloadContent(mxcUrl),
    getCurrentUserID: () => myUserId,
    getUserDisplayName: async (userId) => {
        const profile = await client.getUserProfile(userId);
        return profile?.displayname || userId;
    },
    getUserAvatarUrl: async (userId) => {
        const profile = await client.getUserProfile(userId);
        return profile?.avatar_url ? client.mxcToHttp(profile.avatar_url) : undefined;
    },
    getUserAvatarDataUri: async (userId) => {
        const profile = await client.getUserProfile(userId);
        if (!profile?.avatar_url) return undefined;

        const match = /^mxc:\/\/([^/]+)\/([^/?#]+)$/.exec(profile.avatar_url);
        if (!match) throw new Error("User profile contains an invalid avatar URL");
        const [, serverName, mediaId] = match;
        const encodedMediaPath = `${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}`;
        const thumbnailQuery = { width: 128, height: 128, method: "crop" };
        let response: { headers: Record<string, string>; body: Buffer } | undefined;

        for (const endpoint of [
            `/_matrix/media/v3/thumbnail/${encodedMediaPath}`,
            `/_matrix/client/v1/media/thumbnail/${encodedMediaPath}`,
        ]) {
            try {
                response = await client.doRequest("GET", endpoint, thumbnailQuery, null, undefined, true, undefined, true);
                break;
            } catch (error) {
                if (!isHttpNotFound(error)) throw error;
            }
        }

        if (!response) {
            LogService.warn("profile", "Avatar thumbnail was not found; showing the rank card without a profile picture.");
            return undefined;
        }

        const contentType = (response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
        if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(contentType)) {
            throw new Error(`Unsupported avatar image type: ${contentType || "unknown"}`);
        }
        if (!response.body.length) throw new Error("Avatar image is empty");

        return `data:${contentType};base64,${response.body.toString("base64")}`;
    },
    getRoomMemberCount: async (roomId) => (await client.getJoinedRoomMembers(roomId)).length,
    getRoomAdminCount: async (roomId) => {
        const powerLevels = await getRoomPowerLevels(roomId);
        const defaultLevel = powerLevels.users_default ?? 0;
        const members = await client.getJoinedRoomMembers(roomId);
        return members.filter((userId) => (powerLevels.users?.[userId] ?? defaultLevel) >= 50).length;
    },
    getRoomAdmins: async (roomId) => {
        const powerLevels = await getRoomPowerLevels(roomId);
        const defaultLevel = powerLevels.users_default ?? 0;
        const members = await client.getJoinedRoomMembers(roomId);
        return members.filter((userId) => (powerLevels.users?.[userId] ?? defaultLevel) >= 50);
    },
    getRoomDisplayName: async (roomId) => {
        const state = await client.getRoomState(roomId);
        const roomName = state.find((event: any) => event.type === "m.room.name")?.content?.name;
        return roomName || roomId;
    },
    getJoinedRooms: () => client.getJoinedRooms(),
    getJoinedRoomMembers: (roomId) => client.getJoinedRoomMembers(roomId),
    kickUser: async (userId, roomId, reason) => { await client.kickUser(userId, roomId, reason); },
    banUser: async (userId, roomId, reason) => { await client.banUser(userId, roomId, reason); },
    unbanUser: async (userId, roomId) => { await client.unbanUser(userId, roomId); },
};
const commandDirectory = path.resolve(process.cwd(), "scripts", "cmds");
const eventDirectory = path.resolve(process.cwd(), "scripts", "events");
const cooldowns = new Map<string, number>();
let loadedCommands: LoadedCommands = {
    commands: new Map(),
    aliases: new Map<string, string>(),
};
let loadedEvents: EventScript[] = [];

async function getRoomPowerLevels(roomId: string): Promise<any> {
    const state = await client.getRoomState(roomId);
    return state.find((event: any) => event.type === "m.room.power_levels")?.content ?? {};
}

async function getRole(roomId: string, sender: string): Promise<number> {
    if (admins.includes(sender)) return 2;

    const powerLevels = await getRoomPowerLevels(roomId);
    const userLevel = powerLevels.users?.[sender] ?? powerLevels.users_default ?? 0;
    return userLevel >= 50 ? 1 : 0;
}

// ---------- Event handling ----------
async function handleMessage(roomId: string, event: any) {
    try {
        // Ignore redacted / non-text events
        if (event?.content?.msgtype !== "m.text") return;
        // Ignore our own messages
        if (event.sender === myUserId) return;
        // Ignore messages sent before we started (avoids replaying history)
        if (event.origin_server_ts && event.origin_server_ts < startedAt - 5000) return;

        const body: string = event.content.body ?? "";
        const roomPrefix = roomSettings.getPrefix(roomId) || prefix;
        const scriptEvent = {
            ...event,
            roomId,
            event,
            sender: event.sender,
            args: [],
            body,
            threadID: roomId,
            senderID: event.sender,
            messageID: event.event_id,
            isGroup: true,
            type: "message",
            timestamp: event.origin_server_ts,
        };
        const scxCommand = loadedCommands.commands.get("scx");
        if (scxCommand?.onChat) {
            try {
                await scxCommand.onChat({ api: scriptApi, event: scriptEvent, scxStore });
            } catch (error) {
                LogService.error("scx", "Could not process cultivation message:", error);
            }
        }

        if (!body.startsWith(roomPrefix)) {
            const award = rankStore.awardMessage(roomId, event.sender);
            if (award.rankupEnabled && award.level > award.previousLevel) {
                const template = rankStore.getRankupMessage(roomId);
                const text = template
                    ? template
                        .replace(/\{userName\}/g, () => event.sender)
                        .replace(/\{oldRank\}/g, () => String(award.previousLevel))
                        .replace(/\{currentRank\}/g, () => String(award.level))
                    : `Congratulations ${event.sender}! You reached level ${award.level}.`;
                await client.sendText(roomId, text);
            }
            return;
        }

        const commandText = body.slice(roomPrefix.length).trim();
        if (!commandText) return;

        const [rawName, ...args] = commandText.split(/\s+/);
        const name = rawName.toLowerCase();
        const commandName = loadedCommands.commands.has(name)
            ? name
            : loadedCommands.aliases.get(name);
        if (!commandName) return;
        const command = loadedCommands.commands.get(commandName);
        if (!command) return;

        const role = await getRole(roomId, event.sender);
        const requiredRole = command.config.adminOnly ? 2 : (command.config.role ?? 0);
        if (role < requiredRole) {
            await client.replyNotice(roomId, event, "You're not allowed to use that command.");
            return;
        }

        const cooldown = Math.max(0, command.config.countDown ?? 0);
        const cooldownKey = `${event.sender}:${commandName}`;
        const now = Date.now();
        const previousRun = cooldowns.get(cooldownKey) ?? 0;
        const remaining = cooldown - (now - previousRun) / 1000;
        if (remaining > 0) {
            await client.replyNotice(roomId, event, `Please wait ${Math.ceil(remaining)}s before using this command again.`);
            return;
        }
        cooldowns.set(cooldownKey, now);

        scriptEvent.args = args;
        const context: ScriptContext = {
            api: scriptApi,
            event: scriptEvent,
            args,
            message: {
                reply: (text) => client.replyNotice(roomId, event, text),
                send: (text) => client.sendText(roomId, text),
            },
            role,
            commands: loadedCommands.commands,
            aliases: loadedCommands.aliases,
            startedAt,
            prefix: roomPrefix,
            rankStore,
            roomSettings,
            economyStore,
            scxStore,
        };
        await command.onStart(context);
    } catch (err) {
        LogService.error("bot", "Error handling message:", err);
        try {
            await client.replyNotice(roomId, event, "The command failed. Check the bot logs for details.");
        } catch (replyError) {
            LogService.error("bot", "Could not report command failure:", replyError);
        }
    }
}

client.on("room.message", handleMessage);
client.on("room.event", async (roomId: string, event: any) => {
    if (event.origin_server_ts && event.origin_server_ts < startedAt - 5000) return;
    for (const script of loadedEvents) {
        try {
            await script.onEvent({ api: scriptApi, event, roomId, rankStore, roomSettings, economyStore, startedAt });
        } catch (error) {
            LogService.error("events", `Error in ${script.config.name}:`, error);
        }
    }
});
client.on("room.join", (roomId: string) => LogService.info("bot", `Joined ${roomId}`));
client.on("room.leave", (roomId: string) => LogService.info("bot", `Left ${roomId}`));

// ---------- Start ----------
(async () => {
    myUserId = await client.getUserId();
    loadedCommands = await loadCommands(commandDirectory, scriptApi);
    loadedEvents = await loadEvents(eventDirectory);
    await client.start();
    LogService.info("bot", `Bot started as ${myUserId}`);
})().catch((err) => {
    console.error("Failed to start bot:", err);
    process.exit(1);
});

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
        client.stop();
        database.close();
        process.exit(0);
    });
}
