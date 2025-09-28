const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.json');
        this.backupPath = path.join(__dirname, 'backup_database.json');
        this.initialize();
    }

    initialize() {
        try {
            if (!fs.existsSync(this.dbPath)) {
                const defaultData = {
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
                        startTime: Date.now()
                    }
                };
                fs.writeFileSync(this.dbPath, JSON.stringify(defaultData, null, 2));
                console.log(chalk.green('✅ Database initialized successfully!'));
            }
        } catch (error) {
            console.error(chalk.red('❌ Database initialization error:'), error);
        }
    }

    async read() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.dbPath, 'utf8', (err, data) => {
                if (err) {
                    console.error(chalk.red('❌ Database read error:'), err);
                    // Try to restore from backup
                    this.restoreBackup().then(resolve).catch(reject);
                    return;
                }
                
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (parseError) {
                    console.error(chalk.red('❌ Database parse error:'), parseError);
                    this.restoreBackup().then(resolve).catch(reject);
                }
            });
        });
    }

    async write(data) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create backup first
                await this.createBackup();
                
                fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error(chalk.red('❌ Database write error:'), err);
                        reject(err);
                        return;
                    }
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async createBackup() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = await this.read();
                fs.writeFileSync(this.backupPath, JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error(chalk.yellow('⚠️ Backup creation failed:'), error);
        }
    }

    async restoreBackup() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.backupPath)) {
                fs.readFile(this.backupPath, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        console.log(chalk.yellow('🔄 Restoring from backup...'));
                        resolve(parsed);
                    } catch (parseError) {
                        reject(parseError);
                    }
                });
            } else {
                // Return empty data if no backup
                resolve({ users: {}, groups: {}, settings: {}, stats: {} });
            }
        });
    }

    // Utility method to get database stats
    async getStats() {
        const data = await this.read();
        return {
            totalUsers: Object.keys(data.users || {}).length,
            totalGroups: Object.keys(data.groups || {}).length,
            totalMessages: data.stats?.totalMessages || 0,
            totalCommands: data.stats?.totalCommands || 0,
            uptime: data.stats?.startTime ? Date.now() - data.stats.startTime : 0
        };
    }
}

module.exports = Database;
