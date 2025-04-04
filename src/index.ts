//import logic from './logic'
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
import pino from "pino";

const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, pino.destination('./wa-logs.txt'))
const store = makeInMemoryStore({ logger })
store?.readFromFile('./baileys_store_multi.json')
setInterval(() => {
	store?.writeToFile('./baileys_store_multi.json')
}, 10_000)


let tempState: {
  pushGbStr: string;
  pushGbJid: string;
  targetSet: boolean;
  arrList: string[],
  c: number
} = {
  pushGbStr: '',
  pushGbJid: '',
  targetSet: false,
  arrList: [],
  c: 0,
};

const connectToWhatsapp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: pino({level: "fatal"}),
        generateHighQualityLinkPreview: true,
        browser: Browsers.macOS("chrome"),
        
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const pairingCode = await sock.requestPairingCode("6285715377912")
            console.log(`\n \n CODE : ${pairingCode}`)
        }, 3000);

    }

    sock.ev.on("connection.update", ({connection, lastDisconnect}) => {
        if (connection === "close") {

                connectToWhatsapp()

        } else if (connection === "open") {
            console.log("> Connection Opened");
        }
    });

    sock.ev.on("creds.update", saveCreds);




    sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      const jid = msg.key.remoteJid!
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || ''
      const rMsg = msg.message?.reactionMessage?.text
      let i: string | number | NodeJS.Timeout | undefined
      
      const TS = Date.now()
      console.log(m)
      console.log(msg)
      console.log(msg.message?.extendedTextMessage)
      console.log(msg.message?.messageContextInfo)
      console.log(m.messages)
      //const gr = sock.groupMetadata

      const text = msg.message?.conversation ? msg.message.conversation : msg.message?.extendedTextMessage ? msg.message?.extendedTextMessage?.text : ''
      console.log(`\n ====== Text ====== \n [+] ${text}\n ==================`)

      if (msg.key.fromMe && text?.startsWith("!r")){
        
        let groups = splitAtIndex(text, 3)[1]
        let toMent = groups.split(/\s+/)
        let Rand = groups
        .split(/\s+/)
        .map(user => user.replace(/@/g, ""));
        let gRand = Rand
        .map(user => user + "@s.whatsapp.net")
        .sort(() => Math.random() - 0.5)
        
        
        let fStr = 
`
> _Diacak secara otomatis_

🔥 ${toMent[0]} *vs* ${toMent[1]}
🔥 ${toMent[2]} *vs* ${toMent[3]}

_*WAJIB SS HASIL MATCH, NO SS = HOAKS*_
`;

let rStr = 
`
*RULES FT CS BY LUXX*🔥

*SKILL*
- ALOK, HAYATO, CAROLINE, KELLY
(GAK ADA KARAKTER DI ATAS KOSONGIN AJA) 

*SENJATA*
- SG ALL SKIN
- SG 2 ONLY
- USP DAMAGE ? DISS (KECUALI AFK) 
- TINJU DAMAGE ? DISS

*TIDAK DI PERBOLEHKAN*
- LEVEL AKUN 5 - 20 WAJIB SS00
- NO CHEAT / FILE APAPUN ITU
- NO LT 2 , ATAP
- NO SEPATU TERBANG
- NO API UNGGUN
- PET KOSONGKAN // FALCO,PANTHER,KITTY BOLEH
- END ANIMASI? DISS
- NO CHARACTER CEWE
- 11/22 DI LARANG NGURUNG
- 33/44 BOLEH NGURUNG
*NO DRAMA DENGAN ALASAN APAPUN*

*DI PERBOLEHKAN*
- BOLEH RM JIKA ROUNDE MASIH 00 DAN BELUM ADA DAMAGE!!! 

*CARA BIKIN ROOM*
- MODE CRAZY STORE
- ROUNDE 13
- 1500 COINT
- AMMO TIDAK TERBATAS
- NO LOADOUT
- ALL AIR DROP OFFOFF
*BATAS WAKTU DIS 15 MENIT (NO TOLERANSI) KECUALI SHOLAT*


🔱 *JIKA ADA YANG MELANGGAR SILAHKAN RECC DAN KIRIM BUKTI KE GB , TANPA BUKTI?? HOAXS*🔱
`
        
        await sock.sendMessage(jid, {text: rStr})
        await sock.sendMessage(jid, {text: fStr, mentions: gRand})
        //await sock.sendMessage(jid, {text: gRand[1]})
      } else if(rMsg === '🚹'){

        tempState.targetSet = true
        tempState.pushGbJid = jid
        sock.sendMessage("62895634600989@s.whatsapp.net", {text: 'Target Set.'})

      } else if(text === "!pushstr"){

        if(!quoted){
          sock.sendMessage(jid, {text: 'Please reply to the message you want to push.'})
          return
        }

        tempState.pushGbStr = quoted
        sock.sendMessage(jid, {text: `Push Messages Set To: \n ${tempState.pushGbStr}`})

      } else if(text === "!getList"){

        if(tempState.targetSet && tempState.pushGbStr && tempState.pushGbJid){
          const list = sock.groupMetadata(tempState.pushGbJid)
          ;(await list).participants.forEach(u => {
            if (u.admin == null) tempState.arrList.push(u.id)
          })
        }
          sock.sendMessage("62895634600989@s.whatsapp.net", {text: 'List get.'})
          

      } else if (text === "!status"){

        sock.sendMessage(jid, {text: `Target: ${tempState.pushGbJid ? "SET" : "NOT SET"} \n Message: ${tempState.pushGbStr ? "SET" : "NOT SET"} \n List: ${tempState.arrList.length > 0 ? "SET" : "NOT SET"}`})

      } else if (text === "!progress"){

        sock.sendMessage(jid, {text: `Progress: ${tempState.c}/${tempState.arrList.length}\n Estimated Time: ${tempState.arrList.length * 7}s`})
      }else if (text === "!LAUNCH"){
        
        if(!tempState.pushGbStr || tempState.arrList.length <= 0 || !tempState.targetSet) return 

        sock.sendMessage(jid, {text: `Sending DMs... \n Total Member: ${tempState.arrList.length} \n Estimated Time : ${tempState.arrList.length * 7}s`})
        
        i = setInterval(() => {
          if(tempState.c % 25 === 0) delay(Math.floor(Math.random()*20000+10000))
          sock.sendMessage(tempState.arrList[tempState.c], {text: tempState.pushGbStr})
          tempState.c++
          if(tempState.c >= tempState.arrList.length) {
            clearInterval(i)
            sock.sendMessage("62895634600989@s.whatsapp.net", {text: 'Completed. \n Total Member: ' + tempState.arrList.length + '\n Sent: ' + tempState.c})
          }
          
        }, Math.floor(Math.random()*5000+3000))
      } else if (text === "!kill"){
        clearInterval(i)
        sock.sendMessage(jid, {text: 'Process Stopped.'})
      } else if (text === '!clear'){
        tempState.arrList = []
        tempState.c = 0
        tempState.pushGbJid = ''
        tempState.pushGbStr = ''
        sock.sendMessage(jid, {text: 'Cleared.'})
      }
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      ////////////////////////////////
      
      if (!msg || msg.key.fromMe || !msg.message) return;
      
      switch(true){
        case text?.startsWith('LUXX'):
          await sendMessageWTyping({text:
`
*‼️FORMAT PENDAFTARAN‼️*

*11/22/33/44 =* 

*🔥SISTEM FULL TF SUNG GASS🔥*

*‼️GB FT CS 3K LUXX FT‼️*

*GB LANGGANAN LUXX FT* 
https://chat.whatsapp.com/LAa2eLl5M8t3auGHPE58HZ

*PP KOSONG = CLOSE*
*PP QRIS = OPEN*
*NUNGGU OPEN ? SAMBIL JOIN GB !*
`}, jid, false, msg
  )
          break;
      }

    })
    
  function splitAtIndex(str: string, index: number) {
    return [str.slice(0, index), str.slice(index)];
  }
    
  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string, rep: boolean, origin: any | null) => {
      await sock.presenceSubscribe(jid);
      await delay(500);
      await sock.sendPresenceUpdate('composing', jid);
      await delay(2000);
      await sock.sendPresenceUpdate('paused', jid);
      await sock.sendMessage(jid, msg, { quoted: rep ? origin : undefined });
  }
  

};

connectToWhatsapp()


async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
  if(store) {
      const msg = await store.loadMessage(key.remoteJid!, key.id!)
      return msg?.message || undefined;
  }
  return proto.Message.fromObject({});
}



//I use Pairing code for connecting

// DUMP code



          /*
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("connection close due to ", lastDisconnect.error, " reconnecting ", shouldReconnect);
          */
            //if (shouldReconnect) {
          //};


          /*
        if(quoted){
          
          let list = (await sock.groupMetadata(jid)).participants
          console.log(list)
          list.forEach(o => {
            if(o.admin == null){
              sock.sendMessage(o.id, {text: quoted})
            }
          })
          
        }
        
        */