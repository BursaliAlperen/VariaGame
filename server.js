require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'varia-game-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ===== VERİTABANI (In-Memory) =====
const db = {
    users: new Map(),
    sessions: new Map()
};

// ===== YARDIMCI FONKSİYONLAR =====
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp)) + 1;
}

function xpForNextLevel(level) {
    return Math.pow((level) / 0.1, 2);
}

function calculateEarningRate(level, isPremium) {
    const baseRate = 0.0025; // Dakika başı
    const levelBonus = 1 + (level * 0.05); // Her level %5 bonus
    const premiumBonus = isPremium ? 1.5 : 1;
    return baseRate * levelBonus * premiumBonus;
}

// ===== API ROUTES =====

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', app: 'VARİA GAME', users: db.users.size });
});

// Kullanıcı girişi / kayıt
app.post('/api/auth/telegram', async (req, res) => {
    try {
        const { initData, user, onboarding } = req.body;
        
        if (!user || !user.id) {
            return res.status(400).json({ error: 'Geçersiz kullanıcı' });
        }
        
        const userId = user.id.toString();
        let userData = db.users.get(userId);
        
        if (!userData) {
            userData = {
                id: userId,
                firstName: user.first_name || 'Oyuncu',
                lastName: user.last_name || '',
                username: user.username || '',
                isPremium: user.is_premium || false,
                balance: 5.00,
                streak: 0,
                lastClaim: null,
                totalEarned: 5.00,
                gamesPlayed: 0,
                totalMinutes: 0,
                xp: 0,
                level: 1,
                referrals: [],
                referredBy: null,
                onboarding: onboarding || null,
                createdAt: new Date().toISOString(),
                settings: { notifications: true, sound: true, vibration: true, autoPlay: true },
                notifications: []
            };
            db.users.set(userId, userData);
        }
        
        // Hoşgeldin bildirimi
        userData.notifications.unshift({
            id: uuidv4(),
            type: 'welcome',
            title: '🎮 VARİA GAME\'e Hoş Geldin!',
            message: `${userData.firstName}, oyun oynayarak para kazanmaya başla! 💰`,
            date: new Date().toISOString(),
            read: false
        });
        
        const sessionToken = uuidv4();
        db.sessions.set(sessionToken, userId);
        
        // Önerilen oyun (onboarding'e göre)
        const recommendedGame = getRecommendedGame(userData.onboarding);
        
        res.json({
            success: true,
            user: userData,
            sessionToken,
            recommendedGame
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

function getRecommendedGame(onboarding) {
    if (!onboarding) return { id: 'moto-x3m', name: 'Moto X3M', category: 'Yarış' };
    
    const games = {
        aksiyon: { id: 'stickman', name: 'Stickman Duelist' },
        yaris: { id: 'moto-x3m', name: 'Moto X3M' },
        bulmaca: { id: 'cut-rope', name: 'Cut The Rope' },
        spor: { id: 'soccer', name: 'Soccer Stars' },
        strateji: { id: '2048', name: '2048' }
    };
    
    const preferred = onboarding.favoriteGenre;
    return games[preferred] || { id: 'moto-x3m', name: 'Moto X3M' };
}

// Kullanıcı bilgileri
app.get('/api/user/:userId', (req, res) => {
    const userData = db.users.get(req.params.userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    userData.level = calculateLevel(userData.xp || 0);
    userData.xpToNextLevel = xpForNextLevel(userData.level + 1);
    userData.currentXp = userData.xp || 0;
    userData.earningRate = calculateEarningRate(userData.level, userData.isPremium);
    
    res.json(userData);
});

// Günlük ödül
app.post('/api/claim-daily', (req, res) => {
    const { userId } = req.body;
    const userData = db.users.get(userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    const today = new Date().toDateString();
    const lastClaim = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
    
    if (lastClaim === today) {
        return res.status(400).json({ error: 'Bugün zaten ödül topladın!' });
    }
    
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = (lastClaim === yesterday.toDateString()) ? Math.min(userData.streak + 1, 7) : 1;
    
    const baseReward = 0.50 + (newStreak * 0.25);
    const finalReward = userData.isPremium ? baseReward * 1.5 : baseReward;
    
    userData.balance += finalReward;
    userData.streak = newStreak;
    userData.lastClaim = new Date().toISOString();
    userData.totalEarned += finalReward;
    
    // XP bonusu
    userData.xp = (userData.xp || 0) + (10 * newStreak);
    const newLevel = calculateLevel(userData.xp);
    
    if (newLevel > userData.level) {
        userData.notifications.unshift({
            id: uuidv4(), type: 'levelup',
            title: '🎉 Seviye Atladın!',
            message: `Tebrikler! ${newLevel}. seviyeye ulaştın! 🌟`,
            date: new Date().toISOString(), read: false
        });
        userData.level = newLevel;
    }
    
    db.users.set(userId, userData);
    
    res.json({
        success: true,
        balance: userData.balance,
        streak: newStreak,
        claimed: finalReward,
        xp: userData.xp,
        level: userData.level,
        levelUp: newLevel > (userData.level || 1)
    });
});

// Oyun süresi kazancı (dakika başı)
app.post('/api/game/earning', (req, res) => {
    const { userId, minutes, gameId } = req.body;
    const userData = db.users.get(userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    const rate = calculateEarningRate(userData.level || 1, userData.isPremium);
    const earned = minutes * rate;
    
    userData.balance += earned;
    userData.totalEarned += earned;
    userData.totalMinutes = (userData.totalMinutes || 0) + minutes;
    userData.gamesPlayed = (userData.gamesPlayed || 0) + 1;
    
    // XP kazancı (dakika başı 5 XP)
    userData.xp = (userData.xp || 0) + (minutes * 5);
    const newLevel = calculateLevel(userData.xp);
    const levelUp = newLevel > (userData.level || 1);
    
    if (levelUp) {
        userData.level = newLevel;
        userData.notifications.unshift({
            id: uuidv4(), type: 'levelup',
            title: '🎉 Seviye Atladın!',
            message: `${newLevel}. seviye! Kazanç oranın arttı! 📈`,
            date: new Date().toISOString(), read: false
        });
    }
    
    db.users.set(userId, userData);
    
    res.json({
        success: true,
        earned,
        balance: userData.balance,
        xp: userData.xp,
        level: userData.level,
        levelUp,
        rate,
        totalMinutes: userData.totalMinutes
    });
});

// Bildirimler
app.get('/api/notifications/:userId', (req, res) => {
    const userData = db.users.get(req.params.userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    // Sistem bildirimleri ekle
    const today = new Date().toDateString();
    if (!userData.lastClaim || new Date(userData.lastClaim).toDateString() !== today) {
        const hasDailyNotification = userData.notifications.some(n => n.type === 'daily' && new Date(n.date).toDateString() === today);
        if (!hasDailyNotification) {
            userData.notifications.unshift({
                id: uuidv4(), type: 'daily',
                title: '🎁 Günlük Ödül Hazır!',
                message: 'Ödülünü toplamayı unutma! Bugün $' + (0.50 + (userData.streak * 0.25)).toFixed(2) + ' seni bekliyor!',
                date: new Date().toISOString(), read: false
            });
        }
    }
    
    res.json(userData.notifications.slice(0, 20));
});

app.post('/api/notifications/read', (req, res) => {
    const { userId, notificationId } = req.body;
    const userData = db.users.get(userId);
    if (userData) {
        const notif = userData.notifications.find(n => n.id === notificationId);
        if (notif) notif.read = true;
        db.users.set(userId, userData);
    }
    res.json({ success: true });
});

// Ayarlar
app.post('/api/settings', (req, res) => {
    const { userId, settings } = req.body;
    const userData = db.users.get(userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    userData.settings = { ...userData.settings, ...settings };
    db.users.set(userId, userData);
    res.json({ success: true, settings: userData.settings });
});

// Referans
app.get('/api/referral/:userId', (req, res) => {
    const userData = db.users.get(req.params.userId);
    if (!userData) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    res.json({
        referralLink: `https://t.me/VariaGameBot?start=${req.params.userId}`,
        referralCount: userData.referrals?.length || 0,
        referrals: userData.referrals || []
    });
});

// Telegram Webhook
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const { message } = req.body;
        const fetch = (await import('node-fetch')).default;
        
        if (message?.text === '/start') {
            const chatId = message.chat.id;
            const firstName = message.from.first_name;
            const startParam = message.text.split(' ')[1];
            
            let userId = message.from.id.toString();
            let userData = db.users.get(userId);
            
            if (!userData) {
                userData = {
                    id: userId, firstName, username: message.from.username || '',
                    balance: 5.00, streak: 0, totalEarned: 5.00, gamesPlayed: 0,
                    xp: 0, level: 1, totalMinutes: 0,
                    referrals: [], referredBy: startParam || null,
                    createdAt: new Date().toISOString(),
                    settings: { notifications: true, sound: true, vibration: true, autoPlay: true },
                    notifications: []
                };
                db.users.set(userId, userData);
                
                if (startParam) {
                    const referrer = db.users.get(startParam);
                    if (referrer) {
                        referrer.balance += 1.00;
                        referrer.totalEarned += 1.00;
                        referrer.referrals.push({ userId, date: new Date().toISOString() });
                        db.users.set(startParam, referrer);
                    }
                }
            }
            
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
                            { text: '🎮 HEMEN OYNA', web_app: { url: process.env.APP_URL } }
                        ]]
                    }
                })
            });
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, () => {
    console.log(`🎮 VARİA GAME running on port ${PORT}`);
});
