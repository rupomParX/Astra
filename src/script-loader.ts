import * as fs from "fs";
import * as path from "path";
import { RankStore } from "./rank-store";
import { RoomSettingsStore } from "./room-settings";
import { EconomyStore } from "./economy-store";
import { ScxStore } from "./scx-store";

export interface MatrixScriptEvent {
    roomId: string;
    event: any;
    sender: string;
    args: string[];
    body: string;
    threadID: string;
    senderID: string;
    messageID?: string;
    isGroup: boolean;
    type: string;
    timestamp?: number;
}

export interface MatrixScriptApi {
    sendMessage(text: string, roomId: string): Promise<string>;
    getRoomMessages(roomId: string, limit: number): Promise<MatrixRoomMessage[]>;
    redactMessage(roomId: string, eventId: string): Promise<void>;
    getMessageSender(roomId: string, eventId: string): Promise<string>;
    sendRankCard(svg: string, roomId: string): Promise<string>;
    uploadMedia(data: Buffer, contentType: string, filename?: string): Promise<string>;
    sendMedia(
        roomId: string,
        msgtype: MatrixMediaMessageType,
        mxcUrl: string,
        body: string,
        info?: MatrixMediaInfo,
    ): Promise<string>;
    downloadMedia(mxcUrl: string): Promise<{ data: Buffer; contentType: string }>;
    getCurrentUserID(): string;
    getUserDisplayName(userId: string): Promise<string>;
    getUserAvatarUrl(userId: string): Promise<string | undefined>;
    getUserAvatarDataUri(userId: string): Promise<string | undefined>;
    getRoomMemberCount(roomId: string): Promise<number>;
    getRoomAdminCount(roomId: string): Promise<number>;
    getRoomAdmins(roomId: string): Promise<string[]>;
    getRoomDisplayName(roomId: string): Promise<string>;
    getJoinedRooms(): Promise<string[]>;
    getJoinedRoomMembers(roomId: string): Promise<string[]>;
    kickUser(userId: string, roomId: string, reason?: string): Promise<void>;
    banUser(userId: string, roomId: string, reason?: string): Promise<void>;
    unbanUser(userId: string, roomId: string): Promise<void>;
}

export interface MatrixRoomMessage {
    eventId: string;
    sender: string;
}

export type MatrixMediaMessageType = "m.image" | "m.video" | "m.audio" | "m.file";

export interface MatrixMediaInfo {
    mimetype?: string;
    size?: number;
    w?: number;
    h?: number;
    duration?: number;
}

export interface MatrixScriptMessage {
    reply(text: string): Promise<string>;
    send(text: string): Promise<string>;
}

export interface ScriptContext {
    api: MatrixScriptApi;
    event: MatrixScriptEvent;
    args: string[];
    message: MatrixScriptMessage;
    role: number;
    commands: Map<string, CommandScript>;
    aliases: Map<string, string>;
    startedAt: number;
    prefix: string;
    rankStore: RankStore;
    roomSettings: RoomSettingsStore;
    economyStore: EconomyStore;
    scxStore: ScxStore;
}

export interface CommandScript {
    config: {
        name: string;
        platform?: string;
        aliases?: string[];
        description?: string | { en?: string };
        shortDescription?: string | { en?: string };
        category?: string;
        version?: string;
        author?: string;
        countDown?: number;
        role?: number;
        adminOnly?: boolean;
    };
    onLoad?: (context: Pick<ScriptContext, "api">) => void | Promise<void>;
    onStart: (context: ScriptContext) => void | Promise<void>;
    onChat?: (context: Pick<ScriptContext, "api" | "event" | "scxStore">) => void | Promise<void>;
}

export interface LoadedCommands {
    commands: Map<string, CommandScript>;
    aliases: Map<string, string>;
}

function isCommandScript(value: unknown): value is CommandScript {
    if (!value || typeof value !== "object") return false;
    const script = value as Partial<CommandScript>;
    return !!script.config
        && typeof script.config.name === "string"
        && script.config.name.trim().length > 0
        && typeof script.onStart === "function";
}

export async function loadCommands(
    directory: string,
    api: MatrixScriptApi,
): Promise<LoadedCommands> {
    const commands = new Map<string, CommandScript>();
    const aliases = new Map<string, string>();
    const resolvedDirectory = path.resolve(directory);
    const skippedFiles: string[] = [];

    fs.mkdirSync(resolvedDirectory, { recursive: true });
    const files = fs.readdirSync(resolvedDirectory)
        .filter((file) => file.endsWith(".js") && !file.endsWith(".eg.js"))
        .sort();

    for (const file of files) {
        const filePath = path.join(resolvedDirectory, file);
        try {
            const source = fs.readFileSync(filePath, "utf8");
            if (!/\bplatform\s*:\s*["']matrix["']/.test(source)) {
                skippedFiles.push(file);
                continue;
            }
            const script = require(filePath) as unknown;
            if (!isCommandScript(script)) {
                throw new Error("Expected module.exports with config.name and an onStart function");
            }
            if (script.config.platform !== "matrix") {
                throw new Error('config.platform must be "matrix"');
            }

            const name = script.config.name.trim().toLowerCase();
            if (/\s/.test(name)) {
                throw new Error("config.name cannot contain whitespace");
            }
            if (commands.has(name) || aliases.has(name)) {
                throw new Error(`Command name "${name}" is already registered`);
            }

            const scriptAliases = script.config.aliases ?? [];
            if (!Array.isArray(scriptAliases) || scriptAliases.some((alias) => typeof alias !== "string" || !alias.trim())) {
                throw new Error("config.aliases must be an array of non-empty strings");
            }

            const normalizedAliases = scriptAliases.map((alias) => alias.trim().toLowerCase());
            const uniqueAliases = new Set(normalizedAliases);
            if (uniqueAliases.size !== normalizedAliases.length) {
                throw new Error("config.aliases contains duplicates");
            }
            for (const alias of normalizedAliases) {
                if (commands.has(alias) || aliases.has(alias) || alias === name) {
                    throw new Error(`Alias "${alias}" is already registered`);
                }
            }

            const role = script.config.adminOnly ? 2 : (script.config.role ?? 0);
            if (!Number.isInteger(role) || role < 0 || role > 2) {
                throw new Error("config.role must be 0, 1, or 2");
            }

            const countDown = script.config.countDown ?? 0;
            if (typeof countDown !== "number" || !Number.isFinite(countDown) || countDown < 0) {
                throw new Error("config.countDown must be a non-negative number");
            }

            if (script.onLoad) {
                await script.onLoad({ api });
            }

            commands.set(name, script);
            for (const alias of normalizedAliases) aliases.set(alias, name);
            console.info(`[commands] Loaded ${name} from ${file}`);
        } catch (error) {
            console.error(`[commands] Failed to load ${file}:`, error);
        }
    }

    if (skippedFiles.length) {
        console.warn(`[commands] Skipped ${skippedFiles.length} non-Matrix scripts: ${skippedFiles.join(", ")}. Port them and set config.platform to "matrix" to load.`);
    }

    return { commands, aliases };
}
