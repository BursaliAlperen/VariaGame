const fetch = require('node-fetch');

// Bellek içi veritabanı (Vercel serverless için)
// NOT: Gerçek projede MongoDB Atlas veya Supabase kullanın!
let userDB = new Map();

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Telegram Webhook
    if (req.method === 'POST') {
        try {
            const { message, callback_query } = req.body;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const appUrl = process.env.APP_URL || 'https://varia-game.vercel.app';
            
            // /start komutu
            if (message?.text === '/start') {
                const chatId = message.chat.id;
                const firstName = message.from.first_name;
                const userId = message.from.id.toString();
                const startParam = message.text.split(' ')[1];
                
                // Kullanıcıyı kaydet
                if (!userDB.has(userId)) {
                    userDB.set(userId, {
                        id: userId,
                        firstName: firstName,
                        username: message.from.username || '',
                        isPremium: message.from.is_premium || false,
                        balance: 5.00,
                        streak: 0,
                        totalEarned: 5.00,
                        gamesPlayed: 0,
                        totalMinutes: 0,
                        xp: 0,
                        level: 1,
                        referrals: [],
                        referredBy: startParam || null,
                        createdAt: new Date().toISOString()
                    });
                    
                    // Referans bonusu
                    if (startParam && userDB.has(startParam)) {
                        const referrer = userDB.get(startParam);
                        referrer.balance += 1.00;
                        referrer.totalEarned += 1.00;
                        referrer.referrals.push({ userId, date: new Date().toISOString() });
                        userDB.set(startParam, referrer);
                    }
                }
                
                // Hoşgeldin mesajı
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `🎮 *VARİA GAME*'e Hoş Geldin ${firstName}!\n\n` +
                              `💰 Oyun oyna, para kazan!\n` +
                              `⭐ XP topla, seviye atla!\n` +
                              `👥 Arkadaşlarını davet et, %10 kazan!\n\n` +
                              `👇 Hemen başla!`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🎮 HEMEN OYNA', web_app: { url: appUrl } }
                            ]]
                        }
                    })
                });
            }
            
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    // API Endpointleri
    else if (req.method === 'GET') {
        const { action, userId } = req.query;
        
        // Health check
        if (action === 'health') {
            return res.status(200).json({ 
                status: 'OK', 
                app: 'VARİA GAME',
                users: userDB.size,
                timestamp: new Date().toISOString()
            });
        }
        
        // Kullanıcı bilgisi
        if (action === 'user' && userId) {
            const user = userDB.get(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            
            const level = Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1;
            const xpToNext = Math.pow((level) / 0.1, 2);
            const baseRate = 0.0025;
            const levelBonus = 1 + (level * 0.05);
            const earningRate = baseRate * levelBonus * (user.isPremium ? 1.5 : 1);
            
            return res.status(200).json({
                ...user,
                level,
                xpToNextLevel: xpToNext,
                currentXp: user.xp || 0,
                earningRate
            });
        }
        
        res.status(400).json({ error: 'Geçersiz istek' });
    }
    
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
