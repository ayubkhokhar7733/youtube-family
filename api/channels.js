import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract auth token from header or query
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token || '';
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in to access your channel.' });
  }

  try {
    const filePath = path.join(process.cwd(), 'channels.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const all = data.channels || [];

    let allowed = all;
    if (!user.isAdmin && !(user.channels && user.channels.includes('*'))) {
      allowed = all.filter(c => user.channels && user.channels.includes(c.id));
    }

    return res.status(200).json({
      user: { id: user.id, name: user.name, isAdmin: user.isAdmin },
      channels: allowed
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read channels: ' + err.message });
  }
}
