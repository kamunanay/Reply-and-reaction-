const fs = require('fs');
const chalk = require('chalk');

// ========== BOT SETTINGS ========== //
global.owner = '6281234567890';
global.prefix = '.';                      
global.namaBot = "Xiao Bot";              
global.namaOwner = "Ganz";
global.linkGrup = "https://chat.whatsapp.com/...";
global.linkSaluran = "https://t.me/...";
global.versi = "2.0.0";

// ========== MESSAGE SETTINGS ========== //
global.mess = {
    owner: "❌ Fitur ini hanya untuk Owner!",
    botAdmin: "❌ Bot harus jadi admin!",
    group: "❌ Fitur hanya untuk group!",
    private: "❌ Fitur hanya untuk private chat!",
    wait: "⏳ Tunggu sebentar...",
    error: "⚠️ Terjadi kesalahan!"
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
