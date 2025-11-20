// File: plugins/tools/otpservices.js
const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['otpservices', 'daftarlayanan'],
    intent: ['layanan otp', 'list layanan otp', 'daftar otp'],
    tags: ['tools', 'otp'],
    desc: 'Menampilkan daftar layanan yang tersedia di RumahOTP.',
    handler: async (m) => {
        if (!config.rumahOtpApiKey || config.rumahOtpApiKey.includes('YOUR_API_KEY')) {
            return m.reply("❌ API Key RumahOTP belum dikonfigurasi oleh Owner.");
        }
        m.reply("🔍 Mengambil daftar layanan dari RumahOTP...");
        return { action: { name: 'execute_get_otp_services', data: {} } };
    },
    execute: async (m, { sock }) => {
        try {
            const { data: response } = await axios.get('https://www.rumahotp.com/api/v2/services', {
                headers: { 'x-apikey': config.rumahOtpApiKey, 'Accept': 'application/json' }
            });
            if (!response.success) throw new Error("Gagal mengambil data layanan.");

            const rows = response.data.map(service => ({
                title: service.service_name,
                description: `Kode: ${service.service_code}`,
                id: `${config.prefix}otpcountries ${service.service_code}`,
                header: { type: "image", image: { url: service.service_img } }
            }));

            const paramsJson = JSON.stringify({
                title: '📱 Pilih Layanan OTP',
                sections: [{ title: 'Layanan Tersedia', rows: rows }]
            });
            const nativeFlowButton = [{
                buttonText: { displayText: '📜 Buka Daftar Layanan' },
                type: 4, nativeFlowInfo: { name: 'single_select', paramsJson }
            }];
            
            await sock.sendMessage(m.key.remoteJid, {
                text: `Berikut daftar layanan yang tersedia. Pilih salah satu untuk melihat negara yang didukung.`,
                footer: 'Ditenagai oleh RumahOTP',
                buttons: nativeFlowButton, headerType: 1
            }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal mengambil daftar layanan: ${error.message}` }, { quoted: m });
        }
    }
};