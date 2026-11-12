import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const filePath = path.join(process.cwd(), 'channels.json');
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const channelsData = JSON.parse(fileData);
      return res.status(200).json(channelsData);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read channels.json: ' + err.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
