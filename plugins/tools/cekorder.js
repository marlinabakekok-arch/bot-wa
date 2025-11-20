// File: plugins/tools/cekorder.js

const axios = require('axios');
const config = require('../../config');
const moment = require('moment-timezone');

module.exports = {
    command: ['cekorder', 'statusorder'],
    // [BARU] Menambahkan intent untuk penggunaan manual
    intent: ['cek pesanan', 'cek order', 'status pesanan'],
    tags: ['tools', 'otp'],
    desc: 'Mengecek status pesanan OTP berdasarkan ID.',

    handler: async (m, { args, text }) => {
        // [BARU] Logika cerdas untuk mendapatkan Order ID
        // Jika dipicu dari tombol, args[0] akan berisi ID.
        // Jika dipicu manual (e.g., "!cekorder RO123"), args[0] juga berisi ID.
        // Jika dipicu intent (e.g., "cek pesanan RO123"), kita cari dari 'text'.
        let orderId = args[0];
        if (!orderId) {
            const match = text.match(/RO\d+/i); // Cari format ID 'RO' diikuti angka
            if (match) {
                orderId = match[0];
            }
        }

        if (!orderId) {
            return m.reply(
                `📝 Masukkan ID Pesanan yang ingin Anda cek.\n\n` +
                `*Contoh Penggunaan:*\n` +
                `${config.prefix}cekorder RO12345678`
            );
        }

        m.reply(`🔍 Mengecek status untuk pesanan *${orderId}*...`);
        return { action: { name: 'execute_check_order_status', data: { orderId } } };
    },

    execute: async (m, { sock, data }) => {
        const { orderId } = data;
        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v1/orders/get_status?order_id=${orderId}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.success) throw new Error(response.message || "Gagal cek status. Pastikan ID Pesanan benar.");

            const order = response.data;
            moment.locale('id');
            const expiresAt = moment(order.expires_at).tz('Asia/Jakarta').format('HH:mm:ss');

            const resultText = `*ℹ️ — STATUS PESANAN — ℹ️*\n\n` +
                             `*ID Pesanan:* \`${order.order_id}\`\n` +
                             `*Status:* *${order.status.toUpperCase()}*\n` +
                             `*Nomor:* ||${order.phone_number}||\n` +
                             `*Layanan:* ${order.service}\n` +
                             `*Kedaluwarsa:* ${expiresAt}\n\n` +
                             `*✉️ KODE OTP:* \`${order.otp_code}\``;

            await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m });

        } catch (error) {
            console.error("[CEKORDER] Gagal:", error);
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal mengecek status pesanan: ${error.message}` }, { quoted: m });
        }
    }
};