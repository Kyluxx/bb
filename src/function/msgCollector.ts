import { WASocket, WAMessage } from "@whiskeysockets/baileys";

export class MessageCollector {
    private client: WASocket;
    private filter: (message: WAMessage) => boolean;
    private time: number;
    private messages: WAMessage[];
    private timeout: NodeJS.Timeout | null;
    private collected: boolean;

    constructor(client: WASocket, filter: (message: WAMessage) => boolean, time = 60000) {
        this.client = client;
        this.filter = filter;
        this.time = time;
        this.messages = [];
        this.timeout = null;
        this.collected = false;
    }

    start() {
        this.client.ev.on("messages.upsert", ({ messages }) => {
            if (this.collected) return;

            const message = messages[0]; // Get the first message
            if (this.filter(message)) {
                this.messages.push(message);
            }
        });

        // Stop collecting after the time expires
        this.timeout = setTimeout(() => this.stop(), this.time);
    }

    stop() {
        if (!this.collected) {
            this.collected = true;
            if (this.timeout) clearTimeout(this.timeout);
            console.log("Collection stopped. Collected messages:", this.messages);
        }
    }

    getCollectedMessages() {
        return this.messages;
    }
}
