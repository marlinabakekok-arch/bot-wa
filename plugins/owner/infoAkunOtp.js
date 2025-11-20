// File: plugins/owner/cekotp.js

const axios = require('axios');
const config = require('../../config');

module.exports = {
    command: ['cekotp', 'ceksaldo', 'rumahotp'],
    // [REVISI] Menambahkan intent agar lebih natural
    intent: ['cek saldo otp', 'saldo rumahotp', 'info akun otp'],
    tags: ['owner'],
    desc: 'Menampilkan informasi saldo dan profil dari RumahOTP (Khusus Owner).',

    /**
     * Handler: Hanya memvalidasi owner dan memicu 'execute'.
     */
    handler: async (m, { sender }) => {
        if (!config.owner_number.includes(sender.split('@')[0])) {
            // Untuk intent, kita tidak membalas apa-apa agar bisa fallback ke AI jika bukan owner
            // Namun, karena ini fitur khusus owner, lebih baik tetap memberi feedback.
            return m.reply("Perintah ini hanya dapat diakses oleh Owner.");
        }

        if (!config.rumahOtpApiKey || config.rumahOtpApiKey === 'YOUR_API_KEY_HERE') {
            return m.reply("❌ *Konfigurasi Error!*\nAPI Key untuk RumahOTP belum diatur di file `config.js`.");
        }

        m.reply("🔍 Mengambil data dari API RumahOTP, mohon tunggu sebentar...");
        
        return { action: { name: 'execute_check_rumahotp_balance', data: {} } };
    },

    /**
     * Execute: Melakukan panggilan API yang sebenarnya.
     */
    execute: async (m, { sock, data }) => {
        try {
            const response = await axios.get('https://www.rumahotp.com/api/v1/user/balance', {
                headers: {
                    'x-apikey': config.rumahOtpApiKey,
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                const userData = response.data.data;

                const resultText = 
`*📊 — INFO SALDO & PROFIL RUMAHOTP — 📊*

*👤 Akun:* ${userData.first_name} ${userData.last_name} (\`${userData.username}\`)
*📧 Email:* ${userData.email}
-----------------------------------
*💰 Saldo Saat Ini:*
  - *Nominal:* \`${userData.balance}\`
  - *Terformat:* *${userData.formated}*
-----------------------------------
*🔑 Kunci API:* ||${userData.apikey}||
*📱 Kontak Terhubung:*
  - *WhatsApp:* ${userData.whatsapp || 'Tidak ada'}
  - *Telegram:* ${userData.telegram || 'Tidak ada'}`;

                await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m });
                console.log(`[RUMAHOTP] Berhasil mengambil saldo untuk ${userData.username}`);

            } else {
                throw new Error(response.data.message || 'Respons API tidak valid.');
            }

        } catch (error) {
            console.error("🚫 Gagal mengambil data dari RumahOTP:", error.response ? error.response.data : error.message);
            
            let errorMessage = "Terjadi kesalahan saat menghubungi API RumahOTP.";
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = `*Gagal Mengambil Data:*\n${error.response.data.message}`;
            }

            await sock.sendMessage(m.key.remoteJid, { text: errorMessage }, { quoted: m });
        }
    }
};