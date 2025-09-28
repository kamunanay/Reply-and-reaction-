const fs = require('fs');
const chalk = require('chalk');

// ========== BOT SETTINGS ========== //
global.owner = '6281295344364';           // Nomor Owner
global.prefix = '.';                      // Prefix command  
global.namaBot = "Xiao Bot";              // Nama Bot
global.namaOwner = "Ganz";                // Nama Owner
global.linkGrup = "https://chat.whatsapp.com/...";
global.linkSaluran = "https://t.me/...";
global.versi = "2.0.0";

// ========== MESSAGE SETTINGS ========== //
global.mess = {
    owner: "❌ *Akses Ditolak*\nFitur ini hanya untuk Owner!",
    botAdmin: "❌ *Akses Ditolak*\nBot harus menjadi admin!",
    group: "❌ *Akses Ditolak*\nFitur hanya untuk group!",
    private: "❌ *Akses Ditolak*\nFitur hanya untuk private chat!",
    wait: "⏳ Sedang diproses...",
    error: "❌ Terjadi error!",
    done: "✅ Berhasil!",
    success: "✅ Success!"
};

// ========== AUTO REPLY SETTINGS ========== //
global.autoReply = {
    active: true,
    responses: {
        'hai|halo|hello|p|assalamualaikum': 'Halo! Ada yang bisa saya bantu? 🤗',
        'terima kasih|makasih|thanks|thx': 'Sama-sama! Senang bisa membantu 😊',
        'kamu di mana|dimana kamu|lokasi kamu': (userId) => {
            const status = global.db?.users?.[userId]?.status || 'di rumah';
            return `Saya saat ini ${status}. Ada yang bisa saya bantu? 🏠`;
        },
        'rumah|home|kamu di rumah': 'Ya, saya di rumah! Silakan bertanya jika butuh bantuan 🏡',
        'bot|robot': `Hai! Saya ${global.namaBot}, asisten WhatsApp Anda! 🤖`,
        'siapa nama kamu|nama kamu': `Saya ${global.namaBot}, bot WhatsApp yang siap membantu! 💫`,
        'help|bantuan|menu|perintah': `Ketik "${global.prefix}menu" untuk melihat daftar perintah! 📋`,
        'pengembang|developer|owner': `Owner bot: ${global.namaOwner} (${global.owner})`,
        'versi|version': `Versi ${global.versi} - ${global.namaBot}`
    }
};

// ========== REACTION SETTINGS ========== //
global.reactionSettings = {
    active: true,
    autoReactions: {
        'senang|happy|asyik|mantap|hore': '😄',
        'sedih|sad|duka|badmood': '😢',
        'love|sayang|cinta|rindu': '❤️',
        'terima kasih|makasih|thanks': '🙏',
        'keren|bagus|hebat|mantul': '👏',
        'oke|ok|sip|gas': '👍',
        'wow|astaga|anjay|lah': '😲',
        'haha|wkwk|lucu': '😂',
        'capek|lelah|penat': '😫'
    }
};

// ========== SYSTEM SETTINGS ========== //
global.system = {
    autoSave: 30000, // 30 detik
    maxReconnect: 10,
    reconnectDelay: 5000
};

console.log(chalk.green('✅ Settings loaded successfully!'));

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.yellow('🔄 Settings updated, reloading...'));
    delete require.cache[file];
    require(file);
});
