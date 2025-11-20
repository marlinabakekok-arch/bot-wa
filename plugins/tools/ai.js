// File: plugins/tools/ai.js (Versi Final Definitif & Fleksibel)

const fs = require('fs');
const path = require('path');

module.exports = {
    // Definisikan kedua jenis pemicu
    command: ['autoai'],
    intent: ['nyalakan ai', 'aktifkan ai', 'hidupkan ai', 'nyalakan api', 'matikan ai', 'nonaktifkan ai', 'status ai', 'cek ai'], 

    tags: ['tools', 'group'],
    desc: 'Mengaktifkan atau menonaktifkan Auto AI di grup.',

    admin: true,
    group: true,

    handler: async (m, { sock, content, sender, lowerCaseMessage, cmd, text }) => {
        const dbPath = path.resolve('./database/dbAi.json');
        try {
            let db = {};
            if (fs.existsSync(dbPath)) {
                const fileContent = fs.readFileSync(dbPath, 'utf-8');
                if (fileContent) db = JSON.parse(fileContent);
            }

            const groupId = m.key.remoteJid;
            if (!db.group) db.group = {};
            if (!db.group[groupId]) db.group[groupId] = {};
            const groupState = db.group[groupId];
            
            let replyText = "";
            let actionTaken = false;

            const turnOnIntents = ['nyalakan ai', 'aktifkan ai', 'hidupkan ai', 'nyalakan api'];
            const turnOffIntents = ['matikan ai', 'nonaktifkan ai'];

            // Logika untuk perintah .autoai on/off
            if (cmd === 'autoai') {
                const subCommand = text.trim().toLowerCase();
                if (subCommand === 'on') {
                    if (groupState.autoAi) return m.reply("❗ Grup ini sudah terdaftar.");
                    groupState.autoAi = true;
                    replyText = "✅ Berhasil! Grup ini telah didaftarkan untuk Auto AI.";
                    actionTaken = true;
                } else if (subCommand === 'off') {
                    if (!groupState.autoAi) return m.reply("❗ Grup ini memang tidak terdaftar.");
                    delete groupState.autoAi; 
                    replyText = "❌ Berhasil! Pendaftaran Auto AI untuk grup ini telah dihapus.";
                    actionTaken = true;
                }
            } 
            // Logika untuk bahasa natural
            else if (turnOnIntents.some(intent => lowerCaseMessage.includes(intent))) {
                if (groupState.autoAi) return m.reply("❗ Auto AI memang sudah aktif di grup ini.");
                groupState.autoAi = true;
                replyText = "✅ Berhasil! Auto AI telah diaktifkan untuk grup ini.";
                actionTaken = true;
            } else if (turnOffIntents.some(intent => lowerCaseMessage.includes(intent))) {
                if (!groupState.autoAi) return m.reply("❗ Auto AI memang sudah nonaktif di grup ini.");
                delete groupState.autoAi; 
                replyText = "❌ Berhasil! Auto AI telah dinonaktifkan untuk grup ini.";
                actionTaken = true;
            }

            // Jika tidak ada aksi, tampilkan status
            if (!actionTaken) {
                const status = groupState.autoAi ? '🟢 Terdaftar (Aktif)' : '🔴 Tidak Terdaftar (Nonaktif)';
                return m.reply(`*Status Auto AI di Grup Ini: ${status}*\n\nGunakan:\n- *.autoai on/off*\n- "nyalakan ai" / "matikan ai"`);
            }

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            await m.reply(replyText);

        } catch (e) {
            console.error("[AI Plugin Error]", e);
            await m.reply("Terjadi kesalahan saat mengakses atau menyimpan data.");
        }
    }
}