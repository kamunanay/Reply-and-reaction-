require('./settings');
const { delay } = require('@whiskeysockets/baileys');
const chalk = require('chalk');
const { 
    saveUserStatus, 
    getUserStatus, 
    replyMessage, 
    isOwner, 
    getAutoReply, 
    getAutoReaction,
    getUserInfo,
    incrementMessageCount,
    incrementCommandCount,
    generateUserReport,
    formatDuration
} = require('./function');

// Message handler setup
function setupMessageHandler(sock, store) {
    console.log(chalk.green('✅ Message handler setup completed!'));

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            
            // Skip status broadcasts and group notifications
            if (from === 'status@broadcast' || msg.message.protocolMessage) return;

            const body = getMessageBody(msg);
            if (!body) return;

            // Update message count
            incrementMessageCount(sender);

            const userInfo = getUserInfo(sender);

            // ========== AUTO REPLY SYSTEM ========== //
            if (userInfo.autoReply !== false && !body.startsWith(global.prefix)) {
                const autoReply = getAutoReply(body, sender);
                if (autoReply) {
                    await delay(1000 + Math.random() * 2000); // Random delay 1-3s
                    await replyMessage(sock, from, autoReply, msg);
                    console.log(chalk.cyan(`[AUTO-REPLY] to ${sender.split('@')[0]}: ${autoReply}`));
                }
            }

            // ========== AUTO REACTION SYSTEM ========== //
            if (userInfo.autoReaction !== false && !body.startsWith(global.prefix)) {
                const autoReaction = getAutoReaction(body);
                if (autoReaction) {
                    await delay(500 + Math.random() * 1000); // Random delay 0.5-1.5s
                    try {
                        await sock.sendMessage(from, {
                            react: {
                                text: autoReaction,
                                key: msg.key
                            }
                        });
                        console.log(chalk.magenta(`[AUTO-REACTION] to ${sender.split('@')[0]}: ${autoReaction}`));
                    } catch (reactionError) {
                        console.log(chalk.yellow('⚠️ Failed to send reaction'));
                    }
                }
            }

            // ========== COMMAND HANDLER ========== //
            if (!body.startsWith(global.prefix)) return;

            const args = body.slice(global.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const text = args.join(' ');

            // Update command count
            incrementCommandCount(sender);
            console.log(chalk.blue(`[COMMAND] ${command} from ${sender.split('@')[0]}`));

            // ========== COMMAND: STATUS ========== //
            if (command === 'status') {
                if (!text) {
                    const currentStatus = getUserStatus(sender);
                    return await replyMessage(sock, from, 
                        `📍 *Status Anda*\n\n` +
                        `Saat ini: "${currentStatus}"\n\n` +
                        `Contoh: ${global.prefix}status Sedang bekerja di kantor`, 
                        msg
                    );
                }
                saveUserStatus(sender, text);
                await replyMessage(sock, from, 
                    `✅ *Status Berhasil Disimpan*\n\n"${text}"`, 
                    msg
                );
            }

            // ========== COMMAND: AUTOREPLY ========== //
            else if (command === 'autoreply') {
                if (!text) {
                    const status = userInfo.autoReply !== false ? 'AKTIF ✅' : 'NONAKTIF ❌';
                    return await replyMessage(sock, from, 
                        `⚙️ *Auto Reply Settings*\n\n` +
                        `Status: ${status}\n\n` +
                        `*Penggunaan:*\n` +
                        `• ${global.prefix}autoreply on - Aktifkan auto reply\n` +
                        `• ${global.prefix}autoreply off - Nonaktifkan auto reply`,
                        msg
                    );
                }
                
                if (text === 'on' || text === 'enable') {
                    userInfo.autoReply = true;
                    await replyMessage(sock, from, '✅ *Auto Reply diaktifkan*', msg);
                } else if (text === 'off' || text === 'disable') {
                    userInfo.autoReply = false;
                    await replyMessage(sock, from, '❌ *Auto Reply dinonaktifkan*', msg);
                } else {
                    await replyMessage(sock, from, 
                        `❓ *Penggunaan salah*\n\n` +
                        `Gunakan: ${global.prefix}autoreply on/off`,
                        msg
                    );
                }
            }

            // ========== COMMAND: REACTION ========== //
            else if (command === 'reaction') {
                if (!text) {
                    const status = userInfo.autoReaction !== false ? 'AKTIF ✅' : 'NONAKTIF ❌';
                    return await replyMessage(sock, from, 
                        `🎭 *Auto Reaction Settings*\n\n` +
                        `Status: ${status}\n\n` +
                        `*Penggunaan:*\n` +
                        `• ${global.prefix}reaction on - Aktifkan auto reaction\n` +
                        `• ${global.prefix}reaction off - Nonaktifkan auto reaction\n` +
                        `• ${global.prefix}reaction 😄 - Beri reaction manual`,
                        msg
                    );
                }
                
                if (text === 'on' || text === 'enable') {
                    userInfo.autoReaction = true;
                    await replyMessage(sock, from, '✅ *Auto Reaction diaktifkan*', msg);
                } else if (text === 'off' || text === 'disable') {
                    userInfo.autoReaction = false;
                    await replyMessage(sock, from, '❌ *Auto Reaction dinonaktifkan*', msg);
                } else {
                    // Manual reaction
                    try {
                        await sock.sendMessage(from, {
                            react: {
                                text: text.trim(),
                                key: msg.key
                            }
                        });
                        console.log(chalk.magenta(`[MANUAL-REACTION] to ${sender.split('@')[0]}: ${text}`));
                    } catch (error) {
                        await replyMessage(sock, from, '❌ Gagal mengirim reaction', msg);
                    }
                }
            }

            // ========== COMMAND: BALAS ========== //
            else if (command === 'balas') {
                if (!text) {
                    return await replyMessage(sock, from, 
                        `💬 *Balas Manual*\n\n` +
                        `Contoh: ${global.prefix}balas Hai, apa kabar?`,
                        msg
                    );
                }
                await replyMessage(sock, from, text, msg);
            }

            // ========== COMMAND: INFO ========== //
            else if (command === 'info') {
                const report = generateUserReport(sender);
                const infoText = 
                    `👤 *Informasi Pengguna*\n\n` +
                    `📍 Status: ${report.status}\n` +
                    `🤖 Auto Reply: ${report.autoReply}\n` +
                    `🎭 Auto Reaction: ${report.autoReaction}\n` +
                    `📊 Pesan Dikirim: ${report.messageCount}\n` +
                    `⚡ Command Digunakan: ${report.commandCount}\n` +
                    `📅 Bergabung: ${report.joinDate}\n\n` +
                    `🤖 *Bot Statistics*\n` +
                    `⏰ Uptime: ${report.botUptime}\n` +
                    `👥 Total Pengguna: ${report.totalUsers}\n` +
                    `💬 Total Pesan: ${report.totalMessages}`;
                
                await replyMessage(sock, from, infoText, msg);
            }

            // ========== COMMAND: MENU ========== //
            else if (command === 'menu' || command === 'help' || command === '?' ) {
                const menuText = 
                    `🤖 *${global.namaBot} Menu* v${global.versi}\n\n` +
                    
                    `📍 *STATUS & LOKASI*\n` +
                    `• ${global.prefix}status [teks] - Set status/lokasi\n` +
                    `• ${global.prefix}info - Info pengguna & bot\n\n` +
                    
                    `🤖 *FITUR OTOMATIS*\n` +
                    `• ${global.prefix}autoreply [on/off] - Auto balas chat\n` +
                    `• ${global.prefix}reaction [on/off/emoji] - Auto reaction\n\n` +
                    
                    `🎯 *FITUR MANUAL*\n` +
                    `• ${global.prefix}balas [teks] - Balas manual\n` +
                    `• ${global.prefix}menu - Tampilkan menu ini\n\n` +
                    
                    `📊 *STATISTIK*\n` +
                    `• ${global.prefix}ping - Cek kecepatan bot\n\n` +
                    
                    `🔧 *CONTOH PENGGUNAAN*\n` +
                    `${global.prefix}status Sedang liburan di Bali\n` +
                    `${global.prefix}reaction 😄\n` +
                    `${global.prefix}autoreply on\n\n` +
                    
                    `📞 *Owner*: ${global.namaOwner}`;
                
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }

            // ========== COMMAND: PING ========== //
            else if (command === 'ping') {
                const start = Date.now();
                await replyMessage(sock, from, '🏓 Pong!', msg);
                const latency = Date.now() - start;
                
                const stats = generateUserReport(sender);
                const pingText = 
                    `📊 *Bot Performance*\n\n` +
                    `⏱️ Latency: ${latency}ms\n` +
                    `⏰ Uptime: ${stats.botUptime}\n` +
                    `💬 Pesan Anda: ${stats.messageCount}\n` +
                    `⚡ Command Anda: ${stats.commandCount}`;
                
                await sock.sendMessage(from, { text: pingText });
            }

            // ========== COMMAND: BROADCAST (OWNER ONLY) ========== //
            else if (command === 'bc' || command === 'broadcast') {
                if (!isOwner(sender)) {
                    return await replyMessage(sock, from, global.mess.owner, msg);
                }
                
                if (!text) {
                    return await replyMessage(sock, from, 
                        `📢 *Broadcast Message*\n\n` +
                        `Contoh: ${global.prefix}bc Hai semua! Update baru tersedia.`,
                        msg
                    );
                }
                
                const users = Object.keys(global.db.users || {});
                if (users.length === 0) {
                    return await replyMessage(sock, from, '❌ Tidak ada pengguna untuk di-broadcast', msg);
                }
                
                await replyMessage(sock, from, 
                    `📢 Memulai broadcast ke ${users.length} pengguna...`, 
                    msg
                );
                
                let success = 0;
                let failed = 0;
                
                for (const user of users) {
                    try {
                        await sock.sendMessage(user, { 
                            text: `📢 *Broadcast dari ${global.namaOwner}*\n\n${text}\n\n_— ${global.namaBot}_`
                        });
                        success++;
                        await delay(2000); // Delay 2 detik antar pesan
                    } catch (error) {
                        failed++;
                    }
                }
                
                await replyMessage(sock, from, 
                    `📢 *Broadcast Selesai!*\n\n` +
                    `✅ Berhasil: ${success}\n` +
                    `❌ Gagal: ${failed}`, 
                    msg
                );
            }

            // ========== COMMAND: EVAL (OWNER ONLY) ========== //
            else if (command === 'eval') {
                if (!isOwner(sender)) {
                    return await replyMessage(sock, from, global.mess.owner, msg);
                }
                
                try {
                    const result = eval(text);
                    await replyMessage(sock, from, 
                        `📝 *Eval Result*\n\n` +
                        `Input: ${text}\n\n` +
                        `Output: ${JSON.stringify(result, null, 2)}`, 
                        msg
                    );
                } catch (error) {
                    await replyMessage(sock, from, 
                        `❌ *Eval Error*\n\n${error.message}`, 
                        msg
                    );
                }
            }

            // ========== UNKNOWN COMMAND ========== //
            else {
                await replyMessage(sock, from, 
                    `❓ *Command tidak dikenali*\n\n` +
                    `Ketik ${global.prefix}menu untuk melihat daftar command yang tersedia.`,
                    msg
                );
            }

        } catch (error) {
            console.error(chalk.red('❌ Message handler error:'), error);
        }
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log(chalk.green('✅ WhatsApp connected successfully!'));
        }
    });
}

// Helper function to extract message body
function getMessageBody(msg) {
    if (!msg.message) return '';
    
    const messageTypes = {
        'conversation': msg.message.conversation,
        'extendedTextMessage': msg.message.extendedTextMessage?.text,
        'imageMessage': msg.message.imageMessage?.caption,
        'videoMessage': msg.message.videoMessage?.caption,
        'documentMessage': msg.message.documentMessage?.caption
    };
    
    const type = Object.keys(msg.message)[0];
    return messageTypes[type] || '';
}

module.exports = { setupMessageHandler };
