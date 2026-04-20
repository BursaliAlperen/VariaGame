const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// Bellek içi veritabanı
const userDB = new Map();

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        app: 'VARIA GAME',
        users: userDB.size,
        timestamp: new Date().toISOString()
    });
});

// Kullanıcı bilgisi
app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;
    const user = userDB.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const level = Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1;
    const xpToNext = Math.pow(level / 0.1, 2);
    const baseRate = 0.0025;
    const levelBonus = 1 + (level * 0.05);
    const earningRate = baseRate * levelBonus * (user.isPremium ? 1.5 : 1);
    
    res.json({
        ...user,
        level,
        xpToNextLevel: xpToNext,
        currentXp: user.xp || 0,
        earningRate
    });
});

// Kullanıcı kaydet/güncelle
app.post('/api/user', (req, res) => {
    const { userId, firstName, username, isPremium, balance, xp, streak } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId gerekli' });
    }
    
    if (!userDB.has(userId)) {
        userDB.set(userId, {
            id: userId,
            firstName: firstName || 'Oyuncu',
            username: username || '',
            isPremium: isPremium || false,
            balance: balance || 5.00,
            streak: streak || 0,
            totalEarned: 5.00,
            gamesPlayed: 0,
            totalMinutes: 0,
            xp: xp || 0,
            level: 1,
            referrals: [],
            createdAt: new Date().toISOString()
        });
    } else {
        const user = userDB.get(userId);
        if (balance !== undefined) user.balance = balance;
        if (xp !== undefined) user.xp = xp;
        if (streak !== undefined) user.streak = streak;
        userDB.set(userId, user);
    }
    
    res.json({ success: true, user: userDB.get(userId) });
});

// Günlük ödül
app.post('/api/claim-daily', (req, res) => {
    const { userId } = req.body;
    const user = userDB.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const today = new Date().toDateString();
    const lastClaim = user.lastClaim ? new Date(user.lastClaim).toDateString() : null;
    
    if (lastClaim === today) {
        return res.status(400).json({ error: 'Bugün zaten topladın!' });
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = user.streak || 0;
    if (lastClaim === yesterday.toDateString()) {
        newStreak = Math.min(newStreak + 1, 7);
    } else {
        newStreak = 1;
    }
    
    const reward = 0.50 + (newStreak * 0.25);
    const finalReward = user.isPremium ? reward * 1.5 : reward;
    
    user.balance = (user.balance || 0) + finalReward;
    user.streak = newStreak;
    user.lastClaim = new Date().toISOString();
    user.totalEarned = (user.totalEarned || 0) + finalReward;
    user.xp = (user.xp || 0) + (10 * newStreak);
    
    userDB.set(userId, user);
    
    res.json({
        success: true,
        balance: user.balance,
        streak: newStreak,
        claimed: finalReward,
        xp: user.xp
    });
});

// Oyun süresi kazancı
app.post('/api/game/earning', (req, res) => {
    const { userId, minutes } = req.body;
    const user = userDB.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const level = Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1;
    const baseRate = 0.0025;
    const levelBonus = 1 + (level * 0.05);
    const premiumBonus = user.isPremium ? 1.5 : 1;
    const rate = baseRate * levelBonus * premiumBonus;
    
    const earned = minutes * rate;
    
    user.balance = (user.balance || 0) + earned;
    user.totalEarned = (user.totalEarned || 0) + earned;
    user.totalMinutes = (user.totalMinutes || 0) + minutes;
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    user.xp = (user.xp || 0) + (minutes * 5);
    
    userDB.set(userId, user);
    
    res.json({
        success: true,
        earned,
        balance: user.balance,
        xp: user.xp
    });
});

// Telegram Webhook
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const { message } = req.body;
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        
        if (message?.text?.startsWith('/start')) {
            const chatId = message.chat.id;
            const firstName = message.from.first_name || 'Oyuncu';
            const userId = String(message.from.id);
            const startParam = message.text.split(' ')[1] || null;
            
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
                
                if (startParam && userDB.has(startParam)) {
                    const referrer = userDB.get(startParam);
                    referrer.balance = (referrer.balance || 0) + 1.00;
                    referrer.totalEarned = (referrer.totalEarned || 0) + 1.00;
                    referrer.referrals = referrer.referrals || [];
                    referrer.referrals.push({ userId, date: new Date().toISOString() });
                    userDB.set(startParam, referrer);
                }
            }
            
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
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║         🎮 VARİA GAME 🎮             ║
    ║         Server: ${PORT}                   ║
    ║         Render Deployment Ready        ║
    ╚═══════════════════════════════════════╝
    `);
});
