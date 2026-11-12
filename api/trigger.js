import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

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

  const { repo, workflow = 'repurpose.yml', youtube_url, speaker_name, aspect = 'landscape', upload = true, privacy = 'scheduled', schedule_hours = 72, gh_token } = req.body || {};

  if (!repo || !youtube_url) {
    return res.status(400).json({ error: 'Missing repository or YouTube URL.' });
  }

  // Verify the user is authorized for this repository
  if (!user.isAdmin && !(user.channels && user.channels.includes('*'))) {
    try {
      const filePath = path.join(process.cwd(), 'channels.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const allowedChannels = (data.channels || []).filter(c => user.channels && user.channels.includes(c.id));
      const hasAccess = allowedChannels.some(c => c.repo.toLowerCase() === repo.toLowerCase());
      if (!hasAccess) {
        return res.status(403).json({ error: 'You are not authorized to trigger this channel.' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Permission check error.' });
    }
  }

  const masterGhToken = gh_token || process.env.GITHUB_TOKEN;
  if (!masterGhToken) {
    return res.status(400).json({ error: 'GitHub Token required on server or in request.' });
  }

  const ghUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;

  try {
    const response = await fetch(ghUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${masterGhToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Fleet-Studio',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          youtube_url,
          speaker_name: speaker_name || '',
          aspect,
          duration: '0',
          upload: String(upload),
          privacy,
          schedule_hours: String(schedule_hours),
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `GitHub API error (${response.status}): ${errText}` });
    }

    return res.status(200).json({
      success: true,
      repo,
      actionsUrl: `https://github.com/${repo}/actions`,
      message: 'Workflow dispatched successfully.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
