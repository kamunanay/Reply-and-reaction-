const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal"); // tambahin ini
const { messageHandler } = require("./xiao");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("📱 Scan QR berikut di WhatsApp kamu:");
      qrcode.generate(qr, { small: true }); // tampilkan QR kotak
    }
    if (connection === "open") {
      console.log("✅ Bot berhasil tersambung ke WhatsApp!");
    } else if (connection === "close") {
      console.log("❌ Koneksi terputus, mencoba ulang...");
      startBot();
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;
    await messageHandler(sock, msg);
  });
}

startBot();
