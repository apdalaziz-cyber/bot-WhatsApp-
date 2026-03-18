/*
==================================================
🤖 بوت واتساب - نسخة عربية كاملة - ملف واحد
==================================================
النسخة: 2.0 (مُحسنة ومضمونة الشغل)
التاريخ: 2024
==================================================
*/

// ========== استيراد المكتبات ==========
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ========== إعدادات البوت الأساسية ==========
const BOT_CONFIG = {
    prefix: '!',
    ownerNumber: '201234567890', // غير هذا برقمك
    moderators: ['201234567890'], // أرقام المشرفين
    botName: 'حامي المجموعة',
    welcomeMessage: '✋ أهلاً بك في المجموعة',
    antiLink: true,
    antiSpam: true
};

// ========== قاعدة البيانات المؤقتة ==========
const DB = {
    warnings: new Map(),
    banned: new Map(),
    spam: new Map()
};

// ========== النكت المضحكة ==========
const JOKES = [
    'مرة واحد راح لدكتور الأسنان.. قال له ضرسي يوجعني.. قال له حط ايدك على قلبك.. قال له ليه؟ قال له عشان اللي في ايدك غير اللي في بقك 😂',
    'واحد بيقول لصاحبه أنا عندي كلب بيقرأ الجرايد.. قال له إزاي؟ قال له بشوفه قاعد قدام الجريدة ساعات 😂',
    'مرة واحد غبي دخل المطعم.. قال للجرسون عاوز حاجة سريعة.. قال له دقيقة.. قال له هات دقيقة وسخنة 😂'
];

// ========== رسائل المغادرة ==========
const LEAVE_MSGS = [
    '😂 خرج {member} ابن الكلب، يجي مكانه محترم',
    '👋 {member} مشى.. يمكن زهق من الزنقة',
    '🏃 {member} طار... الله معاه',
    '😢 {member} سابنا... يمكن راح يتجوز'
];

// ========== إعدادات القراءة ==========
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ========== دوال مساعدة ==========
const Utils = {
    getText: (msg) => {
        if (msg.message?.conversation) return msg.message.conversation;
        if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
        return '';
    },
    
    getSender: (msg) => msg.key.participant || msg.key.remoteJid,
    
    isGroup: (jid) => jid?.endsWith('@g.us') || false,
    
    getMentioned: (msg) => {
        return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    },
    
    isAdmin: (sender, owner, mods) => {
        return sender.includes(owner) || mods.some(m => sender.includes(m));
    },
    
    sleep: (ms) => new Promise(r => setTimeout(r, ms))
};

