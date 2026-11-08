export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repo, workflow = 'repurpose.yml', youtube_url, speaker_name, aspect = 'landscape', upload = true, privacy = 'scheduled', schedule_hours = 72, token } = req.body || {};

  const ghToken = token || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return res.status(400).json({ error: 'GitHub Token required to dispatch workflow.' });
  }

  if (!repo || !youtube_url) {
    return res.status(400).json({ error: 'Missing repository or YouTube URL.' });
  }

  const ghUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;

  try {
    const response = await fetch(ghUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
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

    return res.status(200).json({ success: true, message: 'Workflow dispatched successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
