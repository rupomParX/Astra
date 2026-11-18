import { SQLiteDatabase } from "./database";

export interface WarningRecord {
    reason: string;
    timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function readWarnings(value: unknown, label: string): WarningRecord[] {
    if (!Array.isArray(value) || value.some((entry) => !isRecord(entry)
        || typeof entry.reason !== "string" || typeof entry.timestamp !== "string")) {
        throw new Error(`Invalid ${label}`);
    }
    return value.map((entry) => ({ reason: String(entry.reason), timestamp: String(entry.timestamp) }));
}

function readJson<T>(value: unknown, label: string): T {
    if (typeof value !== "string") throw new Error(`Invalid ${label} in SQLite database`);
    return JSON.parse(value) as T;
}

export class RoomSettingsStore {
    constructor(private readonly database: SQLiteDatabase, legacyFilePath: string) {
        database.migrateJson("room-settings-json-v1", legacyFilePath, (data) => {
            if (!isRecord(data) || data.version !== 1 || !isRecord(data.rooms)) {
                throw new Error(`Unsupported or invalid room settings file: ${legacyFilePath}`);
            }

            const insertRoom = database.connection.prepare(
                "INSERT INTO room_settings (room_id, prefix, rules, welcome_enabled, welcome_message, leave_enabled, leave_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
            );
            const insertWarnings = database.connection.prepare(
                "INSERT INTO room_warnings (room_id, user_id, warnings) VALUES (?, ?, ?)",
            );
            for (const [roomId, value] of Object.entries(data.rooms)) {
                if (!isRecord(value) || !Array.isArray(value.rules)
                    || value.rules.some((rule) => typeof rule !== "string")
                    || typeof value.welcomeEnabled !== "boolean"
                    || typeof value.leaveEnabled !== "boolean"
                    || !isRecord(value.warnings)) {
                    throw new Error(`Invalid room settings for ${roomId}`);
                }
                for (const key of ["prefix", "welcomeMessage", "leaveMessage"]) {
                    if (value[key] !== undefined && typeof value[key] !== "string") {
                        throw new Error(`Invalid ${key} for room ${roomId}`);
                    }
                }

                insertRoom.run(
                    roomId,
                    value.prefix ?? null,
                    JSON.stringify(value.rules),
                    value.welcomeEnabled ? 1 : 0,
                    value.welcomeMessage ?? null,
                    value.leaveEnabled ? 1 : 0,
                    value.leaveMessage ?? null,
                );
                for (const [userId, warnings] of Object.entries(value.warnings)) {
                    insertWarnings.run(roomId, userId, JSON.stringify(readWarnings(warnings, `warnings for ${userId}`)));
                }
            }
        });
    }

    getPrefix(roomId: string): string | undefined {
        const row = this.getRoomRow(roomId);
        return typeof row.prefix === "string" ? row.prefix : undefined;
    }

    setPrefix(roomId: string, prefix: string | undefined): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE room_settings SET prefix = ? WHERE room_id = ?",
        ).run(prefix || null, roomId);
    }

    getRules(roomId: string): string[] {
        const value: unknown = readJson(this.getRoomRow(roomId).rules, "room rules");
        if (!Array.isArray(value) || value.some((rule) => typeof rule !== "string")) {
            throw new Error(`Invalid room rules for ${roomId}`);
        }
        return [...value];
    }

    setRules(roomId: string, rules: string[]): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE room_settings SET rules = ? WHERE room_id = ?",
        ).run(JSON.stringify(rules), roomId);
    }

    getWelcome(roomId: string): { enabled: boolean; message?: string } {
        const row = this.getRoomRow(roomId);
        return {
            enabled: row.welcome_enabled === 1,
            message: typeof row.welcome_message === "string" ? row.welcome_message : undefined,
        };
    }

    setWelcome(roomId: string, enabled: boolean, message?: string): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE room_settings SET welcome_enabled = ?, welcome_message = ? WHERE room_id = ?",
        ).run(enabled ? 1 : 0, message ?? null, roomId);
    }

    getLeave(roomId: string): { enabled: boolean; message?: string } {
        const row = this.getRoomRow(roomId);
        return {
            enabled: row.leave_enabled === 1,
            message: typeof row.leave_message === "string" ? row.leave_message : undefined,
        };
    }

    setLeave(roomId: string, enabled: boolean, message?: string): void {
        this.ensureRoom(roomId);
        this.database.connection.prepare(
            "UPDATE room_settings SET leave_enabled = ?, leave_message = ? WHERE room_id = ?",
        ).run(enabled ? 1 : 0, message ?? null, roomId);
    }

    getWarnings(roomId: string, userId?: string): Record<string, WarningRecord[]> | WarningRecord[] {
        if (userId) {
            const row = this.database.connection.prepare(
                "SELECT warnings FROM room_warnings WHERE room_id = ? AND user_id = ?",
            ).get(roomId, userId);
            return row ? readWarnings(readJson(row.warnings, "warning records"), `warnings for ${userId}`) : [];
        }

        const result: Record<string, WarningRecord[]> = {};
        const rows = this.database.connection.prepare(
            "SELECT user_id, warnings FROM room_warnings WHERE room_id = ?",
        ).all(roomId);
        for (const row of rows) {
            const id = String(row.user_id);
            result[id] = readWarnings(readJson(row.warnings, `warnings for ${id}`), `warnings for ${id}`);
        }
        return result;
    }

    addWarning(roomId: string, userId: string, reason: string): WarningRecord[] {
        const records = this.getWarnings(roomId, userId) as WarningRecord[];
        records.push({ reason, timestamp: new Date().toISOString() });
        this.database.connection.prepare(
            "INSERT INTO room_warnings (room_id, user_id, warnings) VALUES (?, ?, ?) ON CONFLICT(room_id, user_id) DO UPDATE SET warnings = excluded.warnings",
        ).run(roomId, userId, JSON.stringify(records));
        return [...records];
    }

    removeWarning(roomId: string, userId: string, index?: number): WarningRecord[] {
        const records = this.getWarnings(roomId, userId) as WarningRecord[];
        if (records.length) records.splice(index === undefined ? records.length - 1 : index, 1);
        if (!records.length) {
            this.database.connection.prepare(
                "DELETE FROM room_warnings WHERE room_id = ? AND user_id = ?",
            ).run(roomId, userId);
        } else {
            this.database.connection.prepare(
                "UPDATE room_warnings SET warnings = ? WHERE room_id = ? AND user_id = ?",
            ).run(JSON.stringify(records), roomId, userId);
        }
        return [...records];
    }

    clearWarnings(roomId: string, userId?: string): void {
        if (userId) {
            this.database.connection.prepare(
                "DELETE FROM room_warnings WHERE room_id = ? AND user_id = ?",
            ).run(roomId, userId);
        } else {
            this.database.connection.prepare(
                "DELETE FROM room_warnings WHERE room_id = ?",
            ).run(roomId);
        }
    }

    private getRoomRow(roomId: string): Record<string, unknown> {
        this.ensureRoom(roomId);
        const row = this.database.connection.prepare(
            "SELECT prefix, rules, welcome_enabled, welcome_message, leave_enabled, leave_message FROM room_settings WHERE room_id = ?",
        ).get(roomId);
        if (!row) throw new Error(`Could not read settings for room ${roomId}`);
        return row;
    }

    private ensureRoom(roomId: string): void {
        this.database.connection.prepare(
            "INSERT OR IGNORE INTO room_settings (room_id) VALUES (?)",
        ).run(roomId);
    }
}
