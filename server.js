require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'varia-game-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Static dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// ===== BELLEK İÇİ VERİTABANI (Render için, gerçek projede MongoDB/PostgreSQL kullan) =====
const db = {
    users: new Map(),
    sessions: new Map()
};

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        app: 'VARİA GAME',
        timestamp: new Date().toISOString(),
        users: db.users.size
    });
});

// Kullanıcı girişi / kayıt (Telegram WebApp'ten gelen initData ile)
app.post('/api/auth/telegram', async (req, res) => {
    try {
        const { initData, user } = req.body;
        
        if (!user || !user.id) {
            return res.status(400).json({ error: 'Geçersiz kullanıcı verisi' });
        }
        
        const userId = user.id.toString();
        
        // Kullanıcı var mı kontrol et
        let userData = db.users.get(userId);
        
        if (!userData) {
            // Yeni kullanıcı oluştur
            userData = {
                id: userId,
                firstName: user.first_name || 'Oyuncu',
                lastName: user.last_name || '',
                username: user.username || '',
                isPremium: user.is_premium || false,
                balance: 5.00, // Hoşgeldin bonusu
                streak: 0,
                lastClaim: null,
                totalEarned: 5.00,
                gamesPlayed: 0,
                referrals: [],
                referredBy: null,
                createdAt: new Date().toISOString(),
                settings: {
                    notifications: true,
                    sound: true,
                    theme: 'system'
                }
            };
            db.users.set(userId, userData);
        }
        
        // Session oluştur
        const sessionToken = uuidv4();
        db.sessions.set(sessionToken, userId);
        
        res.json({
            success: true,
            user: userData,
            sessionToken
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Kullanıcı bilgilerini getir
app.get('/api/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Hassas bilgileri çıkar
        const { ...safeUser } = userData;
        
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Günlük ödül topla
app.post('/api/claim-daily', (req, res) => {
    try {
        const { userId } = req.body;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        const today = new Date().toDateString();
        const lastClaim = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        
        if (lastClaim === today) {
            return res.status(400).json({ error: 'Bugün zaten ödül topladın!' });
        }
        
        // Streak kontrolü
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        let newStreak = userData.streak;
        if (lastClaim === yesterdayStr) {
            newStreak = Math.min(newStreak + 1, 7);
        } else {
            newStreak = 1;
        }
        
        // Ödül miktarı (streak'e göre artar)
        const baseReward = 0.50;
        const streakBonus = newStreak * 0.25;
        const reward = baseReward + streakBonus;
        
        // Premium kullanıcılara %50 bonus
        const finalReward = userData.isPremium ? reward * 1.5 : reward;
        
        // Bakiyeyi güncelle
        userData.balance += finalReward;
        userData.streak = newStreak;
        userData.lastClaim = new Date().toISOString();
        userData.totalEarned += finalReward;
        
        db.users.set(userId, userData);
        
        res.json({
            success: true,
            balance: userData.balance,
            streak: newStreak,
            claimed: finalReward,
            message: `🎉 $${finalReward.toFixed(2)} toplandı!`
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Oyun oynama kaydı
app.post('/api/game/play', (req, res) => {
    try {
        const { userId, gameId, gameName } = req.body;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        userData.gamesPlayed = (userData.gamesPlayed || 0) + 1;
        db.users.set(userId, userData);
        
        res.json({
            success: true,
            gamesPlayed: userData.gamesPlayed
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Oyun süresine göre kazanç (dakika başı)
app.post('/api/game/earning', (req, res) => {
    try {
        const { userId, minutes } = req.body;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        const earningRate = 0.0025; // Dakika başı $0.0025
        const earned = minutes * earningRate;
        
        userData.balance += earned;
        userData.totalEarned += earned;
        db.users.set(userId, userData);
        
        res.json({
            success: true,
            earned,
            balance: userData.balance
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Referans linki oluştur
app.get('/api/referral/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        const referralLink = `https://t.me/VariaGameBot?start=${userId}`;
        
        res.json({
            referralLink,
            referralCount: userData.referrals?.length || 0,
            referrals: userData.referrals || []
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Referans ile kayıt
app.post('/api/referral/register', (req, res) => {
    try {
        const { userId, referrerId } = req.body;
        
        const userData = db.users.get(userId);
        const referrerData = db.users.get(referrerId);
        
        if (!userData || !referrerData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        if (!userData.referredBy) {
            userData.referredBy = referrerId;
            db.users.set(userId, userData);
            
            if (!referrerData.referrals) referrerData.referrals = [];
            referrerData.referrals.push({
                userId,
                date: new Date().toISOString(),
                earned: 0
            });
            db.users.set(referrerId, referrerData);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ayarları güncelle
app.post('/api/settings', (req, res) => {
    try {
        const { userId, settings } = req.body;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        userData.settings = { ...userData.settings, ...settings };
        db.users.set(userId, userData);
        
        res.json({
            success: true,
            settings: userData.settings
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bildirimleri getir
app.get('/api/notifications/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        // Örnek bildirimler
        const notifications = [
            {
                id: 1,
                type: 'reward',
                title: 'Günlük Ödül Hazır!',
                message: 'Günlük ödülünü toplamayı unutma! 🎁',
                date: new Date().toISOString(),
                read: false
            },
            {
                id: 2,
                type: 'referral',
                title: 'Yeni Arkadaş!',
                message: 'Ali senin linkinle katıldı! +$0.50 kazandın! 🎉',
                date: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: 3,
                type: 'system',
                title: 'VARİA GAME\'e Hoş Geldin!',
                message: 'Oyun oynayarak para kazanmaya başla! 💰',
                date: new Date(Date.now() - 86400000).toISOString(),
                read: true
            }
        ];
        
        res.json(notifications);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bildirimi okundu işaretle
app.post('/api/notifications/read', (req, res) => {
    res.json({ success: true });
});

// İstatistikler
app.get('/api/stats/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userData = db.users.get(userId);
        
        if (!userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Haftalık kazanç (örnek)
        const weeklyEarnings = {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            data: [45, 82, 120, 95, 150, 200, 200]
        };
        
        // Aylık kazanç
        const monthlyEarnings = {
            labels: ['1.Hft', '2.Hft', '3.Hft', '4.Hft'],
            data: [120, 250, 180, 342]
        };
        
        res.json({
            weeklyEarnings,
            monthlyEarnings,
            totalEarned: userData.totalEarned,
            gamesPlayed: userData.gamesPlayed,
            streak: userData.streak,
            balance: userData.balance
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Telegram Webhook
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const { message, callback_query } = req.body;
        const fetch = (await import('node-fetch')).default;
        
        if (message?.text === '/start') {
            const chatId = message.chat.id;
            const firstName = message.from.first_name;
            const startParam = message.text.split(' ')[1];
            
            let userId = message.from.id.toString();
            let referrerId = startParam || null;
            
            // Kullanıcıyı kaydet
            let userData = db.users.get(userId);
            if (!userData) {
                userData = {
                    id: userId,
                    firstName: firstName,
                    username: message.from.username || '',
                    balance: 5.00,
                    streak: 0,
                    totalEarned: 5.00,
                    gamesPlayed: 0,
                    referrals: [],
                    referredBy: referrerId,
                    createdAt: new Date().toISOString()
                };
                db.users.set(userId, userData);
                
                // Referans bonusu
                if (referrerId) {
                    const referrer = db.users.get(referrerId);
                    if (referrer) {
                        referrer.balance += 1.00;
                        referrer.totalEarned += 1.00;
                        referrer.referrals = referrer.referrals || [];
                        referrer.referrals.push({ userId, date: new Date().toISOString() });
                        db.users.set(referrerId, referrer);
                    }
                }
            }
            
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `🎮 *VARİA GAME*'e Hoş Geldin ${firstName}!\n\n` +
                          `💰 Oyun oynayarak para kazan!\n` +
                          `🎁 Her gün ödül topla!\n` +
                          `👥 Arkadaşlarını davet et, %10 kazan!\n\n` +
                          `Hemen başlamak için aşağıdaki butona tıkla! 👇`,
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
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║         🎮 VARİA GAME 🎮             ║
    ║         Server başlatıldı!            ║
    ║         Port: ${PORT}                     ║
    ║         URL: ${process.env.APP_URL || `http://localhost:${PORT}`}    ║
    ╚═══════════════════════════════════════╝
    `);
});
