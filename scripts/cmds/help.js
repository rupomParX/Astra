module.exports = {
  config: {
    name: "help",
    platform: "matrix",
    aliases: [],
    version: "1.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "List available commands or show command details" },
    category: "info",
    guide: { en: "{pn} [command]" }
  },

  onStart: async function ({ message, args, commands, aliases, role, prefix }) {
    if (args[0]) {
      const requestedName = args[0].toLowerCase();
      const commandName = commands.has(requestedName)
        ? requestedName
        : aliases.get(requestedName);
      const command = commandName ? commands.get(commandName) : undefined;

      if (!command) {
        return message.reply(`Command "${args[0]}" not found.`);
      }

      const config = command.config;
      const description = config.description?.en || config.description || "No description";
      const guide = config.guide?.en || config.guide || "No usage guide";
      return message.reply(
        `${config.name} - ${description}\n` +
        `Role: ${config.role ?? (config.adminOnly ? 2 : 0)}\n` +
        `Usage: ${guide}`
      );
    }

    const available = Array.from(commands.entries())
      .filter(([, command]) => (command.config.role ?? (command.config.adminOnly ? 2 : 0)) <= role)
      .map(([name, command]) => {
        const description = command.config.description?.en || command.config.description || "";
        return `${prefix}${name} - ${description}`;
      });

    return message.reply(available.join("\n") || "No commands are available.");
  }
};
