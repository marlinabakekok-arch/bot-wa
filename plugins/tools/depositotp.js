// File: plugins/tools/deposit.js
const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['deposit', 'topup'],
    intent: ['deposit qris', 'mau topup'],
    tags: ['tools', 'otp'],
    desc: 'Membuat invoice deposit QRIS.',
    handler: async (m, { args }) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1000) {
            return m.reply(`💰 Masukkan jumlah deposit (minimal 1000).\n*Contoh:* ${config.prefix}deposit 10000`);
        }
        m.reply(`⏳ Membuat invoice QRIS untuk Rp${amount.toLocaleString('id-ID')}...`);
        return { action: { name: 'execute_create_deposit', data: { amount, method: 'qris' } } };
    },
    execute: async (m, { sock, data }) => {
        const { amount, method } = data;
        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v2/deposit/create?amount=${amount}&payment_id=${method}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.success) throw new Error(response.message || "Gagal membuat invoice.");
            
            const deposit = response.data;
            const depositId = deposit.id;

            let caption = `*✅ Invoice Deposit Dibuat!*\n\n` +
                          `*ID Deposit:* \`${depositId}\`\n` +
                          `*Total Bayar:* *Rp${deposit.total.toLocaleString('id-ID')}*\n` +
                          `*Status:* ${deposit.status}\n` +
                          `*Kedaluwarsa:* ${deposit.expired_at}`;

            const rows = [
                { title: '🔄 Cek Status Pembayaran', id: `${config.prefix}cekdeposit ${depositId}` },
                { title: '❌ Batalkan Deposit', id: `${config.prefix}canceldeposit ${depositId}` }
            ];
            const paramsJson = JSON.stringify({
                title: 'Kelola Deposit Anda',
                sections: [{ title: `ID: ${depositId}`, rows }]
            });
            const nativeFlowButton = [{
                buttonText: { displayText: '⚙️ Opsi Deposit' },
                type: 4, nativeFlowInfo: { name: 'single_select', paramsJson }
            }];

            await sock.sendMessage(m.key.remoteJid, {
                image: { url: deposit.qr_image },
                caption: caption,
                footer: 'Ditenagai oleh RumahOTP',
                buttons: nativeFlowButton
            }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal membuat deposit: ${error.message}` }, { quoted: m });
        }
    }
};