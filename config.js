

const moment= require("moment-timezone")
const { execSync } = require('child_process')

global.dana = '085727264161';       // isi jika aktif, kosong jika nonaktif
global.ovo = '';
global.gopay = '';
global.qris = 'gada';       // link gambar QR, bisa kosong kalau belum ada

const config = {
    AutoUpdate          : 'on', // on atau off
    API_KEY             : '05501b702e2deb881646ba79', // APIKEY ANDA AMBIL DI autoresbot.com
    GEMINI_API_KEY      : 'AIzaSyAkCzq-i7duuhxTl70frLgP6pB5R_gHs4Y', // https://youtu.be/02oGg3-3a-s?si=9WhaVsLyfc6B-YYI
    phone_number_bot    : '6285727264161', // Nomor BOT
    imgbb_api_key       : 'fe81f7e350e126dbb8897d7dd4670a99',
    type_connection     : 'pairing', // qr atau pairing
 
    bot_destination     : 'both', // group , private, both
    name_bot            : 'Syana Ai',
    owner_name          : 'Autoresbot',
    owner_number        : '6285603233332',
    owner_website       : 'rasyaa.vercell.app',
    version             : global.version,
    rate_limit          : 3000, // 3 detik
    total_limit         : 100, // limit perhari -  user biasa || kalo premium unlimited
    sticker_packname    : 'Syana',
    sticker_author      : `Date: ${moment.tz('Asia/Jakarta').format('DD/MM/YY')}\nYouTube: Rasyaa Creative`,
    notification        : {
        limit           : 'Hai kak, Limit harian anda sudah habis silakan tunggu besok ya atau berlangganan premium untuk menikmati fitur tanpa limit',
        reset           : 'Dialog berhasil dihapus. Semua percakapan kita telah di-reset dan siap memulai dari awal!',
        ig              : 'kirimkan link instagramnya ya kak',
        fb              : 'kirimkan link facebooknya ya kak',
        tt              : 'kirimkan link tiktoknya ya kak',
        waiting         : 'Hai kak mohon tunggu beberapa saat lagi ya, proses sebelumnya belum selesai',
        qc_help         : 'Tulis textnya ya kak, misal *qc halo*',
        only_owner      : '_❗Perintah Ini Hanya Bisa Digunakan Oleh Owner !_'
        
    },
    success             : {
        hd : 'Ini kak hasil gambarnya, Maaf kalau masih blur',
    },
    error               : {
       FILE_TOO_LARGE : `File terlalu besar. Maksimal ukuran file adalah 99 Mb`,
       THROW          : '_Ada masalah saat terhubung ke server_',
       PLAY_ERROR     : 'Yahh Gagal, Sepertinya ada masalah saat mendowload audio',
       HD_ERROR       : 'Yahh Gagal, Mohon maaf kak, tidak bisa hd in gambar',
       IMAGE_ERROR    : 'Yahh Gagal, Mohon maaf kak, tidak bisa carikan kamu gambar',
       qc             : 'Yah gagal bikin qc nya kak'
    }
}; 

module.exports = config;
