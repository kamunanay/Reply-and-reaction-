const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require("chalk");
const qrcode = require("qrcode-terminal"); // tambahan untuk cetak QR ke terminal
const { setupMessageHandler } = require("./xiao");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false, // kita handle QR manual
        browser: Browsers.macOS("Desktop")
    });

    // Handler pesan
    setupMessageHandler(sock);

    // QR Code login
    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log(chalk.yellow("📷 Scan QR berikut untuk login:"));
            qrcode.generate(qr, { small: true }); // tampilkan QR di terminal
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow("🔄 Reconnecting..."));
                startBot();
            } else {
                console.log(chalk.red("❌ Logged out, hapus folder session dan coba lagi."));
            }
        } else if (connection === "open") {
            console.log(chalk.green("✅ Bot connected!"));
        }
    });

    // Simpan session
    sock.ev.on("creds.update", saveCreds);
}

// Jalankan bot
startBot();
