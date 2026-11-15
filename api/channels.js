import fs from 'fs';
import path from 'path';
import { verifyToken } from './login.js';

export default async function handler(req, res) {
  // Extract auth token from header or query
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token || req.body?.token || '';
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in to access your channel.' });
  }

  const filePath = path.join(process.cwd(), 'channels.json');

  if (req.method === 'GET') {
    try {
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

  // POST / PUT to update channel settings (Admin only, or channel owner for speaker)
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { channel_id, speaker, owner, role_label, schedule_hours } = req.body || {};
      if (!channel_id) {
        return res.status(400).json({ error: 'Missing channel_id.' });
      }

      // Read current channels
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const channel = (data.channels || []).find(c => c.id === channel_id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found.' });
      }

      // Only Admin or assigned user can edit
      const canEdit = user.isAdmin || (user.channels && (user.channels.includes('*') || user.channels.includes(channel_id)));
      if (!canEdit) {
        return res.status(403).json({ error: 'You are not authorized to update this channel.' });
      }

      // Update speaker
      if (typeof speaker === 'string' && speaker.trim()) {
        channel.speaker = speaker.trim();
      }

      // Updating relation/owner name requires Admin
      if (typeof owner === 'string' && owner.trim()) {
        if (!user.isAdmin) {
          return res.status(403).json({ error: 'Only administrators can change relation / owner names.' });
        }
        channel.owner = owner.trim();
      }

      if (schedule_hours) {
        channel.schedule_hours = Number(schedule_hours);
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

      return res.status(200).json({
        success: true,
        channel,
        message: 'Channel settings updated successfully.'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update channel: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
