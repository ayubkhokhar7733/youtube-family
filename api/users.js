/**
 * Fleet Studio — User Directory, Permissions & Password Management
 * Supports dynamic user updates and persistent sync across Vercel and GitHub.
 */

import fs from 'fs';
import path from 'path';

export const DEFAULT_USERS = {
  admin: {
    id: "admin",
    name: "Ayub (Fleet Admin)",
    password: "Ayub@42004200",
    magicKey: "master-admin-fleet-key-7733",
    isAdmin: true,
    channels: ["*"]
  },
  shafqat: {
    id: "shafqat",
    name: "Shafqat Chadiyo",
    password: "arte2026",
    magicKey: "shafqat-arte-psique-9281",
    isAdmin: false,
    channels: ["el_arte_psique"]
  },
  zahid: {
    id: "zahid",
    name: "Zahid Khurshid",
    password: "mejora2026",
    magicKey: "zahid-mejora-dia-4819",
    isAdmin: false,
    channels: ["mejora_dia_a_dia"]
  },
  brother: {
    id: "brother",
    name: "Brother",
    password: "acero2026",
    magicKey: "brother-habitos-stoic-1934",
    isAdmin: false,
    channels: ["habitos_de_acero", "brother_stoic"]
  },
  nephew: {
    id: "nephew",
    name: "Nephew",
    password: "estoica2026",
    magicKey: "nephew-sabiduria-estoica-6214",
    isAdmin: false,
    channels: ["sabiduria_estoica"]
  },
  irshad: {
    id: "irshad",
    name: "Jam Irshad",
    password: "libre2026",
    magicKey: "irshad-mente-libre-5192",
    isAdmin: false,
    channels: ["mente_libre"]
  },
  zeeshan: {
    id: "zeeshan",
    name: "Zeeshan Mushir",
    password: "calma2026",
    magicKey: "zeeshan-mente-calma-8392",
    isAdmin: false,
    channels: ["mente_en_calma"]
  },
  sadiq: {
    id: "sadiq",
    name: "Muhammad Sadiq",
    password: "nilda2026",
    magicKey: "sadiq-nilda-inspira-7182",
    isAdmin: false,
    channels: ["nilda_inspira"]
  },
  waqar: {
    id: "waqar",
    name: "Waqar Chandiyo",
    password: "stoic2026",
    magicKey: "waqar-stoic-frontier-5819",
    isAdmin: false,
    channels: ["stoic_frontier"]
  }
};

let memoryUsers = null;

export function getUsersMap() {
  if (memoryUsers) return memoryUsers;
  try {
    const filePath = path.join(process.cwd(), 'users.json');
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      memoryUsers = { ...DEFAULT_USERS, ...parsed };
      return memoryUsers;
    }
  } catch (e) {
    console.error("Error reading users.json from disk:", e);
  }
  memoryUsers = { ...DEFAULT_USERS };
  return memoryUsers;
}

