const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { messageHandler } = require("./xiao");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  // Event pesan masuk
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;
    await messageHandler(sock, msg);
  });
}

startBot();
