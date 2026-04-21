require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cron = require('node-cron');
const fetch = require('node-fetch');

// Firebase Admin başlat
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Telegram Bot API yardımcı fonksiyonu (isteğe bağlı kullanım)
async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) {
    console.error('Telegram mesaj hatası:', e);
  }
}

// Frontend config API (Telegram token'ı FRONTEND'E GÖNDERME!)
app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    adminIds: ADMIN_IDS
    // Bot token asla frontend'e gönderilmez!
  });
});

// Oyun süresi kaydetme (mevcut)
app.post('/api/play-session', async (req, res) => {
  const { userId, minutes, gameTitle } = req.body;
  if (!userId || minutes <= 0 || minutes > 240) return res.status(400).json({ error: 'Geçersiz süre' });

  try {
    const userRef = db.collection('users').doc(String(userId));
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Kullanıcı yok' });

    const userData = userDoc.data();
    const todayPlayed = userData.todayPlayedMinutes || 0;
    const DAILY_LIMIT = 240;
    if (todayPlayed >= DAILY_LIMIT) return res.status(400).json({ error: 'Günlük limit aşıldı' });

    const allowedMinutes = Math.min(minutes, DAILY_LIMIT - todayPlayed);
    const rate = Math.min(0.002 + ((userData.level || 1) - 1) * 0.00003, 0.0035);
    const earned = allowedMinutes * rate;

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      const newBalance = (doc.data().balance || 0) + earned;
      t.update(userRef, {
        balance: newBalance,
        totalMinutes: admin.firestore.FieldValue.increment(allowedMinutes),
        todayPlayedMinutes: admin.firestore.FieldValue.increment(allowedMinutes),
        totalEarned: admin.firestore.FieldValue.increment(earned)
      });
      t.set(db.collection('playSessions').doc(), {
        userId: String(userId),
        minutes: allowedMinutes,
        earned: earned,
        gameTitle: gameTitle || 'Bilinmeyen Oyun',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Büyük kazançlarda admin'e bildirim (opsiyonel)
    if (earned > 0.5) {
      // sendTelegramMessage(ADMIN_IDS[0], `💰 ${userId} ${earned.toFixed(3)}$ kazandı!`);
    }

    res.json({ success: true, earned, allowedMinutes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Referans kaydı (mevcut)
app.post('/api/referral', async (req, res) => {
  const { newUserId, referrerId } = req.body;
  if (!newUserId || !referrerId || newUserId === referrerId) return res.status(400).json({ error: 'Geçersiz' });
  try {
    const userRef = db.collection('users').doc(String(newUserId));
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data().referredBy) return res.json({ success: false });

    await db.runTransaction(async (t) => {
      t.set(userRef, { telegramId: newUserId, referredBy: referrerId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      t.update(db.collection('users').doc(String(referrerId)), { referralCount: admin.firestore.FieldValue.increment(1) });
      t.set(db.collection('referrals').doc(), { referrerId: String(referrerId), referredId: String(newUserId), timestamp: admin.firestore.FieldValue.serverTimestamp() });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin API'leri (mevcut)
app.get('/api/admin/users', async (req, res) => {
  const { userId } = req.query;
  if (!ADMIN_IDS.includes(userId)) return res.status(403).json({ error: 'Yetkisiz' });
  const snapshot = await db.collection('users').limit(50).get();
  res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/admin/update-user', async (req, res) => {
  const { adminId, targetUserId, balance, level } = req.body;
  if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Yetkisiz' });
  const update = {};
  if (balance !== undefined) update.balance = Number(balance);
  if (level !== undefined) { update.level = Number(level); update.xp = Math.pow((level - 1) / 0.1, 2); }
  await db.collection('users').doc(String(targetUserId)).update(update);
  res.json({ success: true });
});

// Ana sayfa
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Keep-alive (7/24)
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
cron.schedule('*/10 * * * *', async () => {
  try { await fetch(APP_URL); console.log('Keep-alive ping'); } catch (e) {}
});

// Günlük sıfırlama cron'u (her gün 00:00'da)
cron.schedule('0 0 * * *', async () => {
  try {
    const snapshot = await db.collection('users').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { todayPlayedMinutes: 0 }));
    await batch.commit();
    console.log('Günlük oyun süreleri sıfırlandı');
  } catch (e) {
    console.error('Sıfırlama hatası:', e);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda, Bot token: ${TELEGRAM_BOT_TOKEN ? 'Yüklü' : 'Eksik'}`));
