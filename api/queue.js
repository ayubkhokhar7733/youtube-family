import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

function normalizeChannelId(channelId) {
  if (!channelId) return '';
  return channelId.trim().toLowerCase().replace(/-/g, '_');
}

function getLocalQueue(channelId) {
  const norm = normalizeChannelId(channelId);
  const possibleDirs = [
    norm,
    norm.replace(/_/g, '-'),
    channelId
  ];

  for (const dir of possibleDirs) {
    const qPath = path.join(process.cwd(), 'channels', dir, 'queue.json');
    if (fs.existsSync(qPath)) {
      try {
        const content = fs.readFileSync(qPath, 'utf-8');
        return { path: qPath, queue: JSON.parse(content) };
      } catch (e) {
        // ignore parse error
      }
    }
  }

  // fallback default
  const defaultPath = path.join(process.cwd(), 'channels', norm, 'queue.json');
  return { path: defaultPath, queue: [] };
}

function saveLocalQueue(filePath, queue) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save local queue:', e);
    return false;
  }
}

// Fetch YouTube video metadata via fast public oEmbed
async function fetchYouTubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { headers: { 'User-Agent': 'Fleet-Studio-Queue' } });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || '',
        author_name: data.author_name || '',
        thumbnail_url: data.thumbnail_url || ''
      };
    }
  } catch (e) {
    // fallback
  }
  return null;
}

