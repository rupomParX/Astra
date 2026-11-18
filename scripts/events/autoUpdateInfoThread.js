module.exports = {
	config: {
		name: "autoUpdateRoomInfo",
		platform: "matrix",
		version: "2.0",
		author: "Rupom Par",
		category: "events",
		description: { en: "Automatically updates room member and state info on events" }
	},

	onEvent: async function ({ event, roomId, roomSettings }) {
		if (!event || !roomId || event.type !== "m.room.name") return;
		const newName = event.content?.name;
		if (!newName || !roomSettings) return;
	}
};