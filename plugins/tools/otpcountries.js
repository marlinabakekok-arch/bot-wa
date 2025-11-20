// File: plugins/tools/otpcountries.js
const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['otpcountries'],
    tags: ['otp_internal'],
    desc: 'Menampilkan negara untuk layanan OTP.',
    handler: async (m, { args }) => {
        const serviceId = args[0];
        if (!serviceId) return;
        m.reply(`🔍 Mencari negara untuk layanan ID: ${serviceId}...`);
        return { action: { name: 'execute_get_otp_countries', data: { serviceId } } };
    },
    execute: async (m, { sock, data }) => {
        const { serviceId } = data;
        try {
            const { data: response } = await axios.get(`https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`, {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.success || response.data.length === 0) {
                return sock.sendMessage(m.key.remoteJid, { text: "Maaf, tidak ada negara tersedia untuk layanan ini." }, { quoted: m });
            }

            const rows = response.data.map(country => ({
                title: `${country.name} (${country.prefix})`,
                description: `Harga: ${country.pricelist[0].price_format} | Stok: ${country.stock_total}`,
                id: `${config.prefix}otpoperators ${serviceId}|${country.number_id}|${country.pricelist[0].provider_id}|${country.name}`,
                header: { type: "image", image: { url: country.img } }
            }));

            const paramsJson = JSON.stringify({
                title: '🌍 Pilih Negara',
                sections: [{ title: `Negara Tersedia (Layanan ID: ${serviceId})`, rows: rows }]
            });
            const nativeFlowButton = [{
                buttonText: { displayText: '📜 Buka Daftar Negara' },
                type: 4, nativeFlowInfo: { name: 'single_select', paramsJson }
            }];

            await sock.sendMessage(m.key.remoteJid, {
                text: `Berikut daftar negara yang tersedia. Pilih salah satu untuk melihat operator.`,
                footer: 'Ditenagai oleh RumahOTP',
                buttons: nativeFlowButton, headerType: 1
            }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal mengambil daftar negara: ${error.message}` }, { quoted: m });
        }
    }
};