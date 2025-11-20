// File: lib/scheduler.js

const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

const settingsPath = path.resolve('./database/group_settings.json');
const activityPath = path.resolve('./database/user_activity.json');

// Helper
const readDb = (p) => {
    if (!fs.existsSync(p)) fs.writeFileSync(p, '{}');
    return JSON.parse(fs.readFileSync(p));
};

/**
 * Memulai job harian untuk membersihkan anggota yang tidak aktif.
 * @param {import('@whiskeysockets/baileys').WASocket} sock Koneksi socket Baileys
 */
function startAutoPurger(sock) {
    // Jalankan setiap hari jam 3 pagi ('0 3 * * *')
    schedule.scheduleJob('0 3 * * *', async () => {
        console.log('[AutoPurger] Memulai pengecekan harian untuk anggota tidak aktif...');
        const settings = readDb(settingsPath);
        const activity = readDb(activityPath);

        for (const groupId in settings) {
            const groupSetting = settings[groupId];
            if (groupSetting.autopurge?.enabled) {
                const daysThreshold = groupSetting.autopurge.days;
                const msThreshold = daysThreshold * 24 * 60 * 60 * 1000;
                
                try {
                    const metadata = await sock.groupMetadata(groupId);
                    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
                    const members = metadata.participants.filter(p => !p.admin);
                    
                    console.log(`[AutoPurger] Memeriksa grup: ${metadata.subject} (${members.length} anggota)`);

                    for (const member of members) {
                        const lastActivity = activity[groupId]?.[member.id] || 0; // 0 jika belum pernah chat
                        const inactivityDuration = Date.now() - lastActivity;

                        if (inactivityDuration > msThreshold) {
                            console.log(`[AutoPurger] Meng-kick ${member.id} dari ${metadata.subject} karena tidak aktif selama ${daysThreshold} hari.`);
                            await sock.groupParticipantsUpdate(groupId, [member.id], 'remove');
                            // Opsional: kirim notifikasi ke grup
                            // await sock.sendMessage(groupId, { text: `Anggota @${member.id.split('@')[0]} telah dihapus karena tidak aktif.` }, { mentions: [member.id] });
                            await new Promise(r => setTimeout(r, 2000)); // Delay antar kick
                        }
                    }
                } catch (error) {
                    console.error(`[AutoPurger] Gagal memproses grup ${groupId}:`, error);
                }
            }
        }
        console.log('[AutoPurger] Pengecekan harian selesai.');
    });
    console.log('[Scheduler] Auto-Purger job berhasil dijadwalkan untuk berjalan setiap jam 3 pagi.');
}

module.exports = { startAutoPurger };