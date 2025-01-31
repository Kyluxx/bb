import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, WAMessageContent, WAMessageKey, proto, makeInMemoryStore, AnyMessageContent, delay, WAMessage } from "@whiskeysockets/baileys";
import NodeCache from 'node-cache'
import P from 'pino'
import readline from 'readline'
import dotenv from 'dotenv';
import { MessageCollector } from './function/msgCollector'
import { gameManager, Game } from './function/game';
import { challengeManager } from "./function/challenges";
import mathSolver from "./function/mathsolver";
dotenv.config();

let reconnectAttempts = 0;
const maxAttempts = 3;
let originalSender: string;
let accepter: string;

const usePairingCode = process.argv.includes('--use-pairing-code')

const groupCache = new NodeCache({stdTTL: 5 * 60, useClones: false})
const msgRetryCounterCache = new NodeCache()

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

const store = makeInMemoryStore({ logger })
store?.readFromFile('./baileys_store_multi.json')
setInterval(() => {
	store?.writeToFile('./baileys_store_multi.json')
}, 10_000)


let states: {
  prevAns: number,
  started: boolean;
  uptime: number | null;
  fallbackOn: boolean;
  lastChat: { notifyName: string | null; msg: string | null };
  savemsg: boolean;
  autotrigger: boolean;
  waitingQuestion: boolean;
  atChat: string;
  inter: NodeJS.Timeout | null; // ✅ Corrected
  pend: boolean;
  tfc: number;
  waitingFor: number;
  collectAuthor: string | null;
  GBCount: number;
  runtime: number;
} = {
  prevAns: 0,
  started: false,
  uptime: null,
  fallbackOn: false,
  lastChat: { notifyName: null, msg: null },
  savemsg: false,
  autotrigger: false,
  waitingQuestion: false,
  atChat: '',
  inter: null, // ✅ Corrected
  pend: false,
  tfc: 0,
  waitingFor: 0,
  collectAuthor: null,
  GBCount: 0,
  runtime: 0,
};



