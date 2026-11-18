module.exports = {
	config: {
		name: "onEvent",
		platform: "matrix",
		version: "2.0",
		author: "Rupom Par",
		description: { en: "Loops through global events and dispatches them" },
		category: "events"
	},

	onEvent: async function (context) {
		const globalEvents = global.MatrixBot?.onEvent || [];
		for (const item of globalEvents) {
			if (typeof item === "function") {
				await item(context);
			} else if (item && typeof item.onStart === "function") {
				await item.onStart(context);
			} else if (item && typeof item.onEvent === "function") {
				await item.onEvent(context);
			}
		}
	}
};