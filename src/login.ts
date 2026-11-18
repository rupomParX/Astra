import "dotenv/config";
import { MatrixAuth } from "matrix-bot-sdk";

async function main() {
    const homeserverUrl = process.env.HOMESERVER_URL;
    const username = process.env.BOT_USERNAME;
    const password = process.env.BOT_PASSWORD;

    if (!homeserverUrl || !username || !password) {
        console.error("Set HOMESERVER_URL, BOT_USERNAME and BOT_PASSWORD in your .env first.");
        process.exit(1);
    }

    const auth = new MatrixAuth(homeserverUrl);
    const client = await auth.passwordLogin(username, password);

    console.log("\nLogin successful. Put this in your .env as ACCESS_TOKEN:\n");
    console.log(client.accessToken);
    console.log("\nYou can now remove BOT_PASSWORD from .env.");
}

main().catch((err) => {
    console.error("Login failed:", err?.body ?? err);
    process.exit(1);
});
