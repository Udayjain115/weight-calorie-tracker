import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { ObjectId } from 'mongodb';
import { createMockState } from '../src/data/mockData.js';
import { requireAuth, signToken } from './auth.js';
import { getDb } from './db.js';

const app = express();
const port = Number(process.env.PORT || 8787);

validateRequiredEnv();

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and an 8+ character password are required' });
  }

  try {
    const db = await getDb();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.collection('users').insertOne({
      email,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const user = { _id: result.insertedId, email };
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account already exists for that email' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Could not create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not log in' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.sub) });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: publicUser(user) });
});

app.get('/api/tracker-state', requireAuth, async (req, res) => {
  const db = await getDb();
  const record = await db.collection('trackerStates').findOne({ userId: req.user.sub });
  return res.json({ state: record?.state || null, updatedAt: record?.updatedAt || null });
});

app.put('/api/tracker-state', requireAuth, async (req, res) => {
  const state = sanitizeTrackerState(req.body.state);
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Tracker state is required' });
  }

  const db = await getDb();
  const updatedAt = new Date();
  await db.collection('trackerStates').updateOne(
    { userId: req.user.sub },
    {
      $set: {
        userId: req.user.sub,
        state,
        updatedAt,
      },
    },
    { upsert: true },
  );

  return res.json({ ok: true, updatedAt });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});

startServer();

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username || '',
  };
}

function sanitizeTrackerState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const { userId, ownerId, ...safeState } = state;
  return safeState;
}

function validateRequiredEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function corsOrigin(origin, callback) {
  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);
  if (allowedOrigins.length === 0 || !origin || allowedOrigins.includes(normalizeOrigin(origin))) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked origin: ${origin}`));
}

function parseAllowedOrigins(value = '') {
  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return origin.replace(/\/$/, '');
}

async function startServer() {
  await seedDemoAdmin();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

async function seedDemoAdmin() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_ADMIN !== 'true') {
    return;
  }

  const db = await getDb();
  const passwordHash = await bcrypt.hash('admin', 12);
  const now = new Date();
  const result = await db.collection('users').findOneAndUpdate(
    { username: 'admin' },
    {
      $set: {
        username: 'admin',
        email: 'admin@example.local',
        passwordHash,
        demo: true,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await db.collection('trackerStates').updateOne(
    { userId: result._id.toString() },
    {
      $set: {
        userId: result._id.toString(),
        state: createMockState(),
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}
