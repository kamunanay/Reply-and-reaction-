const axios = require("axios");
const { prefix, botName } = require("./setting");

// ==========================
// 🔹 Auto Reply & Reaction DB
// ==========================
const autoReplies = {
  "halo": "Hai juga 👋",
  "hallo": "Hallo juga 👋",
  "hai": "Hai juga 😊",
  "assalamualaikum": "Waalaikumussalam 😊",
  "pagi": "Selamat pagi ☀️",
  "siang": "Selamat siang 🌞",
  "malam": "Selamat malam 🌙",
  "thanks": "Sama-sama 🙏",
  "makasih": "Sama-sama 🙏",
  "terimakasih": "Sama-sama 🙏",
  "bot": "Ya, saya bot WhatsApp 🤖",
  "test": "Bot aktif ✅",
  "lagi apa": "Lagi ngoding 💻",
  "dimana": "Lagi di server 🖥️"
};

const chatReactions = {
  "mantap": "🔥",
  "anjay": "🤯",
  "keren": "😎",
  "ok": "👌",
  "nice": "👍",
  "good": "✅",
  "wow": "😲",
  "haha": "😂",
  "wkwk": "🤣",
  "love": "❤️",
  "gacor": "🕊️",
  "amazing": "✨"
};

// 🔹 Emoji untuk reaction ke STATUS
const statusReactions = ["❤️", "🔥", "😂", "😍", "😮", "👍", "😎", "🙏", "✨", "💯"];

// ==========================
// 🔹 Message Handler
// ==========================
async function messageHandler(sock, m) {
  try {
    const body =
      (m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        "").trim();

    if (!body && !m.key.remoteJid.endsWith("@status")) return;

    // =====================
    // 🟢 Reaction ke STATUS
    // =====================
    if (m.key.remoteJid.endsWith("@status")) {
      const emoji = statusReactions[Math.floor(Math.random() * statusReactions.length)];
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: emoji, key: m.key }
      });
      console.log(`💫 Reacted to status with ${emoji}`);
      return;
    }

    // =====================
    // 📜 Menu Gahar
    // =====================
    if (body === `${prefix}menu`) {
      const menuText = `
┏━🔥 *${botName.toUpperCase()}* 🔥━┓
┃ 🤖 Bot WhatsApp Gahar
┃
┃ 📜 ${prefix}menu
┃     ➠ Menampilkan menu
┃
┃ 🎵 ${prefix}tiktok <url>
┃     ➠ Download video TikTok
┃
┃ 💬 Auto Reply
┃     ➠ Balas otomatis kata tertentu
┃
┃ 😎 Auto Reaction
┃     ➠ Kasih emoji ke chat
┃
┃ 💫 Status Reaction
┃     ➠ Kasih emoji otomatis ke Story/Status
┃
┗━━━━━━━━━━━━━━━┛
⚡ Powered by ${botName}
`;
      await sock.sendMessage(m.key.remoteJid, { text: menuText });
      return;
    }

    // =====================
    // 🎵 TikTok Downloader
    // =====================
    if (body.startsWith(`${prefix}tiktok`)) {
      const args = body.split(" ");
      if (args.length < 2) {
        await sock.sendMessage(m.key.remoteJid, {
          text: "⚠️ Masukkan link TikTok!\nContoh: .tiktok https://vt.tiktok.com/xxxx/"
        });
        return;
      }
      const url = args[1];

      try {
        const api = `https://iceflow.biz.id/downloader/tiktok?apikey=%40notsuspend.21&url=${encodeURIComponent(url)}`;
        const res = await axios.get(api);

        if (res.data?.status) {
          const result = res.data.result;
          const videoUrl =
            result.video?.noWatermark ||
            result.video?.standard ||
            result.video?.high ||
            result.video?.watermark;

          if (!videoUrl) {
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Tidak menemukan link video di API." });
            return;
          }

          const title = result.title || "Tanpa judul";
          const author = result.author || "Unknown";
          const tags = result.tags?.length ? result.tags.join(", ") : "Tidak ada";

          const caption = `
🎵 *TikTok Downloader*
────────────────────
📌 *Judul* : ${title}
👤 *Pembuat* : ${author}
🏷️ *Tags* : ${tags}
🔗 *Link*: ${url}
`;

          await sock.sendMessage(m.key.remoteJid, {
            video: { url: videoUrl },
            caption: caption,
          });
        } else {
          await sock.sendMessage(m.key.remoteJid, { text: "❌ Gagal ambil video. Coba link lain." });
        }
      } catch (e) {
        console.error(e);
        await sock.sendMessage(m.key.remoteJid, { text: "⚠️ Error ambil data dari API" });
      }
      return;
    }

    // =====================
    // 💬 Auto Reply di Chat
    // =====================
    const lower = body.toLowerCase();
    if (autoReplies[lower]) {
      await sock.sendMessage(m.key.remoteJid, { text: autoReplies[lower] });
      return;
    }

    // =====================
    // 😎 Reaction di Chat
    // =====================
    for (let keyword in chatReactions) {
      if (lower.includes(keyword)) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: chatReactions[keyword], key: m.key } });
        break;
      }
    }

  } catch (err) {
    console.error("Message handler error:", err);
  }
}

module.exports = { messageHandler };