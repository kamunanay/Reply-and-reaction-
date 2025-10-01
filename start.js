const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require("chalk"); // versi 4, jadi bisa require()
const readline = require("readline");
const { setupMessageHandler } = require("./xiao"); // handler pesan

// Input nomor di terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false, // kita pakai pairing code
        browser: Browsers.macOS("Desktop")
    });

    // Handler pesan
    setupMessageHandler(sock);

    // Pairing code login
    if (!sock.authState.creds.registered) {
        rl.question("📱 Masukkan nomor WhatsApp kamu (contoh: 628xxxxxx): ", async (nomor) => {
            const code = await sock.requestPairingCode(nomor);
            console.log(chalk.green(`🔑 Pairing code: ${code}`));
            console.log(chalk.yellow("➡️ Masukkan kode ini di WhatsApp: *Linked Devices > Pair with code*"));
        });
    }

    // Update koneksi
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
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