try{
    
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`\n [/] using WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      getMessage,
      cachedGroupMetadata: async (jid) => groupCache.get(jid)
  });

  store?.bind(sock.ev)
  sock.ev.on("creds.update", saveCreds);

  // ✅ Fix: Ensure Pairing Code is Requested
  if (usePairingCode && !sock.authState.creds.registered) {
      const phoneNumber = await question(" [?] Insert your phone number: "); // Replace with your phone number
      try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log(`\n ====================== \n Pairing Code: ${code} \n ====================== \n `);
          // console.log("⏳ Waiting 20 seconds for pairing...");
          // await delay(20000); // Tunggu 20 detik sebelum lanjut
      } catch (err) {
          console.error("❌ Failed to get pairing code:", err);
      }
  }

  sock.ev.on("connection.update", async (update) => {
    console.log("Connection Update:", update);
    const { connection, lastDisconnect } = update;
    
    if (connection === "close") {
        reconnectAttempts++;
        if (reconnectAttempts >= maxAttempts) {
            console.error("❌ Max reconnect attempts reached. Exiting.");
            process.exit(1); // Stop script
        }
        console.error(`❌ Connection closed. Retrying in 15 seconds... (Attempt ${reconnectAttempts}/${maxAttempts})`);
        await delay(15000);
        connectToWhatsApp();
    } else if (connection === "open") {
        console.log(" [✅] Connected to WhatsApp using Pairing Code!");
        reconnectAttempts = 0; // Reset attempts on success
    }
  });


  sock.ev.on("messages.upsert", async (m) => {
      const TS = Date.now()
      //console.log(m)
      const msg = m.messages[0];
      const jid = msg.key.remoteJid!
      console.log(msg)
      const text = msg.message?.conversation ? msg.message.conversation : msg.message?.extendedTextMessage ? msg.message?.extendedTextMessage?.text : ''
      console.log(`\n ====== Text ====== \n [+] ${text}\n ==================`)

      if (!msg || msg.key.fromMe || !msg.message) return;

      if(states.waitingQuestion === true){
        const qlines = text?.split('\n');
        console.log(qlines);
        if (qlines != undefined) {
            if(qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)){
                const ans = mathSolver(qlines[3]);
                setTimeout(async () => {
                    await sock.sendMessage(jid, {text: `${ans.answer}`}); 
                    states.tfc += 1;
                    states.GBCount += 1;
                    states.prevAns = ans.answer as number
                    setTimeout(async() => {
                        states.waitingQuestion = false;
                        if(states.tfc > 30){
                            states.tfc = 0;  
                            await sock.sendMessage(jid, { text: `.tfbalance 62895634600989 5000` });
                        }
                    }, 3000)
                }, 1);
            }else if(qlines[0] === 'Maaf limit harian kamu sudah habis, beli premium untuk mendapatkan limit Unlimited, atau kamu dapat menunggu reset limit pada pukul 05.05 setiap harinya'){
                setTimeout(async () => {
                    await sock.sendMessage(jid, {text:`.buylimit 30`});
                    setTimeout(async() => {states.waitingQuestion = false}, 3000);
                }, 1);
            }else if(qlines[0] === 'Masih ada game yang blum kamu selesaikan'){
                await sock.sendMessage(jid, {text: `${states.prevAns}`}); 
                states.prevAns = 0;
                setTimeout(async () => {states.waitingQuestion = false}, 3000);
            }
        }
    }

      if(text?.startsWith('!ask')){
        const content = splitAtIndex(text, 4)[1]
        const answer = await getGeminiResponse(content);

        await sendMessageWTyping({ text: `> This answer is from an AI. \n \n ${answer}`}, msg.key.remoteJid!, true, msg);
      }else if(text === '!ping'){
        await sock.sendMessage(jid, { text: `Pong! 🚀 _${Date.now()-TS}ms_` }, { quoted: msg });
      }else if (text === '!startGB') {
        states.atChat = '62882006844990@s.whatsapp.net';
        states.runtime = Date.now();
        //const timeout = Number.parseInt(msg.body.split(' ')[1]);
        sendMessageWTyping({ text: `~ Starting Task. Call \`!stopGB\` to stop this process.` }, jid , true, undefined);
        states.inter = setInterval(async () => {
            if(!states.waitingQuestion || states.waitingFor > 10){
                states.waitingQuestion = true;
                states.waitingFor = 0;
                await sock.sendMessage(states.atChat, { text: ".math impossible" });
            }
            states.waitingFor += 1;
        }, 1000);
        /*
        setTimeout(async () => { 
            clearInterval(state.inter); 
            await msg.reply(`Task completed. TO: \`${timeout}m\``);
            state.inter = null;
            state.chatAt = null;
         }, ((timeout * 60) * 1000));
        */
    } else if (text === '!stopGB') {
      sendMessageWTyping({ text: `~ Task stopped. Call \`!startGB\` to re-start this process. \n \n # Question solved : *${states.GBCount}* \n # Estimated income : *${states.GBCount * 300}* \n # Task Runtime : ${Math.floor((Date.now() - states.runtime) / 60000)}m` }, jid, true, undefined);
      states.runtime = 0;
      clearInterval(states.inter as NodeJS.Timeout);
    }
    
      /*
      if (!msg.key.fromMe && msg.message) {
          console.log("Received a message:", msg);
          await sendMessageWTyping({ text: "Hello! I'm a bot!" }, msg.key.remoteJid!);
      }
      */
  });

  async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
      if(store) {
          const msg = await store.loadMessage(key.remoteJid!, key.id!)
          return msg?.message || undefined;
      }
      return proto.Message.fromObject({});
  }

  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string, rep: boolean, origin: any | null) => {
      await sock.presenceSubscribe(jid);
      await delay(500);
      await sock.sendPresenceUpdate('composing', jid);
      await delay(2000);
      await sock.sendPresenceUpdate('paused', jid);
      await sock.sendMessage(jid, msg, { quoted: rep ? origin : undefined });
  }

  function splitAtIndex(str: string, index: number) {
    return [str.slice(0, index), str.slice(index)];
  }
  
  async function getGeminiResponse(prompt: string) {
    const apiKey = `${process.env.GEMINIAPI}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
    try{
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents:[
            { parts: [{ text: '(Jawab dengan bahasa santai, dengan kalimat yang singkat & ga baku banget) \n \n' + prompt }] }
          ]
        }),
      });
      const data = await response.json();
      const res = data.candidates[0].content.parts[0].text
      return res;
    }catch(e){
      return "Oops! The server is overloaded :(";
    }
  }
  
  
}

connectToWhatsApp();

}catch(e){
  console.log("Errpr occured: ", e);
}


