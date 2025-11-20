// File: lib/pluginManager.js (Versi Final dengan Pengecualian Grup)
// File: lib/pluginManager.js (Versi Final Definitif dengan Jembatan yang Diperbaiki)

const fs = require('fs');
const path = require('path');
const { GEMINI_TEXT } = require('./gemini');
const { isOwner } = require('./users');
const config = require('../config');
const autopurge = require('./plugins/group/autopurge');
const chalk = require('chalk');

let plugins = [];
let autopurgePlugin = null;

const PluginManager = {
    getPlugins: () => {
        return plugins;
    },
    loadPlugins: async (dir = "./plugins") => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                await PluginManager.loadPlugins(filePath);
            } else if (file.endsWith(".js")) {
                try {
                    delete require.cache[require.resolve(path.resolve(filePath))];
                    plugins.push(require(path.resolve(filePath)));
                } catch (e) {
                    console.error(`Gagal memuat plugin: ${filePath}`, e);
                }
            }
        }
    },
    
    autopurgePlugin = plugins.find(p => p.command && p.command.includes('autopurge'));
        if (autopurgePlugin) {
            console.log(chalk.yellowBright('[PluginManager] Fitur spesial "AutoPurge" berhasil ditemukan dan siap digunakan.'));
        }
    },
 
    processPlugin: async (content, sock, sender, remoteJid, message, messageType, pushName, isQuoted, destination) => {
        if (!content && messageType !== 'imageMessage') return;

        const lowerCaseMessage = content ? content.toLowerCase() : "";
        const prefix = Array.isArray(config.prefix) ? config.prefix.find(p => lowerCaseMessage.startsWith(p)) : (lowerCaseMessage.startsWith(config.prefix) ? config.prefix : null);
        const cmd = prefix ? lowerCaseMessage.split(' ')[0].slice(prefix.length) : "";
        const text = content.substring(cmd.length + (prefix ? prefix.length : 0) + 1);

        const m = {
            ...message,
            sender,
            content,
            isGroup: remoteJid.endsWith('@g.us'),
            reply: (text) => sock.sendMessage(remoteJid, { text }, { quoted: message })
        };
        let executed = false;
        
        if (autopurgePlugin && autopurgePlugin.onMessageActivityTracker) {
            autopurgePlugin.onMessageActivityTracker(m);
        }
        // Loop untuk mencari plugin yang cocok
        for (const plugin of plugins) {
            const isCommandMatch = cmd && plugin.command && plugin.command.includes(cmd);
            const isIntentMatch = !cmd && plugin.intent && plugin.intent.some(intent => lowerCaseMessage.includes(intent));

            if (isCommandMatch || isIntentMatch) {
                try {
                    if (isCommandMatch) console.log(chalk.greenBright(`[Command Executed] Menjalankan ".${cmd}"...`));
                    if (isIntentMatch) console.log(chalk.blueBright(`[Intent Executed] Intent cocok untuk: "${plugin.intent.find(i => lowerCaseMessage.includes(i))}"`));
                    
                    // 1. Jalankan handler
                    const result = await plugin.handler(m, { sock, content, sender, lowerCaseMessage, cmd, text, isOwner });

                    // [FIX UTAMA] 2. PERIKSA HASIL DARI HANDLER
                    // Jika handler mengembalikan 'action' dan plugin memiliki 'execute', jalankan.
                    if (result && result.action && plugin.execute) {
                        console.log(chalk.magentaBright(`[Action Detected] Menjalankan 'execute' untuk: ${result.action.name}`));
                        // Jalankan di latar belakang agar tidak memblokir
                        plugin.execute(m, { sock, action: result.action });
                    }
                    // Jika tidak ada action, tugas selesai (misalnya, balasan cepat).

                } catch (e) {
                    console.error(`Error di plugin handler:`, e);
                    m.reply("Terjadi kesalahan saat menjalankan fitur.");
                }
                executed = true;
                break; // Hentikan setelah plugin pertama cocok
            }
        }

        if (!executed) {
            let shouldTriggerAi = false;
            
            // [INI KUNCINYA] Baca file database SETIAP KALI ada pesan yang akan diproses AI.
            // Ini memastikan kita selalu mendapatkan data yang paling segar.
            const dbPath = path.resolve('./database/dbAi.json');
            let db = {};
            try {
                if (fs.existsSync(dbPath)) {
                    const fileContent = fs.readFileSync(dbPath, 'utf-8');
                    if (fileContent) {
                        db = JSON.parse(fileContent);
                    }
                }
            } catch (e) {
                console.error(chalk.redBright('[DB Read Error] Gagal membaca users.json di pluginManager!'), e);
            }

            // ATURAN 1: Jika ini BUKAN grup (chat pribadi), AI selalu aktif.
            if (!m.isGroup) {
                shouldTriggerAi = true;
            } 
            // ATURAN 2: Jika INI grup, cek database yang baru saja kita baca.
            else {
                const isGroupAiActive = db.group && db.group[remoteJid] && db.group[remoteJid].autoAi === true;
                if (isGroupAiActive) {
                    shouldTriggerAi = true;
                }
            }

            // Logika logging yang lebih baik untuk debugging
            if (m.isGroup) {
                const status = shouldTriggerAi ? chalk.greenBright('TERDAFTAR') : chalk.redBright('TIDAK terdaftar');
                console.log(`[AI Trigger] Grup "${remoteJid}" ${status}. AI akan ${shouldTriggerAi ? 'diaktifkan' : 'tetap diam'}.`);
            }

            if (shouldTriggerAi) {
                console.log(chalk.cyan(`[AI Fallback] Menjalankan Gemini untuk: ${sender}`));
                try {
                    await sock.sendPresenceUpdate('composing', remoteJid);
                    const aiResponse = await GEMINI_TEXT(sender, content, m.isGroup, remoteJid, null);
                    await sock.sendMessage(remoteJid, { text: aiResponse }, { quoted: message });
                } catch (e) {
                    console.error("[AI Fallback Error]", e);
                }
            }
        }
    }
};

module.exports = PluginManager;