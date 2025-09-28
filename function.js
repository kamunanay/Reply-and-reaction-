const fs = require('fs');
const chalk = require('chalk');

// Utility Functions
const utils = {
    // Random selection from array
    pickRandom(list) {
        return list[Math.floor(Math.random() * list.length)];
    },

    // Generate random number between min and max
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Check if sender is owner
    isOwner(sender) {
        const ownerJid = global.owner.includes('@') ? global.owner : global.owner + '@s.whatsapp.net';
        return sender === ownerJid;
    },

    // Format duration from milliseconds
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days} hari`);
        if (hours > 0) parts.push(`${hours} jam`);
        if (minutes > 0) parts.push(`${minutes} menit`);
        if (secs > 0) parts.push(`${secs} detik`);

        return parts.join(' ') || '0 detik';
    },

    // Format file size
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// User Management Functions
const userManager = {
    // Save user status/location
    saveUserStatus(userId, status) {
        if (!global.db.users) global.db.users = {};
        if (!global.db.users[userId]) {
            global.db.users[userId] = {
                status: 'Belum diatur',
                autoReply: true,
                autoReaction: true,
                joinDate: Date.now(),
                messageCount: 0,
                commandCount: 0
            };
        }
        global.db.users[userId].status = status;
        global.db.users[userId].lastUpdated = Date.now();
        return true;
    },

    // Get user status
    getUserStatus(userId) {
        return global.db.users?.[userId]?.status || 'Belum diatur';
    },

    // Get user info
    getUserInfo(userId) {
        if (!global.db.users) global.db.users = {};
        if (!global.db.users[userId]) {
            global.db.users[userId] = {
                status: 'Belum diatur',
                autoReply: true,
                autoReaction: true,
                joinDate: Date.now(),
                messageCount: 0,
                commandCount: 0
            };
        }
        return global.db.users[userId];
    },

    // Increment user message count
    incrementMessageCount(userId) {
        const userInfo = this.getUserInfo(userId);
        userInfo.messageCount = (userInfo.messageCount || 0) + 1;
        
        // Update global stats
        if (!global.db.stats) global.db.stats = {};
        global.db.stats.totalMessages = (global.db.stats.totalMessages || 0) + 1;
    },

    // Increment user command count
    incrementCommandCount(userId) {
        const userInfo = this.getUserInfo(userId);
        userInfo.commandCount = (userInfo.commandCount || 0) + 1;
        
        // Update global stats
        if (!global.db.stats) global.db.stats = {};
        global.db.stats.totalCommands = (global.db.stats.totalCommands || 0) + 1;
    }
};

// Message Handling Functions
const messageHandler = {
    // Auto reply based on keywords
    getAutoReply(text, userId) {
        if (!global.autoReply.active) return null;
        
        const lowerText = text.toLowerCase().trim();
        
        for (const [keywords, response] of Object.entries(global.autoReply.responses)) {
            const keywordList = keywords.split('|');
            for (const keyword of keywordList) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    if (typeof response === 'function') {
                        return response(userId);
                    }
                    return response;
                }
            }
        }
        return null;
    },

    // Auto reaction based on keywords
    getAutoReaction(text) {
        if (!global.reactionSettings.active) return null;
        
        const lowerText = text.toLowerCase().trim();
        
        for (const [keywords, emoji] of Object.entries(global.reactionSettings.autoReactions)) {
            const keywordList = keywords.split('|');
            for (const keyword of keywordList) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    return emoji;
                }
            }
        }
        return null;
    },

    // Send reply message
    async replyMessage(sock, from, text, quotedMsg) {
        try {
            return await sock.sendMessage(from, { 
                text: text
            }, { 
                quoted: quotedMsg 
            });
        } catch (error) {
            console.error(chalk.red('❌ Reply message error:'), error);
            return null;
        }
    },

    // Extract message body
    getMessageBody(msg) {
        if (!msg.message) return '';
        
        const type = Object.keys(msg.message)[0];
        switch (type) {
            case 'conversation':
                return msg.message.conversation;
            case 'extendedTextMessage':
                return msg.message.extendedTextMessage.text;
            case 'imageMessage':
                return msg.message.imageMessage.caption || '';
            case 'videoMessage':
                return msg.message.videoMessage.caption || '';
            case 'documentMessage':
                return msg.message.documentMessage.caption || '';
            default:
                return '';
        }
    }
};

// System Functions
const system = {
    // Get bot statistics
    getBotStats() {
        if (!global.db.stats) return {};
        
        return {
            uptime: Date.now() - (global.db.stats.startTime || Date.now()),
            totalMessages: global.db.stats.totalMessages || 0,
            totalCommands: global.db.stats.totalCommands || 0,
            totalUsers: Object.keys(global.db.users || {}).length,
            totalGroups: Object.keys(global.db.groups || {}).length
        };
    },

    // Generate user report
    generateUserReport(userId) {
        const userInfo = userManager.getUserInfo(userId);
        const stats = this.getBotStats();
        
        return {
            userId: userId,
            status: userInfo.status,
            autoReply: userInfo.autoReply ? 'AKTIF ✅' : 'NONAKTIF ❌',
            autoReaction: userInfo.autoReaction ? 'AKTIF ✅' : 'NONAKTIF ❌',
            joinDate: new Date(userInfo.joinDate).toLocaleDateString('id-ID'),
            messageCount: userInfo.messageCount || 0,
            commandCount: userInfo.commandCount || 0,
            botUptime: utils.formatDuration(stats.uptime),
            totalUsers: stats.totalUsers,
            totalMessages: stats.totalMessages
        };
    }
};

module.exports = {
    ...utils,
    ...userManager,
    ...messageHandler,
    ...system
};
