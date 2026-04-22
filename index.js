require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const admin = require('firebase-admin');
const { body, query, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = process.env.APP_URL || 'https://variagame.onrender.com';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
const DAILY_LIMIT_MINUTES = 240;
const BASE_RATE = 0.001;

// ========== Firebase Admin Başlat ==========
let db = null;
try {
    if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
        });
        db = admin.firestore();
        console.log('Firebase Admin başlatıldı.');
    } else {
        console.warn('Firebase Admin başlatılamadı. Backend sınırlı modda.');
    }
} catch (err) {
    console.error('Firebase Admin hatası:', err.message);
}

// ========== Telegram InitData Doğrulama ==========
function verifyTelegramInitData(initData) {
    if (!initData) return false;
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return false;

    const secret = crypto.createHash('sha256').update(botToken).digest();
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    return hmac === hash;
}

function extractUserIdFromInitData(initData) {
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user.id.toString();
    } catch {
        return null;
    }
}

// ========== Middleware ==========
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://www.gstatic.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://data527.click", "https://my-pu.sh"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://media.giphy.com", "https://lottie.host"],
            frameSrc: ["'self'"],
            connectSrc: ["'self'", "https://variagame-79b3d.firebaseapp.com", "wss://variagame-79b3d.firebaseapp.com"]
        }
    }
}));
app.use(cors({ origin: APP_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(session({
    name: 'variagame.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });
app.use('/api/', apiLimiter);
app.use('/api/play-session', rateLimit({ windowMs: 5 * 60 * 1000, max: 30 }));

// ========== Yardımcı Fonksiyonlar ==========
function calcEarned(minutes) {
    const cycles = Math.floor(minutes / 60);
    return Number((cycles * BASE_RATE).toFixed(6));
}

async function ensureUserExists(userId, userName = 'Player') {
    if (!db) return;
    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) {
        await userRef.set({
            userId,
            name: userName,
            balance: 0,
            level: 1,
            xp: 0,
            todayPlayed: 0,
            totalEarned: 0,
            totalMinutes: 0,
            gamesPlayed: 0,
            referralCount: 0,
            referralEarnings: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

// ========== Statik Dosyalar ==========
app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ========== API Endpoint'leri ==========

// Config (client için güvenli bilgiler)
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        data: {
            firebase: {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID,
                measurementId: process.env.FIREBASE_MEASUREMENT_ID
            },
            appUrl: APP_URL,
            botUsername: process.env.BOT_USERNAME,
            baseRate: BASE_RATE,
            dailyLimitMinutes: DAILY_LIMIT_MINUTES
        }
    });
});

// Kullanıcı verisi getir
app.get('/api/user', [
    query('initData').isString().notEmpty()
], async (req, res) => {
    const { initData } = req.query;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userId = extractUserIdFromInitData(initData);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user' });

    if (!db) {
        return res.json({ success: true, data: { userId, fallback: true } });
    }

    await ensureUserExists(userId);
    const doc = await db.collection('users').doc(userId).get();
    const userData = doc.data();
    userData.isAdmin = ADMIN_IDS.includes(userId);
    res.json({ success: true, data: userData });
});

// Referans linki oluştur
app.get('/api/user/ref-link', [
    query('initData').isString().notEmpty()
], async (req, res) => {
    const { initData } = req.query;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userId = extractUserIdFromInitData(initData);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user' });

    const refCode = Buffer.from(userId).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const link = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${refCode}`;

    if (db) {
        await db.collection('referrals').doc(userId).set({
            userId, refCode, link, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    res.json({ success: true, data: { refCode, link } });
});

// Oyun oturumu bildir (her dakika veya oyun sonu)
app.post('/api/play-session', [
    body('initData').isString().notEmpty(),
    body('gameId').isString().trim().isLength({ min: 1, max: 64 }),
    body('minutes').isInt({ min: 1, max: 240 }),
    body('isActive').isBoolean()
], async (req, res) => {
    const { initData, gameId, minutes, isActive } = req.body;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userId = extractUserIdFromInitData(initData);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user' });

    if (!isActive) {
        return res.json({ success: true, data: { earned: 0, reason: 'inactive' } });
    }

    if (!db) {
        return res.json({ success: true, data: { earned: calcEarned(minutes), fallback: true } });
    }

    await ensureUserExists(userId);
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const user = userSnap.data();

    const todayPlayed = user.todayPlayed || 0;
    const allowed = Math.min(minutes, DAILY_LIMIT_MINUTES - todayPlayed);
    if (allowed <= 0) {
        return res.json({ success: true, data: { earned: 0, reason: 'daily_limit_reached' } });
    }

    const earned = calcEarned(allowed);
    const batch = db.batch();

    batch.update(userRef, {
        balance: admin.firestore.FieldValue.increment(earned),
        totalEarned: admin.firestore.FieldValue.increment(earned),
        xp: admin.firestore.FieldValue.increment(allowed * 5),
        totalMinutes: admin.firestore.FieldValue.increment(allowed),
        todayPlayed: admin.firestore.FieldValue.increment(allowed),
        gamesPlayed: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    batch.set(db.collection('playSessions').doc(`${userId}_${Date.now()}`), {
        userId, gameId, minutes: allowed, earned,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Seviye atlama kontrolü
    const newXp = (user.xp || 0) + allowed * 5;
    let newLevel = user.level || 1;
    let xpForNext = 500 * Math.pow(1.1, newLevel - 1);
    while (newXp >= xpForNext && newLevel < 99) {
        newLevel++;
        xpForNext = 500 * Math.pow(1.1, newLevel - 1);
    }
    if (newLevel > (user.level || 1)) {
        await userRef.update({ level: newLevel, xp: newXp });
    }

    res.json({ success: true, data: { earned, minutesCounted: allowed } });
});

// Referans işleme (bot tarafından çağrılır veya deep link ile)
app.post('/api/referral/process', [
    body('initData').isString().notEmpty(),
    body('refCode').isString().trim().isLength({ min: 3, max: 32 })
], async (req, res) => {
    const { initData, refCode } = req.body;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userId = extractUserIdFromInitData(initData);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user' });

    if (!db) return res.json({ success: true, data: { fallback: true } });

    // Referans kodundan sahibi bul
    const refSnap = await db.collection('referrals').where('refCode', '==', refCode).limit(1).get();
    if (refSnap.empty) return res.json({ success: false, error: 'Invalid ref code' });
    const ownerId = refSnap.docs[0].id;
    if (ownerId === userId) return res.json({ success: false, error: 'Self referral' });

    // Daha önce işlenmiş mi?
    const processedSnap = await db.collection('referrals').doc(`${userId}_joined`).get();
    if (processedSnap.exists) return res.json({ success: true, data: { alreadyProcessed: true } });

    const batch = db.batch();
    batch.set(db.collection('referrals').doc(`${userId}_joined`), {
        userId, refCode, sourceUserId: ownerId, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.update(db.collection('users').doc(ownerId), {
        balance: admin.firestore.FieldValue.increment(0.15),
        referralEarnings: admin.firestore.FieldValue.increment(0.15),
        referralCount: admin.firestore.FieldValue.increment(1)
    });
    await batch.commit();
    res.json({ success: true, data: { processed: true } });
});

// Admin: Kullanıcı listesi
app.get('/api/admin/users', [
    query('initData').isString().notEmpty()
], async (req, res) => {
    const { initData } = req.query;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userId = extractUserIdFromInitData(initData);
    if (!ADMIN_IDS.includes(userId)) return res.status(403).json({ success: false, error: 'Forbidden' });

    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('users').limit(100).get();
    const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: users });
});

// Admin: Kullanıcı güncelle
app.post('/api/admin/update-user', [
    body('initData').isString().notEmpty(),
    body('targetUserId').isString().trim().notEmpty(),
    body('balance').optional().isFloat({ min: 0 }),
    body('level').optional().isInt({ min: 1 }),
    body('notification').optional().isString()
], async (req, res) => {
    const { initData, targetUserId, balance, level, notification } = req.body;
    if (!verifyTelegramInitData(initData)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const adminId = extractUserIdFromInitData(initData);
    if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ success: false, error: 'Forbidden' });

    if (!db) return res.json({ success: true, data: { fallback: true } });
    const updateData = {};
    if (balance !== undefined) updateData.balance = Number(balance);
    if (level !== undefined) updateData.level = Number(level);
    if (notification) updateData.adminNotification = notification;
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('users').doc(targetUserId).update(updateData);
    res.json({ success: true });
});

app.get('/api/health', (req, res) => res.json({ success: true, timestamp: new Date().toISOString() }));

// ========== Cron Jobs ==========
cron.schedule('*/10 * * * *', () => {
    fetch(`${APP_URL}/api/health`).catch(() => {});
});

cron.schedule('0 0 * * *', async () => {
    if (!db) return;
    const snap = await db.collection('users').get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { todayPlayed: 0 }));
    await batch.commit();
    console.log('Günlük limit sıfırlandı.');
});

app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
