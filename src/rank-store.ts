import { SQLiteDatabase } from "./database";
export interface RankCardTheme {
    main_color?: string | string[];
    sub_color?: string;
    line_color?: string;
    alpha_subcard?: number;
    exp_color?: string | string[];
    expNextLevel_color?: string;
    text_color?: string;
    name_color?: string;
    rank_color?: string;
    level_color?: string;
    exp_text_color?: string;
}

export interface RankAward {
    previousLevel: number;
    level: number;
    rankupEnabled: boolean;
}

const XP_PER_LEVEL = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Invalid ${label} in SQLite database`);
    }
    return value;
}

function readJsonObject<T extends object>(value: unknown, label: string): T {
    if (typeof value !== "string") throw new Error(`Invalid ${label} in SQLite database`);
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) throw new Error(`Invalid ${label} in SQLite database`);
    return parsed as T;
}

export function levelForExperience(exp: number): number {
    return Math.floor((1 + Math.sqrt(1 + (8 * Math.max(0, exp)) / XP_PER_LEVEL)) / 2);
}

export class RankStore {
    constructor(private readonly database: SQLiteDatabase, legacyFilePath: string) {
        database.migrateJson("rank-json-v1", legacyFilePath, (data) => {
            if (!isRecord(data) || data.version !== 1 || !isRecord(data.rooms)) {
                throw new Error(`Unsupported or invalid rank data file: ${legacyFilePath}`);
            }

            const insertRoom = database.connection.prepare(
                "INSERT INTO rank_rooms (room_id, rankup_enabled, rank_card) VALUES (?, ?, ?)",
            );
            const insertUser = database.connection.prepare(
                "INSERT INTO rank_users (room_id, user_id, exp) VALUES (?, ?, ?)",
            );
            for (const [roomId, value] of Object.entries(data.rooms)) {
                if (!isRecord(value) || !isRecord(value.users) || typeof value.rankupEnabled !== "boolean"
                    || !isRecord(value.rankCard)) {
                    throw new Error(`Invalid rank data for room ${roomId}`);
                }
                insertRoom.run(roomId, value.rankupEnabled ? 1 : 0, JSON.stringify(value.rankCard));
                for (const [userId, user] of Object.entries(value.users)) {
                    if (!isRecord(user)) throw new Error(`Invalid rank record for ${userId}`);
                    insertUser.run(roomId, userId, readNumber(user.exp, `experience for ${userId}`));
                }
            }
        });
    }

    getUser(roomId: string, userId: string): { exp: number } {
        this.ensureRoom(roomId);
        const row = this.database.connection
            .prepare("SELECT exp FROM rank_users WHERE room_id = ? AND user_id = ?")
            .get(roomId, userId);
        return { exp: row ? readNumber(row.exp, "experience") : 0 };
    }

    getUsers(roomId: string): Array<{ userId: string; exp: number }> {
        this.ensureRoom(roomId);
        return this.database.connection.prepare(
            "SELECT user_id, exp FROM rank_users WHERE room_id = ? ORDER BY exp DESC, user_id ASC",
        ).all(roomId).map((row) => ({
            userId: String(row.user_id),
            exp: readNumber(row.exp, "experience"),
        }));
    }

    awardMessage(roomId: string, userId: string): RankAward {
        this.ensureRoom(roomId);
        const before = this.getUser(roomId, userId).exp;
        this.database.connection.prepare(
            "INSERT INTO rank_users (room_id, user_id, exp) VALUES (?, ?, 1) ON CONFLICT(room_id, user_id) DO UPDATE SET exp = exp + 1",
        ).run(roomId, userId);
        return {
            previousLevel: levelForExperience(before),
            level: levelForExperience(before + 1),
            rankupEnabled: this.isRankupEnabled(roomId),
        };
    }

    setRankupEnabled(roomId: string, enabled: boolean): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE rank_rooms SET rankup_enabled = ? WHERE room_id = ?",
        ).run(enabled ? 1 : 0, roomId);
    }

    isRankupEnabled(roomId: string): boolean {
        this.ensureRoom(roomId);
        const row = this.database.connection
            .prepare("SELECT rankup_enabled FROM rank_rooms WHERE room_id = ?")
            .get(roomId);
        return row?.rankup_enabled === 1;
    }

    getRankupMessage(roomId: string): string | undefined {
        this.ensureRoom(roomId);
        const row = this.database.connection
            .prepare("SELECT rankup_message FROM rank_rooms WHERE room_id = ?")
            .get(roomId);
        return typeof row?.rankup_message === "string" ? row.rankup_message : undefined;
    }

    setRankupMessage(roomId: string, message: string | undefined): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE rank_rooms SET rankup_message = ? WHERE room_id = ?",
        ).run(message ?? null, roomId);
    }

    getRankCard(roomId: string): RankCardTheme {
        this.ensureRoom(roomId);
        const row = this.database.connection
            .prepare("SELECT rank_card FROM rank_rooms WHERE room_id = ?")
            .get(roomId);
        return readJsonObject<RankCardTheme>(row?.rank_card, "rank card theme");
    }

    setRankCard(roomId: string, theme: RankCardTheme): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE rank_rooms SET rank_card = ? WHERE room_id = ?",
        ).run(JSON.stringify(theme), roomId);
    }

    private ensureRoom(roomId: string): void {
        this.database.connection.prepare(
            "INSERT OR IGNORE INTO rank_rooms (room_id) VALUES (?)",
        ).run(roomId);
    }
}
