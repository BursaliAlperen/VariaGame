require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cron = require('node-cron');
const fetch = require('node-fetch');

// ==================== FIREBASE ADMIN BAŞLAT ====================
try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;
    
    if (!privateKey) {
      console.error('❌ FIREBASE_PRIVATE_KEY bulunamadı! .env dosyasını kontrol edin.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('✅ Firebase Admin başarıyla başlatıldı');
  }
} catch (error) {
  console.error('❌ Firebase Admin başlatma hatası:', error.message);
}

const db = admin.firestore();

// ==================== OTOMATİK KOLEKSİYON OLUŞTURMA ====================
async function ensureCollectionsExist() {
  console.log('📦 Koleksiyonlar kontrol ediliyor...');
  
  const collections = ['users', 'referrals', 'playSessions', 'games', 'promoCodes', 'withdrawals', 'dailyStats'];
  
  for (const collectionName of collections) {
    try {
      const initDoc = db.collection(collectionName).doc('_init_');
      await initDoc.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: `Auto-created ${collectionName} collection`,
        _init: true
      }, { merge: true });
      
      console.log(`✅ ${collectionName} koleksiyonu hazır`);
    } catch (error) {
      console.error(`❌ ${collectionName} koleksiyonu oluşturulamadı:`, error.message);
    }
  }
  
  // Örnek oyun ekle (games koleksiyonu boş kalmasın)
  try {
    const gamesRef = db.collection('games');
    const gamesSnapshot = await gamesRef.limit(1).get();
    if (gamesSnapshot.empty) {
      await gamesRef.doc('2048').set({
        ad: '2048',
        kategori: 'Puzzle',
        embed: '2048',
        resim: '2048.png',
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Örnek 2048 oyunu eklendi');
    }
  } catch (error) {
    console.error('❌ Örnek oyun eklenemedi:', error.message);
  }
  
  console.log('🎉 Tüm koleksiyonlar kontrol edildi ve hazır!');
}

// ==================== EXPRESS UYGULAMASI ====================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(mp4|webm|ogg)$/i)) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = 'VariaGAME_bot';

// ==================== TELEGRAM BOT YARDIMCI FONKSİYONLARI ====================
async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('Telegram mesaj hatası:', e.message);
  }
}

// ==================== REFERANS KODU OLUŞTURMA ====================
function generateRefCode(userId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.abs((hash >> (i * 4)) % chars.length));
  }
  return result;
}

// ==================== API ENDPOINTS ====================

// Frontend config API
app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    adminIds: ADMIN_IDS,
    botUsername: BOT_USERNAME
  });
});

