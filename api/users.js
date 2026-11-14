/**
 * Fleet Studio — User Directory & Channel Permissions
 * Defines who can access which channels on Vercel.
 */

export const USERS = {
  admin: {
    id: "admin",
    name: "Ayub (Fleet Admin)",
    password: "admin7733",
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
    password: "enfoque2026",
    magicKey: "nephew-mente-enfoque-6214",
    isAdmin: false,
    channels: ["nephew_neuro"]
  },
  irshad: {
    id: "irshad",
    name: "Jam Irshad",
    password: "libre2026",
    magicKey: "irshad-mente-libre-5192",
    isAdmin: false,
    channels: ["mente_libre"]
  }
};

export function authenticateUser(username, password) {
  if (!username || !password) return null;
  const user = USERS[username.toLowerCase().trim()];
  if (user && user.password === password.trim()) {
    return user;
  }
  return null;
}

export function authenticateMagicKey(key) {
  if (!key) return null;
  const trimmed = key.trim();
  for (const uid in USERS) {
    if (USERS[uid].magicKey === trimmed) {
      return USERS[uid];
    }
  }
  return null;
}
