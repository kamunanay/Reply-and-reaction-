require('./settings');
const fs = require('fs');
const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const { say } = require('cfonts');
const os = require('os');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeInMemoryStore,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');

// Configuration
const CONFIG = {
    pairingCode: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 5000,
    sessionPath: 'session'
};

// Initialize components
const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const Database = require('./database');
const database = new Database();

let reconnectAttempts = 0;
let isShuttingDown = false;

// ========== BANNER DISPLAY ========== //
function showBanner() {
    try {
        console.clear();
        say('Xiao Bot', {
            font: 'block',
            align: 'center',
            colors: ['magenta', 'white'],
            background: 'transparent',
            letterSpacing: 1,
            lineHeight: 1,
            space: true,
            maxLength: '0'
        });
    } catch (error) {
        console.log(chalk.magenta.bold(`
╔══╗....<💖
╚╗╔╝..('\../')
╔╝╚╗..( •.• )
╚══╝..(,,)(,,) .<💖
╔╗╔═╦╦╦═╗ ╔╗╔╗
║╚╣║║║║╩╣ ║╚╝║
╚═╩═╩═╩═╝ ╚══╝
        `));
    }
    
    console.log(chalk.cyan.bold(`🤖 ${global.namaBot} v${global.versi}`));
    console.log(chalk.cyan(`👤 Owner: ${global.namaOwner}`));
    console.log(chalk.gray('═'.repeat(50)));
}

// ========== DATABASE INITIALIZATION ========== //
async function initializeDatabase() {
    try {
        console.log(chalk.yellow('📀 Loading database...'));
        const loadData = await database.read();
        
        if (!loadData || Object.keys(loadData).length === 0) {
            global.db = {
                users: {},
                groups: {},
                settings: {
                    autoReply: true,
                    autoReaction: true,
                    createdAt: new Date().toISOString()
                },
                stats: {
                    totalMessages: 0,
                    totalCommands: 0,
                    startTime: Date.now(),
                    lastStart: new Date().toISOString()
                }
            };
            await database.write(global.db);
            console.log(chalk.green('✅ Database initialized successfully!'));
        } else {
            global.db = loadData;
            
            // Ensure stats object exists
            if (!global.db.stats) {
                global.db.stats = {
                    totalMessages: 0,
                    totalCommands: 0,
                    startTime: Date.now(),
                    lastStart: new Date().toISOString()
                };
            }
            
            // Update last start time
            global.db.stats.lastStart = new Date().toISOString();
            await database.write(global.db);
            
            console.log(chalk.green('✅ Database loaded successfully!'));
            console.log(chalk.blue(`📊 Users: ${Object.keys(global.db.users || {}).length}`));
            console.log(chalk.blue(`📊 Groups: ${Object.keys(global.db.groups || {}).length}`));
        }
        
        // Auto-save database
        setInterval(async () => {
            if (global.db && !isShuttingDown) {
                try {
                    await database.write(global.db);
                    console.log(chalk.gray('💾 Database auto-saved'));
                } catch (error) {
                    console.error(chalk.red('❌ Database auto-save error:'), error.message);
                }
            }
        }, global.system?.autoSave || 30000);
        
    } catch (error) {
        console.error(chalk.red('❌ Database initialization failed:'), error);
        process.exit(1);
    }
}

// ========== SYSTEM INFO ========== //
function getSystemInfo() {
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
            total: formatBytes(os.totalmem()),
            used: formatBytes(os.totalmem() - os.freemem()),
            free: formatBytes(os.freemem()),
            usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1) + '%'
        },
        cpu: {
            cores: os.cpus().length,
            model: os.cpus()[0]?.model || 'Unknown'
        },
        uptime: formatUptime(os.uptime()),
        botUptime: global.db?.stats?.startTime ? 
            formatUptime((Date.now() - global.db.stats.startTime) / 1000) : '0d 0h 0m'
    };
}