export async function saveUsersMap(newUsersMap, ghToken) {
  memoryUsers = { ...newUsersMap };

  // 1. Save to local disk if writable
  try {
    const filePath = path.join(process.cwd(), 'users.json');
    fs.writeFileSync(filePath, JSON.stringify(newUsersMap, null, 2), 'utf-8');
  } catch (e) {
    // Expected on read-only serverless platforms like Vercel
  }

  // 2. Commit users.json directly to GitHub repository to persist forever
  const masterGhToken = ghToken || process.env.GITHUB_TOKEN;
  if (masterGhToken) {
    try {
      const repo = 'ayubkhokhar7733/youtube-family';
      const apiUrl = `https://api.github.com/repos/${repo}/contents/users.json`;
      const headers = {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${masterGhToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Fleet-Studio-Auth'
      };

      let sha = null;
      const getRes = await fetch(apiUrl, { headers });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }

      const contentBase64 = Buffer.from(JSON.stringify(newUsersMap, null, 2), 'utf-8').toString('base64');
      const body = {
        message: 'Update user credentials & passwords [skip ci]',
        content: contentBase64,
        branch: 'main'
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      return putRes.ok;
    } catch (err) {
      console.error("Failed to commit users.json to GitHub:", err);
    }
  }
  return true;
}

export const USERS = new Proxy(DEFAULT_USERS, {
  get(target, prop) {
    const m = getUsersMap();
    return m[prop] !== undefined ? m[prop] : target[prop];
  },
  ownKeys() {
    return Object.keys(getUsersMap());
  },
  getOwnPropertyDescriptor(target, prop) {
    const m = getUsersMap();
    if (prop in m) {
      return { configurable: true, enumerable: true, value: m[prop], writable: true };
    }
    return undefined;
  }
});

export function authenticateUser(username, password) {
  if (!username || !password) return null;
  const users = getUsersMap();
  const user = users[username.toLowerCase().trim()];
  if (user && user.password === password.trim()) {
    return user;
  }
  return null;
}

export function authenticateMagicKey(key) {
  if (!key) return null;
  const trimmed = key.trim();
  const users = getUsersMap();
  for (const uid in users) {
    if (users[uid].magicKey === trimmed) {
      return users[uid];
    }
  }
  return null;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.body?.auth_token || req.query?.token || '';

  const { verifyToken } = await import('./login.js');
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  const usersMap = getUsersMap();

  // GET: Retrieve user profile(s)
  if (req.method === 'GET') {
    if (user.isAdmin) {
      // Admin sees member directory (passwords masked by default)
      const list = Object.values(usersMap).map(u => ({
        id: u.id,
        name: u.name,
        isAdmin: !!u.isAdmin,
        channels: u.channels || [],
        magicKey: u.magicKey || ""
      }));
      return res.status(200).json({ success: true, users: list, isAdmin: true });
    } else {
      // Non-admin ONLY sees their OWN profile! Zero access to others!
      const current = usersMap[user.id] || user;
      return res.status(200).json({
        success: true,
        user: {
          id: current.id,
          name: current.name,
          isAdmin: false,
          channels: current.channels || []
        },
        isAdmin: false
      });
    }
  }

  // POST / PUT: Change password or update profiles
  if (req.method === 'POST' || req.method === 'PUT') {
    const { action = 'change_password', current_password, new_password, name, target_user_id, gh_token } = req.body || {};

    if (action === 'change_password') {
      const targetId = (user.isAdmin && target_user_id) ? target_user_id.toLowerCase().trim() : user.id;
      const targetUser = usersMap[targetId];

      if (!targetUser) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      if (!new_password || new_password.trim().length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters.' });
      }

      // Non-admins MUST provide and verify their current password
      if (!user.isAdmin) {
        if (!current_password || current_password.trim() !== targetUser.password.trim()) {
          return res.status(400).json({ error: 'Current password is incorrect.' });
        }
      }

      // Apply new password
      targetUser.password = new_password.trim();
      if (name && typeof name === 'string' && name.trim()) {
        targetUser.name = name.trim();
      }
      usersMap[targetId] = targetUser;

      await saveUsersMap(usersMap, gh_token);

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully! Your new password is now active.',
        user: { id: targetUser.id, name: targetUser.name, isAdmin: targetUser.isAdmin }
      });
    }

    if (action === 'admin_save_all') {
      if (!user.isAdmin) {
        return res.status(403).json({ error: 'Only Admin can update all fleet profiles.' });
      }
      const { updated_users } = req.body || {};
      if (!updated_users || typeof updated_users !== 'object') {
        return res.status(400).json({ error: 'Missing updated_users object.' });
      }

      for (const uid in updated_users) {
        if (usersMap[uid]) {
          if (updated_users[uid].name) usersMap[uid].name = updated_users[uid].name.trim();
          if (updated_users[uid].password && updated_users[uid].password.trim().length >= 4) {
            usersMap[uid].password = updated_users[uid].password.trim();
          }
        }
      }

      await saveUsersMap(usersMap, gh_token);
      return res.status(200).json({ success: true, message: 'All user profiles updated successfully.' });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
