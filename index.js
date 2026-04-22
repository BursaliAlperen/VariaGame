require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xssClean = require('xss-clean');
const compression = require('compression');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const admin = require('firebase-admin');
const { body, query, validationResult } = require('express-validator');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = process.env.APP_URL || 'https://variagame.onrender.com';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
const DAILY_LIMIT_MINUTES = 240;
const BASE_RATE = 0.001;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';

let db = null;

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  return next();
}

function calcEarned(minutes) {
  const cycles = Math.floor(minutes / 60);
  return Number((cycles * BASE_RATE).toFixed(6));
}

function verifyTelegramData(initData = '') {
  try {
    if (!BOT_TOKEN || !initData) return false;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    const pairs = [];
    for (const [key, value] of params.entries()) {
      if (key !== 'hash') pairs.push(`${key}=${value}`);
    }
    pairs.sort((a, b) => a.localeCompare(b));
    const dataCheckString = pairs.join('\n');

    const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const generated = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(hash));
  } catch (_) {
    return false;
  }
}

function parseTelegramUser(initData = '') {
  const params = new URLSearchParams(initData);
  const userRaw = params.get('user');
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return user?.id ? { ...user, id: String(user.id) } : null;
  } catch (_) {
    return null;
  }
}

function requireTelegramAuth(req, res, next) {
  const initData = req.body?.initData || req.query?.initData || req.headers['x-telegram-init-data'];
  if (!verifyTelegramData(initData)) {
    return res.status(401).json({ success: false, message: 'Invalid Telegram initData' });
  }
  const tgUser = parseTelegramUser(initData);
  if (!tgUser) return res.status(401).json({ success: false, message: 'Invalid Telegram user payload' });
  req.tgUser = tgUser;
  req.initData = initData;
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.tgUser || !ADMIN_IDS.includes(req.tgUser.id)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
}

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
  }
} catch (err) {
  db = null;
  console.error('Firebase init failed:', err.message);
}

