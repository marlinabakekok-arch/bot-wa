// File: plugins/tools/otpoperators.js
const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['otpoperators'],
    tags: ['otp_internal'],
    desc: 'Menampilkan operator dan opsi pembelian.',
    handler: async (m, { text }) => {
        const parts = text.split('|').map(p => p.trim());
        const [serviceId, countryId, providerId, countryName] = parts;
        if (!serviceId || !countryId || !providerId || !countryName) return;
        m.reply(`📡 Mencari operator di *${countryName}*...`);
        return { action: { name: 'execute_get_otp_operators_v2', data: { serviceId, countryId, providerId, countryName } } };
    },
    execute: async (m, { sock, data }) => {
        const { serviceId, countryId, providerId, countryName } = data;
        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v2/operators?country=${countryName}&provider_id=${providerId}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.status) throw new Error("API tidak mengembalikan data operator.");
            
            const rows = response.data.map(op => ({
                title: `Beli Nomor (Operator: ${op.name})`,
                description: `Klik untuk memesan nomor OTP.`,
                id: `${config.prefix}orderotp ${serviceId}|${countryId}|${providerId}|${op.id}`,
                header: { type: "image", image: { url: op.image } }
            }));

            const paramsJson = JSON.stringify({
                title: '🛒 Pilih Operator',
                sections: [{ title: `Operator di ${countryName}`, rows: rows }]
            });
            const nativeFlowButton = [{
                buttonText: { displayText: '📜 Buka Opsi Pembelian' },
                type: 4, nativeFlowInfo: { name: 'single_select', paramsJson }
            }];

            await sock.sendMessage(m.key.remoteJid, {
                text: `Pilih operator untuk membeli nomor.`,
                footer: 'Ditenagai oleh RumahOTP',
                buttons: nativeFlowButton, headerType: 1
            }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal mengambil daftar operator: ${error.message}` }, { quoted: m });
        }
    }
};