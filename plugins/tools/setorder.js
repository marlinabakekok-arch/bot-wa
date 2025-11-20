// File: plugins/tools/setorder.js

const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['setorder', 'aturorder'],
    // [BARU] Menambahkan intent, contoh: "batalkan pesanan RO123"
    intent: ['batalkan pesanan', 'kirim ulang otp', 'resend otp'],
    tags: ['tools', 'otp'],
    desc: 'Mengatur status pesanan (cancel, done, resend).',

    handler: async (m, { args, text }) => {
        // [BARU] Logika cerdas untuk mendapatkan ID dan Status
        let orderId = args[0];
        let status = args[1];

        // Jika dipicu oleh intent, coba ekstrak ID dan status dari teks
        if (!orderId || !status) {
            const matchId = text.match(/RO\d+/i);
            if (matchId) {
                orderId = matchId[0];
            }
            
            if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('batal')) {
                status = 'cancel';
            } else if (text.toLowerCase().includes('resend') || text.toLowerCase().includes('kirim ulang')) {
                status = 'resend';
            }
        }

        const validStatus = ['cancel', 'done', 'resend'];
        if (!orderId || !status || !validStatus.includes(status)) {
            return m.reply(
                `⚙️ Perintah untuk mengatur status pesanan.\n\n` +
                `*Penggunaan:*\n${config.prefix}setorder <OrderID> <status>\n\n` +
                `*Status yang tersedia:* cancel, done, resend\n` +
                `*Contoh:* ${config.prefix}setorder RO12345 cancel`
            );
        }

        m.reply(`⚙️ Mengatur status pesanan *${orderId}* menjadi *${status.toUpperCase()}*...`);
        return { action: { name: 'execute_set_order_status', data: { orderId, status } } };
    },

    execute: async (m, { sock, data }) => {
        const { orderId, status } = data;
        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v1/orders/set_status?order_id=${orderId}&status=${status}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.success) throw new Error(response.message || "Gagal mengatur status.");

            await sock.sendMessage(m.key.remoteJid, { 
                text: `✅ Status pesanan *${orderId}* berhasil diubah menjadi *${response.data.status.toUpperCase()}*.` 
            }, { quoted: m });

        } catch (error) {
            console.error("[SETORDER] Gagal:", error);
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal mengatur status pesanan: ${error.message}` }, { quoted: m });
        }
    }
};