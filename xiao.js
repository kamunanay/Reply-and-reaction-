const chalk = require("chalk");
const axios = require("axios");
const { autoReply, autoReaction } = require("./database");
require("./setting"); // load global settings

async function setupMessageHandler(sock, store) {
    // Pesan masuk
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // AUTO REPLY
        for (let key in autoReply) {
            if (text.toLowerCase().includes(key)) {
                await sock.sendMessage(from, { text: autoReply[key] }, { quoted: msg });
            }
        }

        // AUTO REACTION
        for (let key in autoReaction) {
            if (text.toLowerCase().includes(key)) {
                await sock.sendMessage(from, { react: { text: autoReaction[key], key: msg.key } });
            }
        }

        // COMMAND
        if (text.startsWith(global.prefix)) {
            const args = text.slice(1).trim().split(" ");
            const cmd = args.shift().toLowerCase();

            switch (cmd) {
                case "menu": {
                    let menu = `
┏━━━「 ${global.namaBot} 」
┃ Owner : ${global.namaOwner}
┃ Prefix: ${global.prefix}
┃ Versi : ${global.versi}
┗━━━━━━━━━━━━━

📌 MENU
• ${global.prefix}tiktok <url>
• ${global.prefix}autoreply
• ${global.prefix}autoreact
• ${global.prefix}ping
                    `;
                    await sock.sendMessage(from, { text: menu }, { quoted: msg });
                }
                break;

                case "ping":
                    await sock.sendMessage(from, { text: "Pong 🏓" }, { quoted: msg });
                break;

                case "tiktok": {
                    if (!args[0]) return sock.sendMessage(from, { text: "❌ Masukkan link TikTok!" }, { quoted: msg });
                    try {
                        let url = `https://iceflow.biz.id/downloader/tiktok?apikey=%40notsuspend.21&url=${args[0]}`;
                        let { data } = await axios.get(url);

                        if (!data.status) {
                            return sock.sendMessage(from, { text: "⚠️ Gagal ambil data TikTok" }, { quoted: msg });
                        }

                        let hasil = `🎵 *TikTok Downloader*
📌 Judul: ${data.result.title || "-"}
👤 Creator: ${data.creator}`;

                        await sock.sendMessage(from, { text: hasil }, { quoted: msg });

                        if (data.result.video?.high) {
                            await sock.sendMessage(from, { video: { url: data.result.video.high }, caption: "🎥 Video HD" }, { quoted: msg });
                        } else if (data.result.video?.standard) {
                            await sock.sendMessage(from, { video: { url: data.result.video.standard }, caption: "🎥 Video" }, { quoted: msg });
                        }

                        if (data.result.audio) {
                            await sock.sendMessage(from, { audio: { url: data.result.audio }, mimetype: "audio/mpeg" }, { quoted: msg });
                        }
                    } catch (e) {
                        console.log(e);
                        await sock.sendMessage(from, { text: "❌ Error ambil data API" }, { quoted: msg });
                    }
                }
                break;

                default:
                    await sock.sendMessage(from, { text: "❌ Command tidak dikenal!" }, { quoted: msg });
                break;
            }
        }
    });

    // AUTO REACTION STATUS / STORY
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        if (msg.key.remoteJid === "status@broadcast") {
            try {
                await sock.sendMessage("status@broadcast", {
                    react: { text: "🔥", key: msg.key }
                });
                console.log(chalk.green("✅ Auto react ke status/story"));
            } catch (e) {
                console.log("❌ Gagal react ke status:", e);
            }
        }
    });
}

module.exports = { setupMessageHandler };
