const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { messageHandler } = require("./xiao");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  // 🔹 Handle QR code di terminal
  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("📱 Scan QR Code ini untuk login:");
      console.log(qr);
    }
    if (connection === "open") {
      console.log("✅ Bot berhasil tersambung ke WhatsApp!");
    } else if (connection === "close") {
      console.log("❌ Koneksi terputus, mencoba menyambung ulang...");
      startBot();
    }
  });

  // 🔹 Event pesan masuk
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;
    await messageHandler(sock, msg);
  });
}

startBot();
