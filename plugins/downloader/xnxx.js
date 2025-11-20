// File: plugins/downloader/xnxx.js (Versi Definitif & Mandiri)

const axios = require('axios');
const config = require('../../config'); // Impor config untuk mengakses nomor owner

module.exports = {
    command: ['xnxxdl'],
    intent: ['xnxx', 'caribokep', 'download xnxx'], 

    tags: ['downloader', 'owner'],
    desc: 'Mencari atau mengunduh video dari XNXX.',

    /**
     * Handler ini TIDAK lagi mengharapkan 'isOwner' dari argumen.
     * Ia akan melakukan pengecekan sendiri.
     */
    handler: async (m, { sock, content, sender, lowerCaseMessage, cmd }) => {
        
        // [FIX DEFINITIF] Pengecekan owner dilakukan DI DALAM plugin.
        // Ia membaca langsung dari file config yang sudah diimpor.
        const isOwnerCheck = config.owner_number.includes(sender.split('@')[0]);

        if (!isOwnerCheck) {
            return m.reply('Fitur ini khusus untuk Owner.');
        }

        const remoteJid = m.key.remoteJid;
        const message = m;
        const urlRegex = /https?:\/\/[^\s]+/;
        const urlMatch = content.match(urlRegex);

        // ALUR 1: MENANGANI PERMINTAAN DOWNLOAD
        if (cmd === 'xnxxdl' || lowerCaseMessage.startsWith('download xnxx')) {
            if (!urlMatch) {
                return m.reply('Gunakan format:\n.xnxxdl <url_video>\nAtau\ndownload xnxx <url_video>');
            }
            const url = urlMatch[0];
            
            try {
                await m.reply('📥 Link diterima! Mengunduh video...');
                const apiKey = config.SANKA_API_KEY || 'planaai';
                const apiUrl = `https://www.sankavollerei.com/download/xnxx?apikey=${apiKey}&url=${encodeURIComponent(url)}`;
                
                const response = await axios.get(apiUrl);
                const result = response.data.result;

                if (!response.data.status || !result.files?.high) throw new Error('Gagal mendapatkan link download video.');

                await sock.sendMessage(remoteJid, {
                    video: { url: result.files.high },
                    caption: `*🎬 Judul:* ${result.title}`
                }, { quoted: message });

            } catch (error) {
                console.error("🚫 XNXX Download Gagal:", error);
                await m.reply(`Gagal mengunduh video.\n*Alasan:* ${error.message}`);
            }
            return;
        }

        // ALUR 2: MENANGANI PERMINTAAN PENCARIAN
        const query = lowerCaseMessage.replace(/xnxx|caribokep/g, '').trim();
        if (!query) {
            return m.reply('Masukkan kata kunci pencarian. Contoh: *xnxx jepang*');
        }
        
        try {
            await m.reply(`🔎 Mencari video untuk *"${query}"*...`);
            const apiKey = config.SANKA_API_KEY || 'planaai';
            const apiUrl = `https://www.sankavollerei.com/search/xnxx?apikey=${apiKey}&q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(apiUrl);
            const result = response.data;

            if (!result.status || !Array.isArray(result.result) || result.result.length === 0) {
                throw new Error(`Tidak ditemukan video untuk kata kunci "${query}".`);
            }

            const rows = result.result.slice(0, 20).map(video => ({
                title: video.title,
                description: video.info.replace(/\n/g, ' ').trim(),
                id: `download xnxx ${video.link}`
            }));

            const paramsJson = JSON.stringify({
                title: `🎬 HASIL PENCARIAN: ${query.toUpperCase()}`,
                sections: [{ title: 'Klik untuk langsung mengunduh', rows }]
            });

            const listButton = [{
                buttonId: 'random_id', buttonText: { displayText: '📜 Buka Daftar Video' }, type: 4,
                nativeFlowInfo: { name: 'single_select', paramsJson }
            }];
            
            await sock.sendMessage(remoteJid, {
                text: `Berikut adalah *${rows.length} hasil teratas*. Klik tombol di bawah lalu pilih video untuk diunduh secara otomatis.`,
                buttons: listButton,
                footer: 'Hasil Pencarian'
            }, { quoted: message });

        } catch (error) {
            console.error("🚫 XNXX Search Gagal:", error);
            await m.reply(`Gagal mencari video.\n*Alasan:* ${error.message}`);
        }
    }
}