// ========== معالج الأوامر ==========
const Commands = {
    // عرض المساعدة
    async help(sock, msg) {
        const target = msg.key.remoteJid;
        const text = `🤖 *${BOT_CONFIG.botName}*

╭━❰ الأوامر ❱
┣ !اوامر - عرض القائمة
┣ !نكتة - نكتة
┣ !هزار - رد مضحك
┣ !بوس @م - بوس
┣ !ضرب @م - ضرب
┣ !طرد @م - طرد
┣ !تحذير @م - تحذير
┣ !التحذيرات @م - عرض التحذيرات
┣ !رفع @م - رفع مشرف
┣ !تنزيل @م - تنزيل مشرف
┣ !قفل - قفل المجموعة
┣ !فتح - فتح المجموعة
┣ !الرابط - رابط المجموعة
┣ !الكل - منشن الكل
╰━━━━━━━━━━`;
        
        await sock.sendMessage(target, { text });
    },

    // نكتة
    async joke(sock, msg) {
        const target = msg.key.remoteJid;
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        await sock.sendMessage(target, { text: `😂 *نكتة*\n\n${joke}` });
    },

    // رد مضحك
    async funny(sock, msg) {
        const target = msg.key.remoteJid;
        const responses = [
            'يا عم متزعلش 😂',
            'أنا بوت وشفرة 😤',
            'انت كده هتخليني أعيط 😭',
            'والله لو عندي رجلين كنت جريت 🏃'
        ];
        await sock.sendMessage(target, { 
            text: responses[Math.floor(Math.random() * responses.length)] 
        });
    },

    // بوس
    async kiss(sock, msg, args) {
        const target = msg.key.remoteJid;
        const mentioned = Utils.getMentioned(msg);
        let who = 'الكل';
        
        if (mentioned.length) who = `@${mentioned[0].split('@')[0]}`;
        else if (args.length) who = args.join(' ');
        
        await sock.sendMessage(target, {
            text: `😘 بوسة لـ ${who}`,
            mentions: mentioned
        });
    },

    // ضرب
    async hit(sock, msg, args) {
        const target = msg.key.remoteJid;
        const mentioned = Utils.getMentioned(msg);
        let who = 'نفسه';
        
        if (mentioned.length) who = `@${mentioned[0].split('@')[0]}`;
        else if (args.length) who = args.join(' ');
        
        await sock.sendMessage(target, {
            text: `👊 كف لـ ${who}`,
            mentions: mentioned
        });
    },

    // طرد
    async kick(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        const mentioned = Utils.getMentioned(msg);
        if (!mentioned.length) {
            return await sock.sendMessage(group, { text: '❌ منشن العضو' });
        }
        
        await sock.groupParticipantsUpdate(group, mentioned, 'remove');
        
        const msgs = ['🚀 طار', '👋 وداعاً', '⚡ باي', '🎭 مشى'];
        await sock.sendMessage(group, { 
            text: msgs[Math.floor(Math.random() * msgs.length)] 
        });
    },

    // تحذير
    async warn(sock, msg) {
        const group = msg.key.remoteJid;
        const mentioned = Utils.getMentioned(msg);
        
        if (!mentioned.length) {
            return await sock.sendMessage(group, { text: '❌ منشن العضو' });
        }
        
        const user = mentioned[0];
        const warns = (DB.warnings.get(user) || 0) + 1;
        DB.warnings.set(user, warns);
        
        if (warns >= 3) {
            await sock.groupParticipantsUpdate(group, [user], 'remove');
            await sock.sendMessage(group, { 
                text: `🚨 تم طرد ${user.split('@')[0]} لـ 3 تحذيرات` 
            });
            DB.warnings.delete(user);
        } else {
            await sock.sendMessage(group, { 
                text: `⚠️ تحذير ${warns}/3 للعضو ${user.split('@')[0]}` 
            });
        }
    },

    // عرض التحذيرات
    async warns(sock, msg) {
        const group = msg.key.remoteJid;
        const mentioned = Utils.getMentioned(msg);
        
        if (!mentioned.length) {
            return await sock.sendMessage(group, { text: '❌ منشن العضو' });
        }
        
        const user = mentioned[0];
        const warns = DB.warnings.get(user) || 0;
        let bar = '';
        for (let i = 1; i <= 3; i++) bar += i <= warns ? '🔴' : '⚪';
        
        await sock.sendMessage(group, { 
            text: `📊 تحذيرات ${user.split('@')[0]}: ${warns}/3\n${bar}` 
        });
    },

    // رفع مشرف
    async promote(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        const mentioned = Utils.getMentioned(msg);
        if (!mentioned.length) {
            return await sock.sendMessage(group, { text: '❌ منشن العضو' });
        }
        
        await sock.groupParticipantsUpdate(group, mentioned, 'promote');
        await sock.sendMessage(group, { 
            text: `✅ تم رفع ${mentioned[0].split('@')[0]} مشرفاً` 
        });
    },

    // تنزيل مشرف
    async demote(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        const mentioned = Utils.getMentioned(msg);
        if (!mentioned.length) {
            return await sock.sendMessage(group, { text: '❌ منشن العضو' });
        }
        
        await sock.groupParticipantsUpdate(group, mentioned, 'demote');
        await sock.sendMessage(group, { 
            text: `🔄 تم تنزيل ${mentioned[0].split('@')[0]}` 
        });
    },

    // قفل المجموعة
    async lock(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        await sock.groupSettingUpdate(group, 'announcement');
        await sock.sendMessage(group, { text: '🔒 تم القفل' });
    },

    // فتح المجموعة
    async unlock(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        await sock.groupSettingUpdate(group, 'not_announcement');
        await sock.sendMessage(group, { text: '🔓 تم الفتح' });
    },

    // رابط المجموعة
    async link(sock, msg, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        const code = await sock.groupInviteCode(group);
        await sock.sendMessage(group, { 
            text: `🔗 الرابط:\nhttps://chat.whatsapp.com/${code}` 
        });
    },

    // منشن الكل
    async tagall(sock, msg, args, sender) {
        const group = msg.key.remoteJid;
        const isAdmin = Utils.isAdmin(sender, BOT_CONFIG.ownerNumber, BOT_CONFIG.moderators);
        
        if (!isAdmin) {
            return await sock.sendMessage(group, { text: '❌ هذا الأمر للمشرفين' });
        }
        
        const meta = await sock.groupMetadata(group);
        const participants = meta.participants;
        const text = args.length ? args.join(' ') : '📢 تنبيه';
        const mentions = participants.map(p => p.id);
        
        await sock.sendMessage(group, {
            text: `${text}\n\n${mentions.map(id => `@${id.split('@')[0]}`).join(' ')}`,
            mentions
        });
    }
};

