import * as fs from "fs";
import * as path from "path";
import { MatrixScriptApi } from "./script-loader";
import { RankStore } from "./rank-store";
import { RoomSettingsStore } from "./room-settings";
import { EconomyStore } from "./economy-store";

export interface MatrixEventContext {
    api: MatrixScriptApi;
    event: any;
    roomId: string;
    rankStore: RankStore;
    roomSettings: RoomSettingsStore;
    economyStore: EconomyStore;
    startedAt: number;
}

export interface EventScript {
    config: {
        name: string;
    };
    onEvent: (context: MatrixEventContext) => void | Promise<void>;
}

export async function loadEvents(directory: string): Promise<EventScript[]> {
    const resolvedDirectory = path.resolve(directory);
    fs.mkdirSync(resolvedDirectory, { recursive: true });

    const scripts: EventScript[] = [];
    const skippedFiles: string[] = [];
    const files = fs.readdirSync(resolvedDirectory)
        .filter((file) => file.endsWith(".js") && !file.endsWith(".eg.js"))
        .sort();

    for (const file of files) {
        const filePath = path.join(resolvedDirectory, file);
        const source = fs.readFileSync(filePath, "utf8");
        if (!/\bonEvent\s*:/.test(source)) {
            skippedFiles.push(file);
            continue;
        }

        try {
            const script = require(filePath) as EventScript;
            if (!script?.config?.name || typeof script.onEvent !== "function") {
                throw new Error("Expected config.name and an onEvent function");
            }
            scripts.push(script);
            console.info(`[events] Loaded ${script.config.name} from ${file}`);
        } catch (error) {
            console.error(`[events] Failed to load ${file}:`, error);
        }
    }

    if (skippedFiles.length) {
        console.warn(`[events] Skipped ${skippedFiles.length} non-Matrix event scripts: ${skippedFiles.join(", ")}. Port them to export onEvent(context).`);
    }

    return scripts;
}
