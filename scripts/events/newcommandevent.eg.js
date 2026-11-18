/**
 * @English
 * Template for creating a new Matrix command script according to doc.md.
 * Platform must be "matrix".
 */

module.exports = {
	config: {
		name: "commandName",
		platform: "matrix",
		version: "1.0",
		author: "Rupom Par",
		category: "utility",
		description: { en: "Description of the command" },
		guide: { en: "!commandName [args]" }
	},

	onStart: async function ({ args, event, message, api, prefix, role }) {
		const name = args.join(" ") || event.sender;
		return message.reply(`Hello, ${name}! Prefix in this room is ${prefix}.`);
	}
};