// Kullanıcıya özel referans linki oluştur
app.get('/api/user/ref-link', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  
  try {
    const userRef = db.collection('users').doc(String(userId));
    const userDoc = await userRef.get();
    
    let refCode = userDoc.exists ? userDoc.data().refCode : null;
    
    if (!refCode) {
      refCode = generateRefCode(userId);
      await userRef.set({ 
        refCode, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      }, { merge: true });
    }
    
    const refLink = `https://t.me/${BOT_USERNAME}?start=${refCode}`;
    res.json({ success: true, refCode, refLink });
  } catch (error) {
    console.error('Ref link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Referans kodu ile gelen kullanıcıyı işle
app.post('/api/referral/process', async (req, res) => {
  const { newUserId, refCode } = req.body;
  if (!newUserId || !refCode) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const usersSnapshot = await db.collection('users')
      .where('refCode', '==', refCode)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return res.json({ success: false, message: 'Invalid referral code' });
    }
    
    const referrerDoc = usersSnapshot.docs[0];
    const referrerId = referrerDoc.id;
    
    if (referrerId === newUserId) {
      return res.json({ success: false, message: 'Cannot refer yourself' });
    }
    
    const newUserRef = db.collection('users').doc(String(newUserId));
    const newUserDoc = await newUserRef.get();
    
    if (newUserDoc.exists && newUserDoc.data().referredBy) {
      return res.json({ success: false, message: 'Already referred' });
    }
    
    const REF_BONUS = 0.15;
    
    await db.runTransaction(async (t) => {
      t.set(newUserRef, {
        referredBy: referrerId,
        refCode: generateRefCode(newUserId),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      const referrerRef = db.collection('users').doc(referrerId);
      t.update(referrerRef, {
        balance: admin.firestore.FieldValue.increment(REF_BONUS),
        totalEarned: admin.firestore.FieldValue.increment(REF_BONUS),
        referralCount: admin.firestore.FieldValue.increment(1),
        referralEarnings: admin.firestore.FieldValue.increment(REF_BONUS)
      });
      
      t.set(db.collection('referrals').doc(), {
        referrerId: referrerId,
        referredId: newUserId,
        bonusEarned: REF_BONUS,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    const referrerData = referrerDoc.data();
    if (referrerData.telegramId) {
      await sendTelegramMessage(referrerData.telegramId, 
        `🎉 <b>Yeni Davet!</b>\n\nBir arkadaşın senin linkinle kaydoldu!\n💰 Kazandığın ödül: <b>+$${REF_BONUS.toFixed(2)}</b>`
      );
    }
    
    res.json({ success: true, referrerId });
  } catch (error) {
    console.error('Referral process error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Referans geçmişini getir
app.get('/api/user/referrals', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  
  try {
    const snapshot = await db.collection('referrals')
      .where('referrerId', '==', String(userId))
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const referrals = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let referredName = 'User';
      
      if (data.referredId) {
        const userDoc = await db.collection('users').doc(data.referredId).get();
        if (userDoc.exists) {
          referredName = userDoc.data().firstName || 'User';
        }
      }
      
      referrals.push({
        id: doc.id,
        ...data,
        referredName,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
      });
    }
    
    res.json({ success: true, referrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Oyun süresi kaydetme
app.post('/api/play-session', async (req, res) => {
  const { userId, minutes, gameTitle } = req.body;
  if (!userId || minutes <= 0 || minutes > 240) return res.status(400).json({ error: 'Invalid duration' });

  try {
    const userRef = db.collection('users').doc(String(userId));
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();
    const todayPlayed = userData.todayPlayedMinutes || 0;
    const DAILY_LIMIT = 240;
    if (todayPlayed >= DAILY_LIMIT) return res.status(400).json({ error: 'Daily limit exceeded' });

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
        totalEarned: admin.firestore.FieldValue.increment(earned),
        gamesPlayed: admin.firestore.FieldValue.increment(1),
        xp: admin.firestore.FieldValue.increment(Math.floor(allowedMinutes * 5))
      });
      t.set(db.collection('playSessions').doc(), {
        userId: String(userId),
        minutes: allowedMinutes,
        earned: earned,
        gameTitle: gameTitle || 'Unknown Game',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true, earned, allowedMinutes });
  } catch (error) {
    console.error('Play session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin API'leri
app.get('/api/admin/users', async (req, res) => {
  const { userId } = req.query;
  if (!ADMIN_IDS.includes(userId)) return res.status(403).json({ error: 'Unauthorized' });
  const snapshot = await db.collection('users').limit(50).get();
  res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/admin/update-user', async (req, res) => {
  const { adminId, targetUserId, balance, level } = req.body;
  if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Unauthorized' });
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
  try { 
    await fetch(APP_URL); 
    console.log('✅ Keep-alive ping'); 
  } catch (e) {
    console.error('Keep-alive hatası:', e.message);
  }
});

// Günlük sıfırlama (her gün 00:00'da)
cron.schedule('0 0 * * *', async () => {
  try {
    const snapshot = await db.collection('users').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { todayPlayedMinutes: 0 }));
    await batch.commit();
    console.log('✅ Günlük oyun süreleri sıfırlandı');
  } catch (e) {
    console.error('❌ Sıfırlama hatası:', e.message);
  }
});

// ==================== SUNUCUYU BAŞLAT ====================
const PORT = process.env.PORT || 3000;

// Önce koleksiyonları oluştur, sonra sunucuyu başlat
ensureCollectionsExist().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
    console.log(`📱 Web App: ${APP_URL}`);
  });
}).catch(error => {
  console.error('❌ Koleksiyon oluşturma hatası, sunucu yine de başlatılıyor:', error.message);
  app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor (koleksiyon hatası ile)`);
  });
});
