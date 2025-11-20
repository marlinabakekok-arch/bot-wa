// File: plugins/group/autopurge.js

const fs = require('fs');
const path = require('path');
const config = require('../../config');

const settingsPath = path.resolve('./database/group_settings.json');
const activityPath = path.resolve('./database/user_activity.json');

// Helper untuk membaca & menulis database
const readDb = (p) => {
    if (!fs.existsSync(p)) fs.writeFileSync(p, '{}');
    return JSON.parse(fs.readFileSync(p));
};
const writeDb = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

module.exports = {
    /**
     * Perintah untuk Admin mengkonfigurasi Auto-Purger
     */
    command: ['autopurge', 'autokickinactive'],
    intent: ['auto kick', 'auto tendang', 'auto dor'],
    tags: ['group', 'admin'],
    desc: 'Kick otomatis anggota yang tidak aktif selama X hari (Khusus Admin).',

    handler: async (m, { args, sock }) => {
        if (!m.isGroup) return m.reply("Fitur ini hanya untuk digunakan di dalam grup.");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const adminJids = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        
        if (!adminJids.includes(m.sender)) {
            return m.reply("Perintah ini hanya bisa diakses oleh Admin Grup.");
        }

        const option = args[0]?.toLowerCase();
        const days = parseInt(args[1]);
        const settings = readDb(settingsPath);
        if (!settings[m.chat]) settings[m.chat] = {};

        if (option === 'on' || option === 'aktif') {
            if (isNaN(days) || days < 7) {
                return m.reply("❌ Jumlah hari tidak valid. Minimum adalah 7 hari.");
            }
            settings[m.chat].autopurge = { enabled: true, days: days };
            writeDb(settingsPath, settings);
            m.reply(`✅ *Auto-Purger Diaktifkan!*\nBot akan meng-kick anggota yang tidak aktif selama *${days} hari*.\nPembersihan dilakukan setiap hari jam 3 pagi.`);
        } else if (option === 'off' || option === 'mati') {
            settings[m.chat].autopurge = { enabled: false, days: 0 };
            writeDb(settingsPath, settings);
            m.reply("❌ *Auto-Purger berhasil dinonaktifkan.*");
        } else {
            const status = settings[m.chat].autopurge?.enabled ? `Aktif (${settings[m.chat].autopurge.days} hari)` : 'Tidak Aktif';
            m.reply(
                `*Pengaturan Auto-Purger*\n\n` +
                `*Gunakan:*\n${config.prefix}autopurge <on/off> <jumlah_hari>\n\n` +
                `*Contoh:*\n${config.prefix}autopurge on 30\n\n` +
                `*Status saat ini:* ${status}`
            );
        }
    },

    /**
     * Listener untuk mencatat aktivitas. Dijalankan pada setiap pesan.
     */
    onMessageActivityTracker: (m) => {
        if (!m.isGroup || m.isBot) return;

        const settings = readDb(settingsPath);
        // Jika fitur tidak aktif di grup ini, hentikan proses.
        if (!settings[m.chat]?.autopurge?.enabled) return;

        const activity = readDb(activityPath);
        if (!activity[m.chat]) {
            activity[m.chat] = {};
        }
        
        // Catat timestamp pesan terakhir dari user di grup ini
        activity[m.chat][m.sender] = Date.now();
        writeDb(activityPath, activity);
    }
};