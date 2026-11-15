import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.query?.token || '';
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  const { repo, gh_token } = req.query;
  if (!repo) {
    return res.status(400).json({ error: 'Missing repository parameter.' });
  }

  const masterGhToken = gh_token || process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Vercel-Fleet-Studio',
  };
  if (masterGhToken) {
    headers['Authorization'] = `Bearer ${masterGhToken}`;
  }

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=5`, { headers });
    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return res.status(ghRes.status).json({ error: `GitHub API error (${ghRes.status}): ${errText}` });
    }
    const data = await ghRes.json();
    return res.status(200).json({ workflow_runs: data.workflow_runs || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
