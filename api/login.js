import fs from 'fs';
import path from 'path';
import { authenticateUser, authenticateMagicKey, USERS } from './users.js';

function getChannelsForUser(user) {
  try {
    const filePath = path.join(process.cwd(), 'channels.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const all = data.channels || [];

    if (user.isAdmin || (user.channels && user.channels.includes('*'))) {
      return all;
    }
    return all.filter(c => user.channels && user.channels.includes(c.id));
  } catch (e) {
    return [];
  }
}

export function createToken(userId) {
  const payload = {
    uid: userId,
    ts: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    if (data && data.uid && USERS[data.uid]) {
      return USERS[data.uid];
    }
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  // 1. Support Magic Key via GET (?key=...)
  if (req.method === 'GET') {
    const key = req.query.key || '';
    const user = authenticateMagicKey(key);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired magic login link.' });
    }
    const token = createToken(user.id);
    const channels = getChannelsForUser(user);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, isAdmin: user.isAdmin },
      channels
    });
  }

  // 2. Support Username + Password via POST
  if (req.method === 'POST') {
    const { username, password } = req.body || {};
    const user = authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or passcode.' });
    }
    const token = createToken(user.id);
    const channels = getChannelsForUser(user);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, isAdmin: user.isAdmin },
      channels
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