// ========== تشغيل البوت ==========
async function startBot() {
    console.log('🤖 بدء تشغيل البوت...');
    
    // مجلد الجلسة
    if (!fs.existsSync('./session')) {
        fs.mkdirSync('./session');
    }

    // تحميل الجلسة
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    // إنشاء الاتصال
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Chrome', 'Linux', '20.0.04'],
        syncFullHistory: false
    });

    // حفظ بيانات الجلسة
    sock.ev.on('creds.update', saveCreds);

    // معالجة الاتصال
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, pairingCode } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('❌ قطع الاتصال... إعادة المحاولة');
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ البوت متصل!');
            console.log('📱 رقم البوت:', sock.user?.id?.split(':')[0]);
        }
        
        // كود الربط
        if (pairingCode) {
            console.log('\n' + '═'.repeat(40));
            console.log('🔐 كود الربط الخاص بك:');
            console.log('═'.repeat(40));
            console.log(`📱 ${pairingCode}`);
            console.log('═'.repeat(40));
            console.log('📌 أدخله في:');
            console.log('الواتساب > الإعدادات > الأجهزة المرتبطة');
            console.log('> الربط برقم هاتف');
            console.log('═'.repeat(40) + '\n');
        }
    });

    // طلب الرقم
    console.log('\n🔑 جاري تجهيز كود الربط...');
    const phone = await new Promise(r => {
        rl.question('📱 رقم البوت (مثال: 201234567890): ', r);
    });

    if (phone && phone.length >= 10) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phone);
                console.log('\n' + '⭐'.repeat(40));
                console.log('🔐 كود الربط:');
                console.log('⭐'.repeat(40));
                console.log(`📱 ${code}`);
                console.log('⭐'.repeat(40));
                console.log('أدخله في واتساب الآن');
                console.log('⭐'.repeat(40) + '\n');
            } catch (e) {
                console.log('❌ خطأ في الكود:', e.message);
            }
        }, 2000);
    }

    // معالجة الرسائل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            
            try {
                const text = Utils.getText(msg);
                if (!text || !text.startsWith(BOT_CONFIG.prefix)) continue;
                
                const args = text.slice(1).trim().split(/ +/);
                const cmd = args.shift().toLowerCase();
                const sender = Utils.getSender(msg);
                
                // تنفيذ الأوامر
                if (cmd === 'اوامر' || cmd === 'help') await Commands.help(sock, msg);
                else if (cmd === 'نكتة' || cmd === 'joke') await Commands.joke(sock, msg);
                else if (cmd === 'هزار' || cmd === 'fun') await Commands.funny(sock, msg);
                else if (cmd === 'بوس' || cmd === 'kiss') await Commands.kiss(sock, msg, args);
                else if (cmd === 'ضرب' || cmd === 'hit') await Commands.hit(sock, msg, args);
                else if (cmd === 'طرد' || cmd === 'kick') await Commands.kick(sock, msg, sender);
                else if (cmd === 'تحذير' || cmd === 'warn') await Commands.warn(sock, msg);
                else if (cmd === 'التحذيرات' || cmd === 'warns') await Commands.warns(sock, msg);
                else if (cmd === 'رفع' || cmd === 'promote') await Commands.promote(sock, msg, sender);
                else if (cmd === 'تنزيل' || cmd === 'demote') await Commands.demote(sock, msg, sender);
                else if (cmd === 'قفل' || cmd === 'lock') await Commands.lock(sock, msg, sender);
                else if (cmd === 'فتح' || cmd === 'unlock') await Commands.unlock(sock, msg, sender);
                else if (cmd === 'الرابط' || cmd === 'link') await Commands.link(sock, msg, sender);
                else if (cmd === 'الكل' || cmd === 'tagall') await Commands.tagall(sock, msg, args, sender);
                
            } catch (err) {
                console.log('خطأ في أمر:', err.message);
            }
        }
    });

    // أحداث المجموعة
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            
            if (action === 'add') {
                for (const p of participants) {
                    await sock.sendMessage(id, {
                        text: `👋 أهلاً @${p.split('@')[0]}\n${BOT_CONFIG.welcomeMessage}`,
                        mentions: [p]
                    });
                }
            }
            
            if (action === 'remove') {
                for (const p of participants) {
                    const name = p.split('@')[0];
                    const msg = LEAVE_MSGS[Math.floor(Math.random() * LEAVE_MSGS.length)]
                        .replace('{member}', name);
                    await Utils.sleep(1000);
                    await sock.sendMessage(id, { text: msg });
                }
            }
        } catch (err) {
            console.log('خطأ في حدث المجموعة:', err.message);
        }
    });

    console.log('🎉 البوت جاهز! انتظر كود الربط...');
}

// تشغيل
startBot().catch(err => {
    console.log('❌ خطأ:', err.message);
    rl.close();
});

// إغلاق آمن
process.on('SIGINT', () => {
    console.log('\n👋 إغلاق البوت');
    rl.close();
    process.exit();
});
