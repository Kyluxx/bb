//import logic from './logic'
import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    delay,
    AnyMessageContent
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
      const TS = Date.now()
      //console.log(m)
      const msg = m.messages[0];
      const jid = msg.key.remoteJid!
      console.log(msg)
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
      }
      
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


  



//I use Pairing code for connecting

// DUMP code
          /*
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("connection close due to ", lastDisconnect.error, " reconnecting ", shouldReconnect);
          */
            //if (shouldReconnect) {
          //};