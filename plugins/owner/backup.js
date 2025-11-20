// File: plugins/owner/backup.js (Versi Final dengan Library 'archiver')

const fs = require('fs');
const path = require('path');
const config = require('../../config');
// [REVISI UTAMA] Impor library 'archiver' yang baru kita install
const archiver = require('archiver');

module.exports = {
    command: ['backup', 'getsc'],
    intent: ['ambil sc', 'backupsc', 'get script', 'script', 'base'],
    tags: ['owner'],
    desc: 'Membuat backup script bot yang bersih dalam format .zip (Khusus Owner).',

    handler: async (m, { sender }) => {
        const isOwner = config.owner_number.includes(sender.split('@')[0]);
        if (!isOwner) return null; 

        m.reply(`📦 Siap! Sedang membuat arsip .zip yang bersih untuk Anda... Ini mungkin butuh beberapa saat.`);
        
        return { action: { name: 'execute_backup_archiver', data: {} } };
    },

    execute: async (m, { sock }) => {
        const botName = `SyanaAi-Backup`;
        const zipFile = `${botName}-${Date.now()}.zip`;
        const zipFilePath = path.resolve(zipFile);

        // [REVISI UTAMA] Menggunakan 'archiver' untuk membuat file zip
        // =================================================================
        try {
            // 1. Buat output stream untuk file zip
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Level kompresi tertinggi
            });

            // Promise untuk menunggu hingga proses pengarsipan selesai
            await new Promise((resolve, reject) => {
                output.on('close', resolve); // Selesaikan promise saat file selesai ditulis
                archive.on('error', reject); // Tolak promise jika ada error

                // 2. Hubungkan output stream ke archiver
                archive.pipe(output);

                // 3. [INI KUNCINYA] Gunakan 'glob' untuk menambahkan semua file KECUALI yang tidak diinginkan
                // '**/*' artinya semua file dan folder secara rekursif
                archive.glob('**/*', {
                    cwd: '.', // Direktori saat ini
                    ignore: [
                        'node_modules/**', // Abaikan semua di dalam node_modules
                        'session/**',       // Abaikan semua di dalam session
                        'auth_info_baileys/**', // Abaikan folder sesi Baileys baru
                        'tmp/**',           // Abaikan folder tmp
                        'package-lock.json',
                        'yarn.lock',
                        '.git/**',          // Abaikan semua yang berhubungan dengan git
                        zipFile             // Sangat penting: jangan backup file zip itu sendiri!
                    ]
                });

                // 4. Selesaikan proses pengarsipan
                archive.finalize();
            });
            // =================================================================

            console.log(`[BACKUP] File zip berhasil dibuat: ${zipFile} (${(fs.statSync(zipFilePath).size / 1024 / 1024).toFixed(2)} MB)`);

            // Kirim dokumen
            await sock.sendMessage(m.key.remoteJid, {
                document: { url: zipFilePath },
                fileName: zipFile,
                mimetype: 'application/zip',
                caption: `📦 Ini dia file backup script Anda!\n\nUkuran file: *${(fs.statSync(zipFilePath).size / 1024).toFixed(2)} KB*`
            }, { quoted: m });

        } catch (error) {
            console.error("🚫 Eksekusi Backup Gagal:", error);
            await sock.sendMessage(m.key.remoteJid, { text: `Gagal membuat file backup: ${error.message}` }, { quoted: m });
        } finally {
            // Selalu hapus file zip setelah selesai
            if (fs.existsSync(zipFilePath)) {
                console.log(`[BACKUP] Menghapus file sementara: ${zipFilePath}`);
                fs.unlinkSync(zipFilePath);
            }
        }
    }
}