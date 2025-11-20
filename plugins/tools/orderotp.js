// File: plugins/tools/orderotp.js
const axios = require('axios');
const config = require('../../config');
const trxManager = require('../../lib/transactionManager');

module.exports = {
    command: ['orderotp'],
    tags: ['otp_internal'],
    desc: 'Memesan nomor OTP dan mencatatnya ke database.',
    handler: async (m, { text }) => {
        const parts = text.split('|').map(p => p.trim());
        const [serviceId, numberId, providerId, operatorId] = parts;
        if (!serviceId || !numberId || !providerId || !operatorId) return;

        m.reply(`⏳ Memproses pesanan Anda dan mencatat transaksi...`);
        const orderData = { serviceId, numberId, providerId, operatorId };
        
        const transaction = trxManager.add(m.sender, 'processing', orderData);
        return { action: { name: 'execute_order_otp_v2', data: { transaction } } };
    },
    execute: async (m, { sock, data }) => {
        const { transaction } = data;
        const { orderData } = transaction;

        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v2/orders?number_id=${orderData.numberId}&provider_id=${orderData.providerId}&operator_id=${orderData.operatorId}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });

            if (!response.success) {
                if (response.message && response.message.toLowerCase().includes('saldo tidak cukup')) {
                    trxManager.update(transaction.transactionId, { status: 'pending_payment' });
                    await sock.sendMessage(m.key.remoteJid, { text: `⚠️ *Saldo Tidak Cukup!*\n\nBot akan membuatkan invoice deposit. Setelah pembayaran berhasil, pesanan akan dilanjutkan otomatis.` }, { quoted: m });
                    
                    const depositPlugin = require('./deposit.js');
                    await depositPlugin.execute(m, { sock, data: { amount: 5000, method: 'qris' } });
                    return;
                }
                throw new Error(response.message || "API mengembalikan error.");
            }

            const order = response.data;
            trxManager.update(transaction.transactionId, { status: 'waiting_otp', orderId: order.order_id });

            let resultText = `*✅ Pesanan Berhasil Dibuat!*\n\n` +
                             `*ID Transaksi:* \`${transaction.transactionId}\`\n` +
                             `*ID Pesanan:* \`${order.order_id}\`\n` +
                             `*Nomor HP:* ||${order.phone_number}||\n` +
                             `*Layanan:* ${order.service}\n` +
                             `*Harga:* ${order.price_formated}\n` +
                             `*Kedaluwarsa:* ${order.expires_in_minute} menit`;

            const rows = [
                { title: '🔄 Cek Status / Kode OTP', id: `${config.prefix}cekorder ${order.order_id}` },
                { title: '❌ Batalkan Pesanan', id: `${config.prefix}setorder ${order.order_id} cancel` },
                { title: '🔁 Kirim Ulang Kode', id: `${config.prefix}setorder ${order.order_id} resend` }
            ];
            const paramsJson = JSON.stringify({
                title: 'Kelola Pesanan Anda',
                sections: [{ title: `ID: ${order.order_id}`, rows }]
            });
            const nativeFlowButton = [{
                buttonText: { displayText: '⚙️ Opsi Pesanan' },
                type: 4, nativeFlowInfo: { name: 'single_select', paramsJson }
            }];

            await sock.sendMessage(m.key.remoteJid, {
                text: resultText,
                footer: 'Ditenagai oleh RumahOTP',
                buttons: nativeFlowButton
            }, { quoted: m });
        } catch (error) {
            trxManager.update(transaction.transactionId, { status: 'failed' });
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal memesan nomor: ${error.message}` }, { quoted: m });
        }
    }
};