// Parse YouTube ID from various URL formats
function parseYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Fetch queue directly from GitHub repo if available
async function fetchGitHubQueue(repo, ghToken) {
  if (!repo || !ghToken) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/queue.json`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Fleet-Studio'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { sha: data.sha, queue: JSON.parse(content) };
    }
  } catch (e) {
    // fallback
  }
  return null;
}

// Sync queue back to GitHub repo
async function pushGitHubQueue(repo, queue, sha, ghToken, message = 'Update video queue') {
  if (!repo || !ghToken) return false;
  try {
    const contentBase64 = Buffer.from(JSON.stringify(queue, null, 2), 'utf-8').toString('base64');
    const body = {
      message,
      content: contentBase64,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/queue.json`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Fleet-Studio'
      },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to push queue to GitHub:', e);
    return false;
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.token || req.query?.token || '';
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in to view the queue.' });
  }

  // Load channels configuration
  let channels = [];
  try {
    const chPath = path.join(process.cwd(), 'channels.json');
    if (fs.existsSync(chPath)) {
      channels = JSON.parse(fs.readFileSync(chPath, 'utf-8')).channels || [];
    }
  } catch (e) {}

  if (req.method === 'GET') {
    const channelId = req.query.channel || (channels[0] ? channels[0].id : '');
    const normId = normalizeChannelId(channelId);

    // Permission check
    if (!user.isAdmin && !(user.channels && user.channels.includes('*'))) {
      if (!user.channels || (!user.channels.includes(normId) && !user.channels.includes(channelId))) {
        return res.status(403).json({ error: 'Not authorized for this channel queue.' });
      }
    }

    const channelMeta = channels.find(c => normalizeChannelId(c.id) === normId) || { id: channelId };
    const masterGhToken = req.query.gh_token || process.env.GITHUB_TOKEN;

    // Try GitHub first for fresh live cloud state, then local file
    let queue = null;
    if (channelMeta.repo && masterGhToken) {
      const ghData = await fetchGitHubQueue(channelMeta.repo, masterGhToken);
      if (ghData && Array.isArray(ghData.queue)) {
        queue = ghData.queue;
      }
    }

    if (!queue) {
      const local = getLocalQueue(channelId);
      queue = local.queue;
    }

    return res.status(200).json({
      channel: channelId,
      channel_name: channelMeta.name || channelId,
      queue: queue || []
    });
  }

  if (req.method === 'POST') {
    const { action, channel, gh_token } = req.body || {};
    const normId = normalizeChannelId(channel);

    // Permission check
    if (!user.isAdmin && !(user.channels && user.channels.includes('*'))) {
      if (!user.channels || (!user.channels.includes(normId) && !user.channels.includes(channel))) {
        return res.status(403).json({ error: 'Not authorized to modify this channel queue.' });
      }
    }

    const channelMeta = channels.find(c => normalizeChannelId(c.id) === normId) || { id: channel };
    const masterGhToken = gh_token || process.env.GITHUB_TOKEN;

    // Get current queue & file info
    let queue = [];
    let localInfo = getLocalQueue(channel);
    let ghSha = null;

    if (channelMeta.repo && masterGhToken) {
      const ghData = await fetchGitHubQueue(channelMeta.repo, masterGhToken);
      if (ghData && Array.isArray(ghData.queue)) {
        queue = ghData.queue;
        ghSha = ghData.sha;
      }
    }
    if (queue.length === 0 && localInfo.queue.length > 0) {
      queue = localInfo.queue;
    }

    // ACTION: Add single video to queue
    if (action === 'add') {
      const { url, title, duration } = req.body;
      if (!url) return res.status(400).json({ error: 'Missing YouTube URL' });

      const vidId = parseYouTubeId(url);
      if (!vidId) return res.status(400).json({ error: 'Invalid YouTube URL or ID' });

      // Check if already in queue
      const existing = queue.find(q => q.id === vidId || q.url === url);
      if (existing) {
        return res.status(200).json({
          message: 'Video already exists in queue',
          item: existing,
          queue
        });
      }

      // Fetch title via oEmbed if not provided
      let finalTitle = title;
      let finalThumb = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

      if (!finalTitle) {
        const oembed = await fetchYouTubeOEmbed(url);
        if (oembed && oembed.title) {
          finalTitle = oembed.title;
          if (oembed.thumbnail_url) finalThumb = oembed.thumbnail_url;
        } else {
          finalTitle = `Reference Video ${vidId}`;
        }
      }

      const durSec = parseInt(duration) || 0;
      const mins = Math.floor(durSec / 60);
      const secs = durSec % 60;
      const formatted = durSec > 0 ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : 'Auto';

      const newItem = {
        id: vidId,
        url: url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${vidId}`,
        title: finalTitle,
        duration: durSec,
        duration_formatted: formatted,
        thumbnail: finalThumb,
        status: 'queued',
        added_at: new Date().toISOString(),
        added_by: user.name || user.id
      };

      queue.push(newItem);

      // Save locally
      saveLocalQueue(localInfo.path, queue);

      // Sync to GitHub repo if token exists
      if (channelMeta.repo && masterGhToken) {
        await pushGitHubQueue(channelMeta.repo, queue, ghSha, masterGhToken, `Queue video: ${finalTitle}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Video added to queue',
        item: newItem,
        queue
      });
    }

    // ACTION: Trigger next queued video in channel
    if (action === 'trigger_next') {
      const nextItem = queue.find(q => q.status === 'queued');
      if (!nextItem) {
        return res.status(400).json({ error: 'No queued videos waiting in backlog.' });
      }

      if (!channelMeta.repo) {
        return res.status(400).json({ error: 'No repository configured for this channel.' });
      }

      if (!masterGhToken) {
        return res.status(400).json({ error: 'GitHub Token required to dispatch workflow.' });
      }

      // Dispatch repurpose.yml
      const ghUrl = `https://api.github.com/repos/${channelMeta.repo}/actions/workflows/${channelMeta.workflow || 'repurpose.yml'}/dispatches`;
      const scheduleHours = channelMeta.schedule_hours || 72;

      const ghRes = await fetch(ghUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${masterGhToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Fleet-Studio'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            youtube_url: nextItem.url,
            speaker_name: channelMeta.speaker || '',
            aspect: 'landscape',
            duration: '0',
            upload: 'true',
            privacy: 'scheduled',
            schedule_hours: String(scheduleHours)
          }
        })
      });

      if (!ghRes.ok) {
        const errText = await ghRes.text();
        return res.status(ghRes.status).json({ error: `GitHub Dispatch error (${ghRes.status}): ${errText}` });
      }

      // Mark as processing
      nextItem.status = 'processing';
      nextItem.dispatched_at = new Date().toISOString();
      nextItem.actions_url = `https://github.com/${channelMeta.repo}/actions`;

      // Save updated status
      saveLocalQueue(localInfo.path, queue);
      if (channelMeta.repo && masterGhToken) {
        await pushGitHubQueue(channelMeta.repo, queue, ghSha, masterGhToken, `Autopilot dispatched: ${nextItem.title}`);
      }

      return res.status(200).json({
        success: true,
        message: `Dispatched video: "${nextItem.title}" to GitHub Cloud Runner`,
        item: nextItem,
        actions_url: nextItem.actions_url,
        queue
      });
    }

    // ACTION: Update status or delete
    if (action === 'update_status') {
      const { id, status, published_video_url } = req.body;
      const target = queue.find(q => q.id === id);
      if (target) {
        target.status = status || target.status;
        if (published_video_url) target.published_video_url = published_video_url;
        if (status === 'completed') target.completed_at = new Date().toISOString();

        saveLocalQueue(localInfo.path, queue);
        if (channelMeta.repo && masterGhToken) {
          await pushGitHubQueue(channelMeta.repo, queue, ghSha, masterGhToken, `Update video status [${id}] -> ${status}`);
        }
      }
      return res.status(200).json({ success: true, queue });
    }

    if (action === 'delete') {
      const { id } = req.body;
      queue = queue.filter(q => q.id !== id);
      saveLocalQueue(localInfo.path, queue);
      if (channelMeta.repo && masterGhToken) {
        await pushGitHubQueue(channelMeta.repo, queue, ghSha, masterGhToken, `Remove video [${id}] from queue`);
      }
      return res.status(200).json({ success: true, queue });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
