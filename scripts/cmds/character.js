const axios = require("axios");

// Active character sessions per thread stored in global GoatBot memory
if (!global.activeCharSessions) {
  global.activeCharSessions = {};
}

// 🔑 PASTE YOUR ACTUAL GROQ API KEY HERE (starts with gsk_...)
const API_KEY = "YOUR_GROQ_API_KEY_HERE"; 
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

module.exports = {
  config: {
    name: "character",
    aliases: ["char", "rp"],
    version: "3.0",
    author: "Rupom Par",
    role: 0,
    onChat: true, // 👈 CRITICAL: Tells GoatBot V2 to send regular chat messages to onChat!
    category: "ai",
    shortDescription: "Turn ON character mode to automatically reply to regular chat messages",
    longDescription: "Turn on character mode using !char on Name | Persona. The bot will automatically reply to regular chat messages until turned off with !char off.",
    guide: {
      en: "{pn} on [Name] | [Persona] - Turn ON character chat\n{pn} off - Turn OFF character chat",
      bn: "{pn} on [নাম] | [বিবরণ] - ক্যারেক্টার চ্যাট চালু করুন\n{pn} off - ক্যারেক্টার চ্যাট বন্ধ করুন"
    }
  },

  onStart: async function({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const subCommand = args[0]?.toLowerCase();

    // 🔴 TURN OFF CHARACTER MODE
    if (["off", "stop", "disable", "reset"].includes(subCommand)) {
      if (!global.activeCharSessions[threadID]) {
        return api.sendMessage("⚠️ Character mode is not currently active in this thread.", threadID, messageID);
      }

      delete global.activeCharSessions[threadID];
      return api.sendMessage("🔴 **Character mode turned OFF!** Bot will no longer reply to regular messages.", threadID, messageID);
    }

    // 🟢 TURN ON CHARACTER MODE
    // Usage: !char on Name | Persona   OR   !char Name | Persona
    let input = args.join(" ").trim();
    if (subCommand === "on") {
      input = args.slice(1).join(" ").trim();
    }

    if (!input.includes("|")) {
      return api.sendMessage(
        "❌ Missing `|` separator!\n\n👉 **To Turn ON:** `!char on Character Name | Persona description`\n👉 **To Turn OFF:** `!char off`",
        threadID,
        messageID
      );
    }

    const [charName, persona] = input.split("|").map(item => item.trim());

    if (!charName || !persona) {
      return api.sendMessage("❌ Please provide both a Name and a Persona description!", threadID, messageID);
    }

    // Assign character properties to active session for this thread
    global.activeCharSessions[threadID] = {
      name: charName,
      persona: persona,
      history: []
    };

    return api.sendMessage(
      `🟢 **Character Mode Turned ON!** 🟢\n\n👤 **Name:** ${charName}\n📜 **Persona:** ${persona}\n\n✨ *Just talk normally in this chat now! The bot will read and reply to all regular messages in character.*`,
      threadID,
      messageID
    );
  },

  onChat: async function({ api, event }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const body = event.body?.trim();

    // Skip if thread has no active character session enabled
    if (!global.activeCharSessions[threadID]) return;

    // Skip empty messages or command triggers (starting with !, /, ., etc.)
    if (!body || /^[!/\\.#$]/.test(body)) return;

    // Ignore bot's own messages to prevent infinite reply loops
    if (event.senderID === api.getCurrentUserID()) return;

    const charData = global.activeCharSessions[threadID];

    // Append user's message to conversation memory
    charData.history.push({ role: "user", content: body });
    if (charData.history.length > 10) charData.history.shift();

    try {
      const response = await axios.post(
        API_URL,
        {
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: `You are roleplaying as ${charData.name}. Persona: ${charData.persona}. Stay in character at all times. Respond naturally in the language used by the user (English or Bangla). Keep responses conversational and concise for group chat.`
            },
            ...charData.history
          ],
          temperature: 0.9,
          max_tokens: 250
        },
        {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const reply = response.data.choices[0]?.message?.content?.trim();
      if (!reply) return;

      charData.history.push({ role: "assistant", content: reply });

      return api.sendMessage(reply, threadID, messageID);

    } catch (err) {
      console.error("Groq AI Error Details:", err.response?.data || err.message);
    }
  }
};