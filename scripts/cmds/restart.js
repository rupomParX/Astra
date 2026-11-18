const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const restartStateFile = path.resolve(process.cwd(), "data", "restart-state.json");

module.exports = {
	config: {
		name: "restart",
		platform: "matrix",
		version: "2.0",
		author: "Rupom Par",
		countDown: 5,
		role: 2,
		description: { en: "Restart the bot" },
		category: "admin",
		guide: { en: "{pn}" }
	},

	onLoad: async function ({ api }) {
		if (!fs.existsSync(restartStateFile)) return;

		const state = JSON.parse(fs.readFileSync(restartStateFile, "utf8"));
		if (typeof state.roomId !== "string" || typeof state.startedAt !== "number") {
			throw new Error("Restart state file is invalid");
		}

		await api.sendMessage(
			`✅ | Bot restarted\n⏰ | Time: ${(Date.now() - state.startedAt) / 1000}s`,
			state.roomId
		);
		fs.unlinkSync(restartStateFile);
	},

	onStart: async function ({ message, event }) {
		fs.mkdirSync(path.dirname(restartStateFile), { recursive: true });
		fs.writeFileSync(restartStateFile, JSON.stringify({
			roomId: event.roomId,
			startedAt: Date.now()
		}), "utf8");
		await message.reply("🔄 | Restarting bot...");

		if (fs.existsSync("/.dockerenv") || process.env.pm_id !== undefined) {
			process.exit(2);
			return;
		}

		const child = spawn(process.execPath, process.argv.slice(1), {
			cwd: process.cwd(),
			env: process.env,
			detached: true,
			stdio: "ignore",
			windowsHide: true
		});
		child.once("error", async error => {
			if (fs.existsSync(restartStateFile)) fs.unlinkSync(restartStateFile);
			console.error("[restart] Could not start replacement process:", error);
			await message.reply("❌ | Could not restart the bot. Check the bot logs.");
		});
		child.once("spawn", () => {
			child.unref();
			process.exit(0);
		});
	}
};