// ========== BOT INITIALIZATION ========== //
async function startBot() {
    try {
        console.log(chalk.yellow('🚀 Starting WhatsApp bot...'));
        
        // Create session directory if not exists
        if (!fs.existsSync(CONFIG.sessionPath)) {
            fs.mkdirSync(CONFIG.sessionPath, { recursive: true });
        }

        const store = makeInMemoryStore({ 
            logger: pino().child({ level: 'silent', stream: 'store' }) 
        });
        
        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionPath);
        
        const sock = makeWASocket({
            logger: pino({ level: "silent" }),
            printQRInTerminal: !CONFIG.pairingCode,
            auth: state,
            browser: ["Xiao-Bot", "Chrome", "3.0"],
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        // ========== PAIRING CODE SYSTEM ========== //
        if (CONFIG.pairingCode && !sock.authState.creds.registered) {
            console.log(chalk.yellow('📱 Pairing Code Mode Activated'));
            
            // Simple verification
            const answer = await question(chalk.blue('🔑 Masukkan kode aktivasi: '));
            if (answer.toLowerCase() !== 'xiao') {
                console.log(chalk.red('❌ Kode aktivasi salah!'));
                rl.close();
                process.exit(1);
            }
            
            let phoneNumber = await question(chalk.blue('📞 Masukkan nomor WhatsApp (628xxxx): '));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            
            // Format phone number
            if (!phoneNumber.startsWith('62')) {
                phoneNumber = '62' + phoneNumber.replace(/^0+/, '');
            }
            
            console.log(chalk.yellow('⏳ Meminta pairing code...'));
            
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const formattedCode = code.match(/.{1,4}/g).join('-');
                
                console.log('\n' + chalk.green('='.repeat(50)));
                console.log(chalk.green.bold('✅ PAIRING CODE BERHASIL!'));
                console.log(chalk.white.bold(`📱 Kode: ${formattedCode}`));
                console.log(chalk.yellow('📲 Buka WhatsApp → Linked Devices → Link a Device'));
                console.log(chalk.yellow('📲 Masukkan kode di atas untuk menghubungkan bot'));
                console.log(chalk.green('='.repeat(50)) + '\n');
                
            } catch (error) {
                console.log(chalk.red('❌ Gagal mendapatkan pairing code:'), error.message);
                console.log(chalk.yellow('💡 Pastikan nomor WhatsApp benar dan terdaftar'));
                process.exit(1);
            }
        }

        // ========== EVENT HANDLERS ========== //
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;
            
            if (qr && !CONFIG.pairingCode) {
                console.log(chalk.yellow('📱 Scan QR Code di atas dengan WhatsApp'));
            }
            
            if (isNewLogin) {
                console.log(chalk.yellow('🔄 New login detected, session updated'));
            }
            
            if (connection === 'open') {
                reconnectAttempts = 0;
                console.log(chalk.green('✅ Berhasil terhubung ke WhatsApp!'));
                
                // Display system info
                const sysInfo = getSystemInfo();
                console.log(chalk.blue(`
🤖 BOT INFORMATION
  Name    : ${global.namaBot} v${global.versi}
  Owner   : ${global.namaOwner}
  Prefix  : ${global.prefix}

💻 SYSTEM STATUS
  Platform: ${sysInfo.platform} ${sysInfo.arch}
  Node.js : ${sysInfo.nodeVersion}
  Memory  : ${sysInfo.memory.used} / ${sysInfo.memory.total} (${sysInfo.memory.usage})
  CPU     : ${sysInfo.cpu.cores} cores
  Uptime  : ${sysInfo.uptime}

📊 BOT STATISTICS
  Users   : ${Object.keys(global.db.users || {}).length}
  Groups  : ${Object.keys(global.db.groups || {}).length}
  Messages: ${global.db.stats?.totalMessages || 0}
  Commands: ${global.db.stats?.totalCommands || 0}
                `));
                
                // Send startup message to owner
                try {
                    await sock.sendMessage(global.owner + '@s.whatsapp.net', {
                        text: `🤖 *${global.namaBot} is Now Online!*\n\n` +
                              `✅ Berhasil terhubung ke WhatsApp\n` +
                              `⏰ Server: ${sysInfo.platform}\n` +
                              `💾 Memory: ${sysInfo.memory.usage}\n` +
                              `📊 Users: ${Object.keys(global.db.users || {}).length}\n` +
                              `🕒 Started: ${new Date().toLocaleString('id-ID')}`
                    });
                } catch (error) {
                    console.log(chalk.yellow('⚠️ Tidak bisa mengirim pesan ke owner'));
                }
            }
            
            if (connection === 'close') {
                const reason = new (require('@hapi/boom'))(lastDisconnect?.error)?.output?.statusCode;
                console.log(chalk.yellow(`🔌 Koneksi terputus (Reason: ${reason || 'Unknown'})`));
                
                if (reason === DisconnectReason.loggedOut || 
                    reason === DisconnectReason.badSession ||
                    reason === DisconnectReason.multideviceMismatch) {
                    
                    console.log(chalk.red('❌ Session bermasalah!'));
                    console.log(chalk.yellow('🔄 Hapus folder session dan restart bot...'));
                    
                    // Delete session folder
                    if (fs.existsSync(CONFIG.sessionPath)) {
                        fs.rmSync(CONFIG.sessionPath, { recursive: true });
                    }
                    
                    setTimeout(() => {
                        console.log(chalk.yellow('🚀 Restarting bot...'));
                        startBot();
                    }, 2000);
                    
                } else if (reconnectAttempts < CONFIG.maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(chalk.yellow(`🔄 Mencoba reconnect... (Percobaan ${reconnectAttempts}/${CONFIG.maxReconnectAttempts})`));
                    setTimeout(startBot, CONFIG.reconnectDelay);
                } else {
                    console.log(chalk.red('❌ Gagal reconnect setelah beberapa percobaan!'));
                    process.exit(1);
                }
            }
        });

        // ========== MESSAGE HANDLER SETUP ========== //
        store.bind(sock.ev);
        const { setupMessageHandler } = require('./Xiao');
        setupMessageHandler(sock, store);
        
        console.log(chalk.green('🎯 Bot siap menerima pesan!'));
        return sock;

    } catch (error) {
        console.error(chalk.red('❌ Bot startup error:'), error.message);
        
        if (reconnectAttempts < CONFIG.maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(chalk.yellow(`🔄 Restarting... (Attempt ${reconnectAttempts}/${CONFIG.maxReconnectAttempts})`));
            setTimeout(startBot, CONFIG.reconnectDelay);
        } else {
            console.log(chalk.red('❌ Max restart attempts reached!'));
            process.exit(1);
        }
    }
}

// ========== ERROR HANDLERS ========== //
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection:'), reason);
});

process.on('SIGINT', async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(chalk.yellow('\n🛑 Shutting down bot...'));
    
    // Save database before exit
    if (global.db) {
        try {
            await database.write(global.db);
            console.log(chalk.green('💾 Database saved successfully'));
        } catch (error) {
            console.error(chalk.red('❌ Database save failed:'), error);
        }
    }
    
    rl.close();
    console.log(chalk.green('👋 Bot stopped successfully!'));
    process.exit(0);
});

// ========== MAIN EXECUTION ========== //
async function main() {
    showBanner();
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        console.log(chalk.red('❌ Node.js version too old!'));
        console.log(chalk.yellow('💡 Please install Node.js 16 or higher'));
        process.exit(1);
    }
    
    await initializeDatabase();
    await startBot();
}

// Start the application
main().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
});
