// File: plugins/owner/cybertrack.js

const axios = require('axios');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: ['cybertrack', 'deeptrack'],
    intent: ['track ip', 'locatefull', 'ipfull'],
    tags: ['owner'],
    desc: 'Melacak IP hingga alamat lengkap + screenshot Google Maps (Khusus Owner).',

    /**
     * Handler: Memvalidasi owner dan input, lalu memicu execute.
     */
    handler: async (m, { sender, args }) => {
        if (!config.owner_number.includes(sender.split('@')[0])) {
            return m.reply("Perintah ini memerlukan tingkat akses tertinggi (Owner).");
        }

        const targetIp = args[0];
        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;

        if (!targetIp || !ipRegex.test(targetIp)) {
            return m.reply(`📍 Format salah. Berikan alamat IP yang valid.\n*Contoh:* ${config.prefix}cybertrack 8.8.8.8`);
        }

        // [RAPIH] Pesan konfirmasi yang lebih baik
        m.reply(`🕵️‍♂️ *Memulai Pelacakan Mendalam...*\n*Target:* ${targetIp}\n\nMohon tunggu, proses ini dapat memakan waktu hingga 30 detik untuk mengumpulkan semua data dan gambar.`);
        
        return { action: { name: 'execute_deeptrack', data: { targetIp } } };
    },

    /**
     * Execute: Melakukan semua pekerjaan berat (multiple API calls dan file processing).
     */
    execute: async (m, { sock, data }) => {
        const { targetIp } = data;
        const mapPath = path.resolve(`./tmp/map_${targetIp}.jpg`);
        const svPath = path.resolve(`./tmp/sv_${targetIp}.jpg`);

        try {
            console.log(`[DEEPTRACK] Memulai pelacakan untuk ${targetIp}`);
            
            // Langkah 1: Dapatkan data geolokasi dasar
            const { data: basicData } = await axios.get(`http://ip-api.com/json/${targetIp}`);
            if (basicData.status === 'fail') {
                throw new Error(`IP-API: ${basicData.message}`);
            }
            const { lat, lon, city, regionName, country, isp, org } = basicData;

            // Langkah 2: Dapatkan alamat lengkap menggunakan Google Geocoding API
            // [AMAN] Mengambil API Key dari config.js
            if (!config.googleApiKey || config.googleApiKey === 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
                 throw new Error("Google API Key belum dikonfigurasi di config.js");
            }
            const { data: geoData } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${config.googleApiKey}&language=id`);
            const address = geoData.results[0]?.formatted_address || 'Tidak ditemukan alamat lengkap.';

            // Langkah 3: Siapkan URL untuk Static Map dan Street View
            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=18&size=600x400&maptype=satellite&markers=color:red%7C${lat},${lon}&key=${config.googleApiKey}`;
            const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lon}&key=${config.googleApiKey}&fov=90&heading=235&pitch=10`;

            // Langkah 4: Unduh kedua gambar secara paralel untuk efisiensi
            const downloadImage = async (url, dest) => {
                const writer = fs.createWriteStream(dest);
                const response = await axios({ url, method: 'GET', responseType: 'stream' });
                response.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            };
            await Promise.all([
                downloadImage(staticMapUrl, mapPath),
                downloadImage(streetViewUrl, svPath)
            ]);

            // Langkah 5: Kirim hasil dengan format yang indah
            const resultText = 
`*🕵️‍♂️ — DEEP TRACK RESULT — 🕵️‍♂️*

*🎯 Target IP:* \`${targetIp}\`
-----------------------------------
*🌍 Alamat Lengkap (Estimasi):*
${address}
-----------------------------------
*🏙️ Kota/Provinsi:* ${city}, ${regionName}
*🏳️ Negara:* ${country}
-----------------------------------
*📡 ISP:* ${isp}
*🏢 Organisasi:* ${org || 'N/A'}
-----------------------------------
*🗺️ Koordinat:* \`(${lat}, ${lon})\`
*Peta dan Street View terlampir di bawah.*`;

            await sock.sendMessage(m.key.remoteJid, { text: resultText }, { quoted: m });
            await sock.sendMessage(m.key.remoteJid, { image: { url: mapPath }, caption: '📍 *Peta Satelit (Zoom 18)*' }, { quoted: m });
            await sock.sendMessage(m.key.remoteJid, { image: { url: svPath }, caption: '🏠 *Street View (Estimasi Lokasi)*' }, { quoted: m });

            console.log(`[DEEPTRACK] Pelacakan berhasil untuk ${targetIp}`);

        } catch (error) {
            console.error("🚫 Gagal melakukan DeepTrack:", error);
            await sock.sendMessage(m.key.remoteJid, { text: `*Gagal melakukan Deep Track:*\n${error.message}` }, { quoted: m });
        
        } finally {
            // [RAPIH] Selalu hapus file sementara, baik berhasil maupun gagal.
            if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
            if (fs.existsSync(svPath)) fs.unlinkSync(svPath);
        }
    }
};