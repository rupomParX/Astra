module.exports = {
  config: {
    name: "rules",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    role: 0,
    description: { en: "View or manage this room's rules" },
    category: "settings",
    guide: { en: "{pn} [add|edit|delete|move|clear] ..." }
  },

  onStart: async function ({ args, event, role, roomSettings, message, prefix }) {
    const rules = roomSettings.getRules(event.roomId);
    const action = (args[0] || "list").toLowerCase();
    const adminOnly = ["add", "-a", "edit", "-e", "delete", "-d", "move", "-m", "clear"].includes(action);
    if (adminOnly && role < 1) {
      return message.reply("Only room admins can change the rules.");
    }

    if (action === "list") {
      return message.reply(rules.length
        ? rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")
        : `No rules set. A room admin can add one with ${prefix}rules add <rule>.`);
    }

    if (action === "add" || action === "-a") {
      const rule = args.slice(1).join(" ").trim();
      if (!rule) return message.reply(`Usage: ${prefix}rules add <rule>`);
      if (rules.length >= 50) return message.reply("This room already has the maximum of 50 rules.");
      rules.push(rule.slice(0, 1000));
      roomSettings.setRules(event.roomId, rules);
      return message.reply(`Added rule ${rules.length}.`);
    }

    if (action === "edit" || action === "-e") {
      const index = Number(args[1]) - 1;
      const rule = args.slice(2).join(" ").trim();
      if (!Number.isInteger(index) || index < 0 || index >= rules.length || !rule) {
        return message.reply(`Usage: ${prefix}rules edit <number> <new rule>`);
      }
      rules[index] = rule.slice(0, 1000);
      roomSettings.setRules(event.roomId, rules);
      return message.reply(`Updated rule ${index + 1}.`);
    }

    if (action === "delete" || action === "-d") {
      const index = Number(args[1]) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= rules.length) {
        return message.reply(`Usage: ${prefix}rules delete <number>`);
      }
      rules.splice(index, 1);
      roomSettings.setRules(event.roomId, rules);
      return message.reply(`Deleted rule ${index + 1}.`);
    }

    if (action === "move" || action === "-m") {
      const from = Number(args[1]) - 1;
      const to = Number(args[2]) - 1;
      if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < rules.length)) {
        return message.reply(`Usage: ${prefix}rules move <from> <to>`);
      }
      const [rule] = rules.splice(from, 1);
      rules.splice(to, 0, rule);
      roomSettings.setRules(event.roomId, rules);
      return message.reply(`Moved rule ${from + 1} to ${to + 1}.`);
    }

    if (action === "clear") {
      if (args[1]?.toLowerCase() !== "confirm") {
        return message.reply(`Confirm removal with ${prefix}rules clear confirm.`);
      }
      roomSettings.setRules(event.roomId, []);
      return message.reply("Cleared all room rules.");
    }

    return message.reply(`Usage: ${prefix}rules [add|edit|delete|move|clear] ...`);
  }
};
