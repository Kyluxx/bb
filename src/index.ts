
import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} from "@whiskeysockets/baileys";
import pino from "pino";

const connectToWhatsapp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: pino({level: "fatal"}),
        generateHighQualityLinkPreview: true,
        browser: Browsers.macOS("chrome")
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const pairingCode = await sock.requestPairingCode("6287883818502")
            console.log(pairingCode)
        }, 3000);

    }

    sock.ev.on("connection.update", ({connection, lastDisconnect}) => {
        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("connection close due to ", lastDisconnect.error, " reconnecting ", shouldReconnect);

            if (shouldReconnect) {
                connectToWhatsapp()
            };

        } else if (connection === "open") {
            console.log("opened connection");
        }
    });

    sock.ev.on("creds.update", saveCreds);




    sock.ev.on("messages.upsert", async (m) => {
   //Your logic
    })

};

connectToWhatsapp()



//I use Pairing code for connecting