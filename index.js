require('dotenv').config();

const path = require('path');
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
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const { body, query, validationResult } = require('express-validator');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
const DAILY_LIMIT_MINUTES = 240;
const BASE_RATE = 0.001;

let db = null;

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function nowTs() {
  return Date.now();
}

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
}

function calcEarned(minutes) {
  const cycles = Math.floor(minutes / 60);
  return Number((cycles * BASE_RATE).toFixed(6));
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
    console.log('Firebase Admin initialized.');
  } else {
    console.warn('Firebase Admin not initialized. Backend will operate in limited mode.');
  }
} catch (err) {
  console.error('Firebase Admin init failed:', err.message);
  db = null;
}

async function ensureCollections() {
  if (!db) return;
  const names = ['users', 'referrals', 'playSessions', 'games', 'promoCodes', 'withdrawals'];
  for (const name of names) {
    await db.collection(name).doc('_meta').set({ initializedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
}

ensureCollections().catch((e) => console.error('Collection bootstrap failed:', e.message));

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(session({
  name: 'variagame.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(mongoSanitize());
app.use(hpp());
app.use(xssClean());

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));
app.use('/api/play-session', rateLimit({ windowMs: 5 * 60 * 1000, max: 30 }));

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
      dailyLimitMinutes: DAILY_LIMIT_MINUTES,
      adminIds: ADMIN_IDS
    }
  });
});

app.get('/api/user/ref-link', [
  query('userId').isString().trim().isLength({ min: 1, max: 64 })
], validate, async (req, res) => {
  const { userId } = req.query;
  const refCode = `V${Buffer.from(userId).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
  const link = `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?start=${refCode}`;

  if (db) {
    await db.collection('referrals').doc(userId).set({ userId, refCode, link, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  return res.json({ success: true, data: { refCode, link } });
});

app.post('/api/referral/process', [
  body('userId').isString().trim().isLength({ min: 1, max: 64 }),
  body('refCode').isString().trim().isLength({ min: 3, max: 32 })
], validate, async (req, res) => {
  const { userId, refCode } = req.body;
  if (!db) return res.json({ success: true, data: { fallback: true } });

  const existing = await db.collection('referrals').where('userId', '==', userId).limit(1).get();
  if (!existing.empty) return res.json({ success: true, data: { processed: false, reason: 'already_processed' } });

  const ownerSnap = await db.collection('referrals').where('refCode', '==', refCode).limit(1).get();
  if (ownerSnap.empty) return res.json({ success: true, data: { processed: false, reason: 'invalid_code' } });

  const owner = ownerSnap.docs[0].data();
  if (owner.userId === userId) return res.json({ success: true, data: { processed: false, reason: 'self_referral' } });

  const batch = db.batch();
  batch.set(db.collection('referrals').doc(`${userId}_join`), {
    userId,
    refCode,
    sourceUserId: owner.userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.collection('users').doc(owner.userId), {
    balance: admin.firestore.FieldValue.increment(0.01),
    referralCount: admin.firestore.FieldValue.increment(1)
  }, { merge: true });
  await batch.commit();

  return res.json({ success: true, data: { processed: true } });
});

app.post('/api/play-session', [
  body('userId').isString().trim().isLength({ min: 1, max: 64 }),
  body('gameId').isString().trim().isLength({ min: 1, max: 64 }),
  body('minutes').isInt({ min: 1, max: 240 }),
  body('isAfk').isBoolean(),
  body('isActive').isBoolean()
], validate, async (req, res) => {
  const { userId, gameId, minutes, isAfk, isActive } = req.body;
  if (isAfk || !isActive) {
    return res.json({ success: true, data: { earned: 0, reason: 'inactive_or_afk' } });
  }

  if (!db) {
    return res.json({ success: true, data: { earned: calcEarned(minutes), fallback: true } });
  }

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
  batch.set(db.collection('playSessions').doc(`${userId}_${nowTs()}`), {
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

app.get('/api/admin/users', [
  query('adminId').isString().trim().isLength({ min: 1, max: 64 })
], validate, async (req, res) => {
  const { adminId } = req.query;
  if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ success: false, message: 'Forbidden' });
  if (!db) return res.json({ success: true, data: [] });

  const snap = await db.collection('users').limit(200).get();
  const users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.json({ success: true, data: users });
});

app.post('/api/admin/update-user', [
  body('adminId').isString().trim().isLength({ min: 1, max: 64 }),
  body('targetUserId').isString().trim().isLength({ min: 1, max: 64 }),
  body('balance').optional().isFloat({ min: 0 }),
  body('level').optional().isInt({ min: 1, max: 999 }),
  body('notification').optional().isString().trim().isLength({ min: 1, max: 160 })
], validate, async (req, res) => {
  const { adminId, targetUserId, balance, level, notification } = req.body;
  if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ success: false, message: 'Forbidden' });
  if (!db) return res.json({ success: true, data: { fallback: true } });

  const payload = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (typeof balance !== 'undefined') payload.balance = Number(balance);
  if (typeof level !== 'undefined') payload.level = Number(level);
  if (notification) payload.lastAdminNotification = notification;

  await db.collection('users').doc(targetUserId).set(payload, { merge: true });
  return res.json({ success: true, data: { updated: true } });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

cron.schedule('*/10 * * * *', async () => {
  try {
    await fetch(`${APP_URL}/api/health`, { timeout: 5000 });
    console.log('Keep-alive ping sent:', new Date().toISOString());
  } catch (err) {
    console.warn('Keep-alive ping failed:', err.message);
  }
});

cron.schedule('0 0 * * *', async () => {
  if (!db) return;
  try {
    const snap = await db.collection('users').get();
    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.set(doc.ref, { todayPlayed: 0 }, { merge: true });
    });
    await batch.commit();
    console.log('Daily reset completed at 00:00 server time.');
  } catch (err) {
    console.error('Daily reset failed:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`VariaGame server listening on ${PORT}`);
});
