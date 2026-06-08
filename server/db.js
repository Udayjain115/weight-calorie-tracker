import { MongoClient } from 'mongodb';

let client;
let db;

export async function getDb() {
  if (db) return db;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'workout_diet_tracker');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true });
  await db.collection('trackerStates').createIndex({ userId: 1 }, { unique: true });
  return db;
}
