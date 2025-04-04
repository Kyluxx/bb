import Module from "module";
import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    delay,
    AnyMessageContent,
    WAMessageContent,
    WAMessageKey,
    proto,
    makeInMemoryStore,
} from "@whiskeysockets/baileys";

const send = async (jid: String) => {
    //sock.sendMessage(jid, {text: "hallo guys"})
}

export { send } 