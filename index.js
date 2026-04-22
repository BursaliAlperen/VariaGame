require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cron = require('node-cron');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// ======================== FIREBASE ADMIN ========================
try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY eksik');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('✅ Firebase Admin');
  }
} catch (e) { console.error('❌ Firebase:', e.message); process.exit(1); }
const db = admin.firestore();

// ======================== OTOMATİK KOLEKSİYON OLUŞTURMA ========================
async function ensureCollections() {
  const collections = ['users', 'referrals', 'playSessions', 'games', 'promoCodes', 'withdrawals'];
  for (const name of collections) {
    try {
      await db.collection(name).doc('_init_').set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        _init: true
      }, { merge: true });
      console.log(`✅ ${name} koleksiyonu hazır`);
    } catch (e) {}
  }
  const gamesSnap = await db.collection('games').limit(1).get();
  if (gamesSnap.empty) {
    await db.collection('games').doc('2048').set({
      ad: '2048', kategori: 'Puzzle', embed: '2048', resim: '2048.png', active: true
    });
    console.log('✅ Örnek 2048 oyunu eklendi');
  }
}
ensureCollections();

const app = express();

// ======================== GÜVENLİK ========================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://www.gstatic.com", "https://cdnjs.cloudflare.com", "https://my-pu.sh", "https://data527.click"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.binance.com", "https://*.firebaseapp.com", "https://*.firebaseio.com"],
      frameSrc: ["'self'", "https://*.firebaseapp.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true }));
app.use(compression());
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());
app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: false }));
app.use(mongoSanitize()); app.use(xss()); app.use(hpp());

app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100 }));
app.use('/api/play-session', rateLimit({ windowMs: 5*60*1000, max: 10 }));

// ======================== YARDIMCILAR ========================
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
const REF_BONUS = 0.015, BASE_RATE = 0.001, DAILY_LIMIT = 240;

const handleValidation = (req, res, next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(400).json({ error: e.array()[0].msg });
  next();
};

function genRefCode(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = ((h << 5) - h) + uid.charCodeAt(i);
  return Math.abs(h).toString(36).substring(0, 8).toUpperCase();
}

// ======================== STATIC ========================
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, p) => {
    if (p.match(/\.mp4$/)) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// ======================== API ========================
app.get('/api/config', (req, res) => res.json({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  adminIds: ADMIN_IDS,
  refBonus: REF_BONUS
}));

app.get('/api/user/ref-link',
  query('userId').notEmpty(),
  handleValidation,
  async (req, res) => {
    const { userId } = req.query;
    try {
      const ref = db.collection('users').doc(userId);
      const doc = await ref.get();
      let code = doc.exists ? doc.data().refCode : null;
      if (!code) {
        code = genRefCode(userId);
        await ref.set({ refCode: code, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
      res.json({ success: true, refCode: code, refLink: `https://t.me/${process.env.BOT_USERNAME || 'VariaGAME_bot'}?start=${code}` });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/referral/process',
  body('newUserId').notEmpty(),
  body('refCode').notEmpty(),
  handleValidation,
  async (req, res) => {
    const { newUserId, refCode } = req.body;
    try {
      const snap = await db.collection('users').where('refCode', '==', refCode).limit(1).get();
      if (snap.empty) return res.json({ success: false });
      const refDoc = snap.docs[0];
      const refId = refDoc.id;
      if (refId === newUserId) return res.json({ success: false });
      
      const newRef = db.collection('users').doc(newUserId);
      const newDoc = await newRef.get();
      if (newDoc.exists && newDoc.data().referredBy) return res.json({ success: false });
      
      await db.runTransaction(async t => {
        t.set(newRef, {
          referredBy: refId,
          refCode: genRefCode(newUserId),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        t.update(db.collection('users').doc(refId), {
          balance: admin.firestore.FieldValue.increment(REF_BONUS),
          totalEarned: admin.firestore.FieldValue.increment(REF_BONUS),
          referralCount: admin.firestore.FieldValue.increment(1),
          referralEarnings: admin.firestore.FieldValue.increment(REF_BONUS)
        });
        t.set(db.collection('referrals').doc(), {
          referrerId: refId, referredId: newUserId, bonusEarned: REF_BONUS,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/play-session',
  body('userId').notEmpty(),
  body('minutes').isFloat({ min: 0.1, max: 240 }),
  body('isAfk').optional().isBoolean(),
  handleValidation,
  async (req, res) => {
    const { userId, minutes, isAfk } = req.body;
    if (isAfk) return res.json({ success: false, message: 'AFK detected' });
    
    try {
      const ref = db.collection('users').doc(userId);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'User not found' });
      
      let data = doc.data();
      const today = new Date().toISOString().split('T')[0];
      if (data.lastReset !== today) {
        data.todayPlayed = 0;
        data.lastReset = today;
      }
      if (data.todayPlayed >= DAILY_LIMIT) return res.status(400).json({ error: 'Daily limit' });
      
      const allowed = Math.min(minutes, DAILY_LIMIT - data.todayPlayed);
      const rate = Math.min(BASE_RATE + ((data.level || 1) - 1) * 0.000022, 0.003);
      const earned = allowed * rate;
      
      await db.runTransaction(async t => {
        t.update(ref, {
          balance: admin.firestore.FieldValue.increment(earned),
          totalMinutes: admin.firestore.FieldValue.increment(allowed),
          todayPlayed: admin.firestore.FieldValue.increment(allowed),
          totalEarned: admin.firestore.FieldValue.increment(earned),
          gamesPlayed: admin.firestore.FieldValue.increment(1),
          xp: admin.firestore.FieldValue.increment(Math.floor(allowed * 5)),
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        t.set(db.collection('playSessions').doc(), {
          userId, minutes: allowed, earned, timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      res.json({ success: true, earned, allowedMinutes: allowed });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/users', async (req, res) => {
  if (!ADMIN_IDS.includes(req.query.userId)) return res.status(403).json({ error: 'Unauthorized' });
  const snap = await db.collection('users').limit(50).get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/admin/update-user',
  body('adminId').notEmpty(), body('targetUserId').notEmpty(),
  body('balance').optional().isFloat(), body('level').optional().isInt({ min: 1, max: 10 }),
  handleValidation,
  async (req, res) => {
    const { adminId, targetUserId, balance, level } = req.body;
    if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    const upd = {};
    if (balance !== undefined) upd.balance = +balance;
    if (level !== undefined) { upd.level = +level; upd.xp = Math.pow((level - 1) / 0.1, 2); }
    await db.collection('users').doc(targetUserId).update(upd);
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ======================== CRON ========================
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
cron.schedule('*/10 * * * *', async () => {
  try { await fetch(APP_URL); console.log('✅ Keep-alive'); } catch (e) {}
});
cron.schedule('0 0 * * *', async () => {
  const s = await db.collection('users').get();
  const b = db.batch();
  s.docs.forEach(d => b.update(d.ref, { todayPlayed: 0, lastReset: new Date().toISOString().split('T')[0] }));
  await b.commit();
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}`));
