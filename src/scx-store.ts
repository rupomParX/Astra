import { SQLiteDatabase } from "./database";

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Invalid ${label} in SQLite database`);
    }
    return value;
}

export interface ScxAward {
    before: number;
    after: number;
}

export class ScxStore {
    private readonly lastAwards = new Map<string, number>();

    constructor(private readonly database: SQLiteDatabase, legacyFilePath: string) {
        database.migrateJson("scx-json-v1", legacyFilePath, (data) => {
            if (!isRecord(data) || data.version !== 1 || !isRecord(data.rooms)) {
                throw new Error(`Unsupported or invalid SCX data file: ${legacyFilePath}`);
            }

            const insertRoom = database.connection.prepare(
                "INSERT INTO scx_rooms (room_id, notifications_enabled, theme) VALUES (?, ?, ?)",
            );
            const insertUser = database.connection.prepare(
                "INSERT INTO scx_users (room_id, user_id, exp) VALUES (?, ?, ?)",
            );
            for (const [roomId, value] of Object.entries(data.rooms)) {
                if (!isRecord(value) || !isRecord(value.users)
                    || typeof value.notificationsEnabled !== "boolean" || !isRecord(value.theme)) {
                    throw new Error(`Invalid SCX data for room ${roomId}`);
                }
                insertRoom.run(roomId, value.notificationsEnabled ? 1 : 0, JSON.stringify(value.theme));
                for (const [userId, exp] of Object.entries(value.users)) {
                    insertUser.run(roomId, userId, readNumber(exp, `SCX experience for ${userId}`));
                }
            }
        });
    }

    awardMessage(roomId: string, userId: string, gain: number, cooldownMs: number): ScxAward | undefined {
        if (!roomId || !userId || !Number.isFinite(gain) || gain <= 0
            || !Number.isFinite(cooldownMs) || cooldownMs < 0) {
            throw new Error("Invalid SCX message award parameters");
        }
        const key = `${roomId}:${userId}`;
        const now = Date.now();
        if (now - (this.lastAwards.get(key) ?? 0) < cooldownMs) return undefined;

        this.ensureRoom(roomId);
        const before = this.getExperience(roomId, userId);
        const after = before + gain;
        this.database.connection.prepare(
            "INSERT INTO scx_users (room_id, user_id, exp) VALUES (?, ?, ?) ON CONFLICT(room_id, user_id) DO UPDATE SET exp = excluded.exp",
        ).run(roomId, userId, after);
        this.lastAwards.set(key, now);
        return { before, after };
    }

    getUserGroups(userId: string): Record<string, number> {
        const groups: Record<string, number> = {};
        const rows = this.database.connection.prepare(
            "SELECT room_id, exp FROM scx_users WHERE user_id = ? AND exp > 0",
        ).all(userId);
        for (const row of rows) groups[`g${String(row.room_id)}`] = readNumber(row.exp, "SCX experience");
        return groups;
    }

    getUserIds(): string[] {
        return this.database.connection.prepare(
            "SELECT DISTINCT user_id FROM scx_users",
        ).all().map((row) => String(row.user_id));
    }

    getNotificationsEnabled(roomId: string): boolean {
        const row = this.getRoom(roomId);
        return row.notifications_enabled === 1;
    }

    setNotificationsEnabled(roomId: string, enabled: boolean): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE scx_rooms SET notifications_enabled = ? WHERE room_id = ?",
        ).run(enabled ? 1 : 0, roomId);
    }

    getTheme(roomId: string): Record<string, unknown> {
        const value: unknown = this.getRoom(roomId).theme;
        if (typeof value !== "string") throw new Error(`Invalid SCX theme for room ${roomId}`);
        const parsed: unknown = JSON.parse(value);
        if (!isRecord(parsed)) throw new Error(`Invalid SCX theme for room ${roomId}`);
        return { ...parsed };
    }

    setTheme(roomId: string, theme: Record<string, unknown>): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE scx_rooms SET theme = ? WHERE room_id = ?",
        ).run(JSON.stringify(theme), roomId);
    }

    private getExperience(roomId: string, userId: string): number {
        const row = this.database.connection.prepare(
            "SELECT exp FROM scx_users WHERE room_id = ? AND user_id = ?",
        ).get(roomId, userId);
        return row ? readNumber(row.exp, "SCX experience") : 0;
    }

    private getRoom(roomId: string): Record<string, unknown> {
        this.ensureRoom(roomId);
        const row = this.database.connection.prepare(
            "SELECT notifications_enabled, theme FROM scx_rooms WHERE room_id = ?",
        ).get(roomId);
        if (!row) throw new Error(`Could not read SCX settings for room ${roomId}`);
        return row;
    }

    private ensureRoom(roomId: string): void {
        this.database.connection.prepare(
            "INSERT OR IGNORE INTO scx_rooms (room_id) VALUES (?)",
        ).run(roomId);
    }
}
