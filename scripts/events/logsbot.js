module.exports = {
	config: {
		name: "logsbot",
		platform: "matrix",
		version: "2.0",
		author: "Rupom Par",
		category: "events",
		description: { en: "Logs bot addition and removal events in rooms" }
	},

	langs: {
		en: {
			title: "====== Bot logs ======",
			added: "\n✅\nEvent: bot has been added to a room\n- Added by: %1",
			kicked: "\n❌\nEvent: bot has been left or removed from a room\n- User ID: %1",
			footer: "\n- Room: %1\n- Room ID: %2\n- Time: %3"
		}
	},

	onEvent: async function ({ event, api, roomId }) {
		if (event.type !== "m.room.member" || event.state_key !== api.getCurrentUserID()) return;

		const membership = event.content?.membership;
		if (membership !== "invite" && membership !== "join" && membership !== "leave" && membership !== "ban") return;

		const sender = event.sender || "Unknown";
		const roomName = await api.getRoomDisplayName(roomId);
		const time = new Date(event.origin_server_ts || Date.now()).toLocaleString();
		let msg = "====== Bot logs ======";

		if (membership === "invite" || membership === "join") {
			const senderName = await api.getUserDisplayName(sender);
			msg += `\n✅\nEvent: bot has been added to a room\n- Added by: ${senderName}`;
		} else {
			msg += `\n❌\nEvent: bot has been removed/left\n- By/User: ${sender}`;
		}

		msg += `\n- Room: ${roomName}\n- Room ID: ${roomId}\n- Time: ${time}`;
		console.info(msg);
	}
};