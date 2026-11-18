module.exports = {
	config: {
		name: "checkwarn",
		platform: "matrix",
		version: "2.0",
		author: "Rupom Par",
		category: "events",
		description: { en: "Checks user warnings upon joining and kicks banned or over-warned users" }
	},

	langs: {
		en: {
			warn: "Member %1 has been warned 3 times and has been banned/removed from the room.",
			needPermission: "Bot needs administrator permission to kick banned members."
		}
	},

	onEvent: async function ({ event, api, roomId, roomSettings }) {
		if (event.type !== "m.room.member" || event.content?.membership !== "join") return;
		if (event.unsigned?.prev_content?.membership === "join") return;

		const userId = event.state_key;
		if (!userId || userId === api.getCurrentUserID()) return;

		const warnings = roomSettings.getWarnings(roomId, userId);
		if (warnings.length >= 3) {
			await api.banUser(userId, roomId, "Three warnings");
		}
	}
};