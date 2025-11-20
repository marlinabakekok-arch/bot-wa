// File: plugins/owner/callbomb.js

const config = require('../../config');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

module.exports = {
    command: ['callbomb', 'callspam'],
    // [BARU] Menambahkan intent untuk parsing bahasa alami
    intent: ['call dia', 'telpon dia', 'call nomor'],
    tags: ['owner'],
    desc: 'Spam call target. Jika tidak diangkat sama sekali, kirim pesan kustom (Khusus Owner).',

    /**
     * Handler: Mem-parsing input (termasuk intent dan pesan kustom), lalu memicu execute.
     */
    handler: async (m, { sender, text }) => {
        if (!config.owner_number.includes(sender.split('@')[0])) {
            return m.reply("Perintah ini memerlukan hak akses penuh (Owner).");
        }

        // [UBAH] Logika parsing yang lebih cerdas untuk menangani pesan kustom
        const parts = text.split('|').map(part => part.trim());
        const commandPart = parts[0];
        const customMessage = parts[1] || 'Woi, di baca chat gw.'; // Pesan default

        const countMatch = commandPart.match(/(\d+)/);
        const count = countMatch ? parseInt(countMatch[0]) : 0;

        // [UBAH] Logika Cerdas untuk menentukan target
        let targetJid = null;
        if (m.quoted) {
            targetJid = m.quoted.sender; // Prioritas utama jika me-reply
        } else if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0]; // Jika ada mention
        } else {
            const numberMatch = commandPart.match(/(\d{10,})/); // Cari nomor panjang di teks
            if (numberMatch) {
                targetJid = numberMatch[0] + '@s.whatsapp.net';
            }
        }

        if (!targetJid || count <= 0) {
            return m.reply(
                `📞 *Format Perintah Salah!*\n\n` +
                `*Gunakan salah satu format di bawah:*\n\n` +
                `1️⃣ *Perintah Langsung:*\n` +
                `   \`${config.prefix}callbomb <nomor/@tag> <jumlah> | <pesan_jika_gagal>\`\n` +
                `   *Contoh:* \`${config.prefix}callbomb 628123 5 | Woi angkat telponnya\`\n\n` +
                `2️⃣ *Bahasa Alami (sambil reply/mention):*\n` +
                `   \`Call dia 5x | Pesan custom di sini\`\n` +
                `   *Contoh:* \`Telpon nomor ini 3x | Bales chat penting!\``
            );
        }

        try {
            targetJid = jidNormalizedUser(targetJid);
        } catch (error) {
            return m.reply(`Nomor/target tidak valid: ${targetJid}`);
        }

        m.reply(
            `💣 *Sesi Panggilan Dimulai...*\n\n` +
            `*🎯 Target:* @${targetJid.split('@')[0]}\n` +
            `*🔄 Jumlah:* ${count}x panggilan\n` +
            `*✉️ Pesan Gagal Angkat:* "${customMessage}"\n\n` +
            `Pesan hanya akan terkirim jika target tidak menjawab *sama sekali*.`
        , { mentions: [targetJid] });

        return { action: { name: 'execute_callbomb_v2', data: { targetJid, count, customMessage } } };
    },

    /**
     * Execute: Menjalankan logika panggilan dan mengirim pesan kustom berdasarkan kondisi.
     */
    execute: async (m, { sock, data }) => {
        const { targetJid, count, customMessage } = data;
        let wasAnswered = false; // [KUNCI] Flag untuk melacak apakah ada panggilan yang dijawab
        let answeredCount = 0, rejectedCount = 0, noAnswerCount = 0;

        for (let i = 1; i <= count; i++) {
            if (wasAnswered) continue; // Jika sudah pernah diangkat, hentikan panggilan berikutnya

            const callId = `call_${Date.now()}_${i}`;
            console.log(`[CALLBOMB] Panggilan ke-${i} ke ${targetJid}`);

            const callStatusPromise = new Promise((resolve) => {
                const timeout = setTimeout(() => resolve('no_answer'), 20000);
                const callUpdateHandler = (update) => {
                    const call = update.calls[0];
                    if (call.id === callId) {
                        if (call.status === 'offer') resolve('answered');
                        else if (call.status === 'reject') resolve('rejected');
                    }
                };
                sock.ev.on('call', callUpdateHandler);
                this.cleanup = () => {
                    clearTimeout(timeout);
                    sock.ev.removeListener('call', callUpdateHandler);
                };
            });

            try {
                await sock.sendMessage(targetJid, { call: { callId, from: sock.user.id, isVideo: false } });
                const result = await callStatusPromise;

                if (result === 'answered') {
                    wasAnswered = true; // [KUNCI] Set flag menjadi true
                    answeredCount++;
                    await sock.rejectCall(callId, targetJid);
                    await sock.sendMessage(m.chat, { text: `✅ Panggilan ke-${i}: Dijawab! Sesi dihentikan.` });
                } else if (result === 'rejected') {
                    rejectedCount++;
                    await sock.sendMessage(m.chat, { text: `❌ Panggilan ke-${i}: Ditolak oleh target.` });
                } else {
                    noAnswerCount++;
                    await sock.sendMessage(m.chat, { text: `📞 Panggilan ke-${i}: Tidak diangkat.` });
                }
            } catch (err) {
                console.error(`[CALLBOMB] Gagal pada panggilan ke-${i}:`, err);
                noAnswerCount++;
            } finally {
                if (this.cleanup) this.cleanup();
            }

            if (i < count && !wasAnswered) {
                await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
            }
        }

        // [UBAH] Kirim laporan akhir terlebih dahulu
        const finalReport = 
            `*📊 Laporan Sesi Panggilan Selesai 📊*\n\n` +
            `*🎯 Target:* @${targetJid.split('@')[0]}\n` +
            `*🔄 Panggilan Dicoba:* ${answeredCount + rejectedCount + noAnswerCount} / ${count}\n\n` +
            `*— HASIL —*\n` +
            `*📞 Dijawab:* ${answeredCount}x\n` +
            `*❌ Ditolak:* ${rejectedCount}x\n` +
            `*📩 Tidak Diangkat:* ${noAnswerCount}x`;
        await sock.sendMessage(m.chat, { text: finalReport }, { mentions: [targetJid] });

        // [KUNCI] Logika pengiriman pesan kustom
        if (!wasAnswered) {
            try {
                await sock.sendMessage(targetJid, { text: customMessage });
                await sock.sendMessage(m.chat, { text: `✅ Karena tidak ada panggilan yang dijawab, pesan kustom berhasil dikirim ke target.` });
            } catch (error) {
                console.error(`[CALLBOMB] Gagal mengirim pesan kustom ke ${targetJid}:`, error);
                await sock.sendMessage(m.chat, { text: `❌ Gagal mengirim pesan kustom ke target.` });
            }
        }
    }
};