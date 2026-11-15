import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.auth_token || req.query?.token || '';
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  const { repo, path: filePath, content: base64Content, message, gh_token } = req.body || {};

  if (!repo || !filePath || !base64Content) {
    return res.status(400).json({ error: 'Missing repo, path, or content.' });
  }

  // Permission check for user channels
  if (!user.isAdmin && !(user.channels && user.channels.includes('*'))) {
    try {
      const channelsPath = path.join(process.cwd(), 'channels.json');
      const data = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));
      const allowedChannels = (data.channels || []).filter(c => user.channels && user.channels.includes(c.id));
      const hasAccess = allowedChannels.some(c => c.repo.toLowerCase() === repo.toLowerCase());
      if (!hasAccess) {
        return res.status(403).json({ error: 'You are not authorized to upload to this channel.' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Permission check error.' });
    }
  }

  const masterGhToken = gh_token || process.env.GITHUB_TOKEN;
  if (!masterGhToken) {
    return res.status(400).json({ error: 'Server token not configured.' });
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${masterGhToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Fleet-Studio',
  };

  try {
    let sha = null;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }

    const payload = {
      message: message || `Upload ${filePath}`,
      content: base64Content,
      branch: 'main',
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(putRes.status).json({ error: `Upload error (${putRes.status}): ${errText}` });
    }

    return res.status(200).json({ success: true, path: filePath });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
