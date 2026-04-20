// Vercel Serverless Function - Telegram Webhook
// Düzeltilmiş versiyon

// Node-fetch yerine built-in fetch kullanalım (Node 18+)
// Vercel ortamında daha stabil çalışır

// Bellek içi veritabanı (serverless için geçici)
let userDB = new Map();

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Health check
    if (req.method === 'GET' && req.query.action === 'health') {
        return res.status(200).json({
            status: 'OK',
            app: 'VARIA GAME',
            users: userDB.size,
            timestamp: new Date().toISOString()
        });
    }
    
    // Kullanıcı bilgisi getir
    if (req.method === 'GET' && req.query.action === 'user' && req.query.userId) {
        const user = userDB.get(req.query.userId);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        const level = Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1;
        const xpToNext = Math.pow(level / 0.1, 2);
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
    
    // Telegram Webhook
    if (req.method === 'POST') {
        try {
            const { message, callback_query } = req.body;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const appUrl = process.env.APP_URL || 'https://varia-game.vercel.app';
            
            if (!botToken) {
                console.error('TELEGRAM_BOT_TOKEN bulunamadı!');
                return res.status(500).json({ error: 'Bot token missing' });
            }
            
            // /start komutu
            if (message && message.text && message.text.startsWith('/start')) {
                const chatId = message.chat.id;
                const firstName = message.from.first_name || 'Oyuncu';
                const userId = String(message.from.id);
                const startParam = message.text.split(' ')[1] || null;
                
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
                        referredBy: startParam,
                        createdAt: new Date().toISOString()
                    });
                    
                    // Referans bonusu
                    if (startParam && userDB.has(startParam)) {
                        const referrer = userDB.get(startParam);
                        referrer.balance = (referrer.balance || 0) + 1.00;
                        referrer.totalEarned = (referrer.totalEarned || 0) + 1.00;
                        referrer.referrals = referrer.referrals || [];
                        referrer.referrals.push({ userId, date: new Date().toISOString() });
                        userDB.set(startParam, referrer);
                    }
                }
                
                // Hoşgeldin mesajı gönder
                const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                
                const response = await fetch(telegramUrl, {
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
                
                const data = await response.json();
                
                if (!response.ok) {
                    console.error('Telegram API hatası:', data);
                }
            }
            
            // Callback query (inline button tıklaması)
            if (callback_query) {
                const queryId = callback_query.id;
                
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: queryId,
                        text: 'Oyun merkezi açılıyor...'
                    })
                });
            }
            
            return res.status(200).json({ ok: true });
            
        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
    
    // Diğer metodlar
    return res.status(405).json({ error: 'Method not allowed' });
}
