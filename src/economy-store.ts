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

export class EconomyStore {
    constructor(private readonly database: SQLiteDatabase, legacyFilePath: string) {
        database.migrateJson("economy-json-v1", legacyFilePath, (data) => {
            if (!isRecord(data) || data.version !== 1 || !isRecord(data.rooms)) {
                throw new Error(`Unsupported or invalid economy file: ${legacyFilePath}`);
            }

            const insert = database.connection.prepare(
                "INSERT INTO economy_users (room_id, user_id, balance, last_daily) VALUES (?, ?, ?, ?)",
            );
            for (const [roomId, users] of Object.entries(data.rooms)) {
                if (!isRecord(users)) throw new Error(`Invalid economy users for room ${roomId}`);
                for (const [userId, user] of Object.entries(users)) {
                    if (!isRecord(user)) throw new Error(`Invalid economy record for ${userId}`);
                    const balance = readNumber(user.balance, `balance for ${userId}`);
                    if (user.lastDaily !== undefined && typeof user.lastDaily !== "string") {
                        throw new Error(`Invalid daily claim date for ${userId}`);
                    }
                    insert.run(roomId, userId, balance, user.lastDaily ?? null);
                }
            }
        });
    }

    getBalance(roomId: string, userId: string): number {
        this.ensureUser(roomId, userId);
        const row = this.database.connection
            .prepare("SELECT balance FROM economy_users WHERE room_id = ? AND user_id = ?")
            .get(roomId, userId);
        return readNumber(row?.balance, "balance");
    }

    setBalance(roomId: string, userId: string, balance: number): void {
        if (!Number.isFinite(balance)) throw new Error("Balance must be a finite number");
        this.ensureUser(roomId, userId);
        this.database.connection.prepare(
            "UPDATE economy_users SET balance = ? WHERE room_id = ? AND user_id = ?",
        ).run(balance, roomId, userId);
    }

    adjustBalance(roomId: string, userId: string, change: number): number {
        if (!Number.isFinite(change)) throw new Error("Balance adjustment must be a finite number");
        this.ensureUser(roomId, userId);
        this.database.connection.prepare(
            "UPDATE economy_users SET balance = balance + ? WHERE room_id = ? AND user_id = ?",
        ).run(change, roomId, userId);
        return this.getBalance(roomId, userId);
    }

    claimDaily(roomId: string, userId: string, amount: number): { claimed: boolean; balance: number } {
        if (!Number.isFinite(amount)) throw new Error("Daily reward must be a finite number");
        this.ensureUser(roomId, userId);
        const today = new Date().toISOString().slice(0, 10);
        const result = this.database.connection.prepare(
            "UPDATE economy_users SET balance = balance + ?, last_daily = ? WHERE room_id = ? AND user_id = ? AND (last_daily IS NULL OR last_daily != ?)",
        ).run(amount, today, roomId, userId, today);
        return { claimed: Number(result.changes) > 0, balance: this.getBalance(roomId, userId) };
    }

    getLeaderboard(roomId: string): Array<{ userId: string; balance: number }> {
        return this.database.connection.prepare(
            "SELECT user_id, balance FROM economy_users WHERE room_id = ? ORDER BY balance DESC, user_id ASC",
        ).all(roomId).map((row) => ({
            userId: String(row.user_id),
            balance: readNumber(row.balance, "balance"),
        }));
    }

    private ensureUser(roomId: string, userId: string): void {
        this.database.connection.prepare(
            "INSERT OR IGNORE INTO economy_users (room_id, user_id) VALUES (?, ?)",
        ).run(roomId, userId);
    }
}