async function ensureCollections() {
  if (!db) return;
  const names = ['users', 'referrals', 'playSessions', 'games', 'promoCodes', 'withdrawals'];
  for (const name of names) {
    await db.collection(name).doc('_meta').set({ initializedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
}
ensureCollections().catch(() => {});

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(session({ name: 'variagame.sid', secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(xssClean());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

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
      botUsername: process.env.BOT_USERNAME || '',
      baseRate: BASE_RATE,
      dailyLimitMinutes: DAILY_LIMIT_MINUTES
    }
  });
});

app.post('/api/me', requireTelegramAuth, async (req, res) => {
  const id = req.tgUser.id;
  let user = { userId: id, balance: 0, xp: 0, level: 1, todayPlayed: 0 };
  if (db) {
    const ref = db.collection('users').doc(id);
    const snap = await ref.get();
    if (snap.exists) user = { ...user, ...snap.data() };
    await ref.set({ userId: id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  return res.json({ success: true, data: { user, isAdmin: ADMIN_IDS.includes(id), tgUser: req.tgUser } });
});

app.post('/api/user/ref-link', [body('initData').isString().isLength({ min: 10 })], validate, requireTelegramAuth, async (req, res) => {
  const userId = req.tgUser.id;
  const refCode = `V${Buffer.from(userId).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
  const link = `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=${refCode}`;
  if (db) {
    await db.collection('referrals').doc(userId).set({ userId, refCode, link, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  return res.json({ success: true, data: { refCode, link } });
});

app.post('/api/referral/process', [
  body('initData').isString().isLength({ min: 10 }),
  body('refCode').isString().trim().isLength({ min: 3, max: 32 })
], validate, requireTelegramAuth, async (req, res) => {
  const userId = req.tgUser.id;
  const { refCode } = req.body;
  if (!db) return res.json({ success: true, data: { fallback: true } });

  const existing = await db.collection('referrals').doc(`${userId}_join`).get();
  if (existing.exists) return res.json({ success: true, data: { processed: false, reason: 'already_processed' } });

  const ownerSnap = await db.collection('referrals').where('refCode', '==', refCode).limit(1).get();
  if (ownerSnap.empty) return res.json({ success: true, data: { processed: false, reason: 'invalid_code' } });

  const owner = ownerSnap.docs[0].data();
  if (owner.userId === userId) return res.json({ success: true, data: { processed: false, reason: 'self_referral' } });

  const batch = db.batch();
  batch.set(db.collection('referrals').doc(`${userId}_join`), { userId, refCode, sourceUserId: owner.userId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.set(db.collection('users').doc(owner.userId), { balance: admin.firestore.FieldValue.increment(0.01), referralCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
  await batch.commit();

  return res.json({ success: true, data: { processed: true } });
});

app.post('/api/play-session', [
  body('initData').isString().isLength({ min: 10 }),
  body('gameId').isString().trim().isLength({ min: 1, max: 64 }),
  body('minutes').isInt({ min: 1, max: 240 }),
  body('isAfk').isBoolean(),
  body('isActive').isBoolean()
], validate, requireTelegramAuth, async (req, res) => {
  const userId = req.tgUser.id;
  const { gameId, minutes, isAfk, isActive } = req.body;
  if (isAfk || !isActive) return res.json({ success: true, data: { earned: 0, reason: 'inactive_or_afk' } });

  if (!db) return res.json({ success: true, data: { earned: calcEarned(minutes), fallback: true } });

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const user = userSnap.exists ? userSnap.data() : {};
  const todayPlayed = Number(user.todayPlayed || 0);
  const allowed = Math.max(0, Math.min(Number(minutes), DAILY_LIMIT_MINUTES - todayPlayed));
  const earned = calcEarned(allowed);

  const batch = db.batch();
  batch.set(userRef, {
    userId,
    balance: admin.firestore.FieldValue.increment(earned),
    xp: admin.firestore.FieldValue.increment(allowed * 2),
    totalPlayed: admin.firestore.FieldValue.increment(allowed),
    todayPlayed: admin.firestore.FieldValue.increment(allowed),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.collection('playSessions').doc(`${userId}_${Date.now()}`), {
    userId,
    gameId,
    minutes: allowed,
    earned,
    isAfk,
    isActive,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();

  return res.json({ success: true, data: { earned, minutesCounted: allowed, dailyLimit: DAILY_LIMIT_MINUTES } });
});

app.get('/api/admin/users', [query('initData').isString().isLength({ min: 10 })], validate, requireTelegramAuth, requireAdmin, async (req, res) => {
  if (!db) return res.json({ success: true, data: [] });
  const snap = await db.collection('users').limit(200).get();
  return res.json({ success: true, data: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
});

app.post('/api/admin/update-user', [
  body('initData').isString().isLength({ min: 10 }),
  body('targetUserId').isString().trim().isLength({ min: 1, max: 64 }),
  body('balance').optional().isFloat({ min: 0 }),
  body('level').optional().isInt({ min: 1, max: 999 }),
  body('notification').optional().isString().trim().isLength({ min: 1, max: 160 })
], validate, requireTelegramAuth, requireAdmin, async (req, res) => {
  const { targetUserId, balance, level, notification } = req.body;
  if (!db) return res.json({ success: true, data: { fallback: true } });

  const payload = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (typeof balance !== 'undefined') payload.balance = Number(balance);
  if (typeof level !== 'undefined') payload.level = Number(level);
  if (notification) payload.lastAdminNotification = notification;

  await db.collection('users').doc(targetUserId).set(payload, { merge: true });
  return res.json({ success: true, data: { updated: true } });
});

app.get('/api/health', (req, res) => res.json({ success: true, uptime: process.uptime(), timestamp: new Date().toISOString() }));

cron.schedule('*/10 * * * *', async () => {
  try { await fetch(`${APP_URL}/api/health`); } catch (_) {}
});

cron.schedule('0 0 * * *', async () => {
  if (!db) return;
  const snap = await db.collection('users').get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.set(doc.ref, { todayPlayed: 0 }, { merge: true }));
  await batch.commit();
}, { timezone: 'UTC' });

app.listen(PORT, () => console.log(`VariaGame server listening on ${PORT}`));
