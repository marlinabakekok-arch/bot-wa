// File: plugins/info/menu.js (Versi Final dengan Path Absolut)

// [REVISI UTAMA] Kita akan menggunakan modul 'path' bawaan Node.js
const path = require('path');

// [REVISI UTAMA] Bangun path absolut ke file 'quoted.js' dari direktori root proyek
const { metaai } = require(path.resolve(process.cwd(), 'lib', 'quoted.js')); 
const pluginManager = require(path.resolve(process.cwd(), 'lib', 'pluginManager.js'));
const config = require(path.resolve(process.cwd(), 'config.js'));

module.exports = {
    command: ['menu', 'help'],
    intent: ['menu', 'bantuan', 'list fitur'],

    tags: ['info'],
    desc: 'Menampilkan menu utama bot secara otomatis dengan gambar.',

    handler: async (m, { sock }) => {
        const allPlugins = pluginManager.getPlugins(); 

        if (!allPlugins || allPlugins.length === 0) {
            return m.reply("Maaf, tidak ada plugin yang termuat saat ini.");
        }

        const categorizedPlugins = {};
        for (const plugin of allPlugins) {
            if (!plugin.command || !plugin.desc) continue;

            const tagName = plugin.tags && plugin.tags[0] ? plugin.tags[0] : 'lainnya';
            const capitalizedTag = tagName.charAt(0).toUpperCase() + tagName.slice(1);

            if (!categorizedPlugins[capitalizedTag]) {
                categorizedPlugins[capitalizedTag] = [];
            }
            categorizedPlugins[capitalizedTag].push(plugin);
        }

        const sections = [];
        for (const category in categorizedPlugins) {
            const rows = categorizedPlugins[category].map(plugin => ({
                title: plugin.command[0],
                description: plugin.desc,
                id: `${config.prefix}${plugin.command[0]}`
            }));

            sections.push({
                title: `╭─「 ${category.toUpperCase()} 」`,
                rows: rows
            });
        }

        const imageUrl = 'https://files.catbox.moe/vifubv.jpg';
        const captionText = `Halo, *${m.pushName || 'kak'}*!\n\nIni adalah daftar perintah yang tersedia. Silakan pilih salah satu dari daftar di bawah ini.`;
        const footerText = 'Dibuat dengan ❤️ oleh Syana Ai';

        const paramsJson = JSON.stringify({
            title: '📜 MENU UTAMA SYANA AI',
            sections: sections
        });

        const listButton = [{
            buttonId: 'menu_list_button',
            buttonText: { displayText: '📖 Buka Menu Lengkap' }, 
            type: 4,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: paramsJson
            }
        }];
        
        await sock.sendMessage(m.key.remoteJid, {
            image: { url: imageUrl },
            caption: captionText,
            footer: footerText,
            buttons: listButton,
            headerType: 4
        }, { quoted: metaai });
    }
};