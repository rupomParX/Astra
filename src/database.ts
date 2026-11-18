import * as fs from "fs";
import * as path from "path";
import { DatabaseSync } from "node:sqlite";

export class SQLiteDatabase {
    readonly connection: DatabaseSync;

    constructor(filePath: string) {
        const resolvedPath = path.resolve(filePath);
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        this.connection = new DatabaseSync(resolvedPath);
        this.connection.exec(`
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            CREATE TABLE IF NOT EXISTS data_migrations (
                name TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS economy_users (
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                balance REAL NOT NULL DEFAULT 0,
                last_daily TEXT,
                PRIMARY KEY (room_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS rank_rooms (
                room_id TEXT PRIMARY KEY,
                rankup_enabled INTEGER NOT NULL DEFAULT 0,
                rankup_message TEXT,
                rank_card TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS rank_users (
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                exp REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (room_id, user_id),
                FOREIGN KEY (room_id) REFERENCES rank_rooms(room_id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS room_settings (
                room_id TEXT PRIMARY KEY,
                prefix TEXT,
                rules TEXT NOT NULL DEFAULT '[]',
                welcome_enabled INTEGER NOT NULL DEFAULT 1,
                welcome_message TEXT,
                leave_enabled INTEGER NOT NULL DEFAULT 0,
                leave_message TEXT
            );
            CREATE TABLE IF NOT EXISTS room_warnings (
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                warnings TEXT NOT NULL DEFAULT '[]',
                PRIMARY KEY (room_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS scx_rooms (
                room_id TEXT PRIMARY KEY,
                notifications_enabled INTEGER NOT NULL DEFAULT 0,
                theme TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS scx_users (
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                exp REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (room_id, user_id),
                FOREIGN KEY (room_id) REFERENCES scx_rooms(room_id) ON DELETE CASCADE
            );
        `);
    }

    migrateJson(name: string, filePath: string, importData: (data: unknown) => void): void {
        if (this.connection.prepare("SELECT 1 FROM data_migrations WHERE name = ?").get(name)) return;

        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            this.connection.prepare("INSERT INTO data_migrations (name) VALUES (?)").run(name);
            return;
        }

        const parsed: unknown = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
        this.connection.exec("BEGIN IMMEDIATE");
        try {
            importData(parsed);
            this.connection.prepare("INSERT INTO data_migrations (name) VALUES (?)").run(name);
            this.connection.exec("COMMIT");
        } catch (error) {
            this.connection.exec("ROLLBACK");
            throw error;
        }
    }

    close(): void {
        this.connection.close();
    }
}
