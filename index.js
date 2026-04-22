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
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const rfs = require('rotating-file-stream');

// ======================== LOGLAMA ========================
const logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',
  path: logDirectory
});

// ======================== FIREBASE ========================
try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;
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

const app = express();

// ======================== TEMEL GÜVENLİK ========================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://www.gstatic.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
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

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'strict' }
}));

// NoSQL injection & XSS sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp()); // HTTP Parameter Pollution

// ======================== RATE LIMIT ========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many sensitive requests' }
});
app.use('/api/play-session', strictLimiter);
app.use('/api/withdrawal', strictLimiter);

// ======================== CSRF KORUMASI ========================
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), { httpOnly: false, secure: process.env.NODE_ENV === 'production' });
  next();
});

// API route'ları CSRF'den muaf tut (Telegram WebApp kendi güvenliğini sağlar)
const csrfExempt = (req, res, next) => next();

// ======================== YARDIMCILAR ========================
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'VariaGAME_bot';
const REF_BONUS = 0.015;
const BASE_RATE = 0.001;
const DAILY_LIMIT = 240;

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) {}
}

function generateRefCode(userId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '', hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.abs((hash >> (i * 4)) % chars.length));
  return result;
}

// ======================== STATIC ========================
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(mp4|webm|ogg)$/i)) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Güvenlik başlıkları
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
}));

// ======================== API ========================
app.get('/api/config', csrfExempt, (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || null,
    adminIds: ADMIN_IDS,
    botUsername: BOT_USERNAME,
    refBonus: REF_BONUS
  });
});

app.get('/api/user/ref-link',
  csrfExempt,
  query('userId').isString().notEmpty().trim().escape(),
  handleValidationErrors,
  async (req, res) => {
    const { userId } = req.query;
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      let refCode = userDoc.exists ? userDoc.data().refCode : null;
      if (!refCode) {
        refCode = generateRefCode(userId);
        await userRef.set({ refCode, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
      res.json({ success: true, refCode, refLink: `https://t.me/${BOT_USERNAME}?start=${refCode}` });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/referral/process',
  csrfExempt,
  body('newUserId').isString().notEmpty().trim().escape(),
  body('refCode').isString().notEmpty().trim().escape(),
  handleValidationErrors,
  async (req, res) => {
    const { newUserId, refCode } = req.body;
    try {
      const usersSnapshot = await db.collection('users').where('refCode', '==', refCode).limit(1).get();
      if (usersSnapshot.empty) return res.json({ success: false, message: 'Invalid referral code' });
      const referrerDoc = usersSnapshot.docs[0];
      const referrerId = referrerDoc.id;
      if (referrerId === newUserId) return res.json({ success: false, message: 'Cannot refer yourself' });
      
      const newUserRef = db.collection('users').doc(newUserId);
      const newUserDoc = await newUserRef.get();
      if (newUserDoc.exists && newUserDoc.data().referredBy) return res.json({ success: false, message: 'Already referred' });
      
      await db.runTransaction(async (t) => {
        t.set(newUserRef, {
          referredBy: referrerId,
          refCode: generateRefCode(newUserId),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        const referrerRef = db.collection('users').doc(referrerId);
        t.update(referrerRef, {
          balance: admin.firestore.FieldValue.increment(REF_BONUS),
          totalEarned: admin.firestore.FieldValue.increment(REF_BONUS),
          referralCount: admin.firestore.FieldValue.increment(1),
          referralEarnings: admin.firestore.FieldValue.increment(REF_BONUS),
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        t.set(db.collection('referrals').doc(), {
          referrerId, referredId: newUserId, bonusEarned: REF_BONUS,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      const referrerData = referrerDoc.data();
      if (referrerData.telegramId) await sendTelegramMessage(referrerData.telegramId, `🎉 Yeni davet! +$${REF_BONUS.toFixed(3)}`);
      res.json({ success: true, referrerId });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/play-session',
  csrfExempt,
  body('userId').isString().notEmpty().trim().escape(),
  body('minutes').isFloat({ min: 0.1, max: 240 }),
  body('gameTitle').optional().isString().trim().escape(),
  handleValidationErrors,
  async (req, res) => {
    const { userId, minutes, gameTitle } = req.body;
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      
      let userData = userDoc.data();
      const today = new Date().toISOString().split('T')[0];
      if (userData.lastReset !== today) {
        userData.todayPlayed = 0;
        userData.lastReset = today;
      }
      if (userData.todayPlayed >= DAILY_LIMIT) return res.status(400).json({ error: 'Daily limit exceeded' });
      
      const allowed = Math.min(minutes, DAILY_LIMIT - userData.todayPlayed);
      const rate = Math.min(BASE_RATE + ((userData.level || 1) - 1) * 0.000022, 0.003);
      const earned = allowed * rate;
      
      await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        t.update(userRef, {
          balance: admin.firestore.FieldValue.increment(earned),
          totalMinutes: admin.firestore.FieldValue.increment(allowed),
          todayPlayed: admin.firestore.FieldValue.increment(allowed),
          totalEarned: admin.firestore.FieldValue.increment(earned),
          gamesPlayed: admin.firestore.FieldValue.increment(1),
          xp: admin.firestore.FieldValue.increment(Math.floor(allowed * 5)),
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        t.set(db.collection('playSessions').doc(), {
          userId, minutes: allowed, earned, gameTitle: gameTitle || 'Unknown',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      res.json({ success: true, earned, allowedMinutes: allowed });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Admin API'leri
app.get('/api/admin/users', csrfProtection, async (req, res) => {
  const { userId } = req.query;
  if (!ADMIN_IDS.includes(userId)) return res.status(403).json({ error: 'Unauthorized' });
  const snapshot = await db.collection('users').limit(50).get();
  res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/admin/update-user', csrfProtection,
  body('adminId').isString().notEmpty(),
  body('targetUserId').isString().notEmpty(),
  body('balance').optional().isFloat({ min: 0 }),
  body('level').optional().isInt({ min: 1, max: 10 }),
  handleValidationErrors,
  async (req, res) => {
    const { adminId, targetUserId, balance, level } = req.body;
    if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    const update = { lastUpdate: admin.firestore.FieldValue.serverTimestamp() };
    if (balance !== undefined) update.balance = Number(balance);
    if (level !== undefined) { update.level = Number(level); update.xp = Math.pow((level - 1) / 0.1, 2); }
    await db.collection('users').doc(targetUserId).update(update);
    res.json({ success: true });
});

// ======================== ANA SAYFA & CRON ========================
app.get('/', csrfExempt, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

cron.schedule('*/10 * * * *', async () => {
  try { await fetch(process.env.APP_URL || 'http://localhost:3000'); } catch (e) {}
});
cron.schedule('0 0 * * *', async () => {
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { todayPlayed: 0, lastReset: new Date().toISOString().split('T')[0] }));
  await batch.commit().catch(() => {});
});

// ======================== HATA YÖNETİMİ ========================
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Güvenli sunucu ${PORT}`));
