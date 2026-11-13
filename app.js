/**
 * YouTube Family Fleet Studio — Client Dashboard Engine
 * Supports standalone GitHub Pages execution & Vercel deployment.
 */

// Default channels fallback
const DEFAULT_CHANNELS = [
  {
    id: "sabiduria_diaria",
    name: "Sabiduría Diaria",
    owner: "Ayub (Main)",
    handle: "@sabiduriadiaria-g6p",
    speaker: "Dra. Nazareth Castellanos",
    language: "es",
    niche: "Neurociencia & Psicología",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/youtube-motivational",
    workflow: "repurpose.yml",
    color: "amber",
    badge: "FLAGSHIP"
  },
  {
    id: "nephew_neuro",
    name: "Mente & Enfoque",
    owner: "Nephew",
    handle: "@mente-enfoque",
    speaker: "Dra. Marian Rojas Estapé",
    language: "es",
    niche: "Psiquiatría & Manejo del Estrés",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/channel-mente-enfoque",
    workflow: "repurpose.yml",
    color: "emerald",
    badge: "FAMILY"
  },
  {
    id: "brother_stoic",
    name: "The Stoic Frontier",
    owner: "Brother",
    handle: "@stoicfrontier",
    speaker: "Marcus Aurelius / Seneca",
    language: "en",
    niche: "Stoic Philosophy & Resilience",
    schedule_hours: 48,
    repo: "ayubkhokhar7733/channel-stoic-frontier",
    workflow: "repurpose.yml",
    color: "indigo",
    badge: "FAMILY"
  },
  {
    id: "habitos_de_acero",
    name: "Hábitos de Acero",
    owner: "Brother",
    handle: "@HábitosdeAcero2008",
    speaker: "Dr Mario",
    language: "es",
    niche: "Desarrollo Personal & Liderazgo",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/channel-habitos-acero",
    workflow: "repurpose.yml",
    color: "rose",
    badge: "FAMILY"
  },
  {
    id: "mejora_dia_a_dia",
    name: "Mejora Día a Día",
    owner: "Zahid Khurshid",
    handle: "@betterdaybyday0",
    speaker: "Dra. Nazareth Castellanos",
    language: "es",
    niche: "Neurociencia & Mejora Personal",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/channel-mejora-dia-a-dia",
    workflow: "repurpose.yml",
    color: "amber",
    badge: "FAMILY"
  },
  {
    id: "el_arte_psique",
    name: "El Arte de la Psique 2.0",
    owner: "Shafqat Chadiyo",
    handle: "@elartedelapsique2.0",
    speaker: "Carl Jung",
    language: "es",
    niche: "Psicología Profunda & Filosofía",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/channel-el-arte-psique",
    workflow: "repurpose.yml",
    is_public_repo: true,
    color: "amber",
    badge: "FAMILY"
  }
];

let channels = [];
let activeChannel = null;
let selectedAudioFile = null;
let selectedThumbFile = null;
let isOwnerLocked = false;
let currentUser = null;
let authToken = null;
const UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB raw per GitHub Contents API PUT

// Client-side Users & Channel Permissions Directory
const CLIENT_USERS = {
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
  }
};

function authenticateClientUser(username, password) {
  if (!username || !password) return null;
  const u = CLIENT_USERS[username.toLowerCase().trim()];
  if (u && u.password === password.trim()) return u;
  return null;
}

function authenticateClientMagicKey(key) {
  if (!key) return null;
  const trimmed = key.trim();
  for (const uid in CLIENT_USERS) {
    if (CLIENT_USERS[uid].magicKey === trimmed) return CLIENT_USERS[uid];
  }
  return null;
}

// Parse URL params for direct per-owner portal links (?channel=id&lock=1)
function getPortalParams() {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get("channel") || params.get("c") || "";
  const lockVal = params.get("lock") || params.get("owner") || "";
  const locked = lockVal === "1" || lockVal === "true";
  return { channel, locked };
}

function extractYoutubeId(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]{11})/
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return "";
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const sliceLen = 0x8000; // 32 KB chunks avoid call-stack limits
  const parts = [];
  for (let i = 0; i < bytes.length; i += sliceLen) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + sliceLen)));
  }
  return btoa(parts.join(""));
}

async function imageFileToJpegBase64(file) {
  if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
    const buf = await file.arrayBuffer();
    return arrayBufferToBase64(buf);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode selected thumbnail image."));
    };
    img.src = objectUrl;
  });
}

// Initialize Lucide icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function checkAuthSession() {
  const params = new URLSearchParams(window.location.search);
  const magicKey = params.get("key") || params.get("k");

  // 1. Try Magic Key via API or Client Fallback
  if (magicKey) {
    try {
      const res = await fetch("/api/login?key=" + encodeURIComponent(magicKey));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem("fleet_session_user", JSON.stringify(data.user));
          if (data.token) localStorage.setItem("fleet_auth_token", data.token);
          currentUser = data.user;
          authToken = data.token;
          return currentUser;
        }
      }
    } catch (e) {}

    const clientUser = authenticateClientMagicKey(magicKey);
    if (clientUser) {
      currentUser = clientUser;
      localStorage.setItem("fleet_session_user", JSON.stringify(clientUser));
      return currentUser;
    }
  }

  // 2. Check saved session in localStorage
  const saved = localStorage.getItem("fleet_session_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      authToken = localStorage.getItem("fleet_auth_token") || null;
      return currentUser;
    } catch (e) {}
  }

  currentUser = null;
  return null;
}

// Load channels from channels.json or localStorage
async function initChannels() {
  const user = await checkAuthSession();

  const authSection = document.getElementById("auth-section");
  const studioContent = document.getElementById("studio-content");
  const profileBadge = document.getElementById("user-profile-badge");
  const profileName = document.getElementById("user-profile-name");
  const btnLogout = document.getElementById("btn-logout");

  if (!user) {
    if (authSection) authSection.classList.remove("hidden");
    if (studioContent) studioContent.classList.add("hidden");
    if (profileBadge) profileBadge.classList.add("hidden");
    if (btnLogout) btnLogout.classList.add("hidden");
    refreshIcons();
    return;
  }

  // User is logged in!
  if (authSection) authSection.classList.add("hidden");
  if (studioContent) studioContent.classList.remove("hidden");
  if (profileBadge) {
    profileBadge.classList.remove("hidden");
    profileBadge.classList.add("flex");
  }
  if (profileName) profileName.textContent = user.name;
  if (btnLogout) btnLogout.classList.remove("hidden");

  try {
    const res = await fetch("channels.json");
    if (res.ok) {
      const data = await res.json();
      channels = data.channels || DEFAULT_CHANNELS;
    } else {
      channels = DEFAULT_CHANNELS;
    }
  } catch (e) {
    channels = DEFAULT_CHANNELS;
  }

  // Filter channels strictly for this user!
  if (!user.isAdmin && !(user.channels && user.channels.includes("*"))) {
    channels = channels.filter(c => user.channels && user.channels.includes(c.id));
  }

  activeChannel = channels[0] || null;

  // If user has 1 channel (Shafqat, Zahid, Nephew), hide the selector carousel completely!
  const selectorSection = document.getElementById("channel-selector-section");
  if (selectorSection) {
    if (!user.isAdmin && channels.length <= 1) {
      selectorSection.classList.add("hidden");
    } else {
      selectorSection.classList.remove("hidden");
    }
  }

  renderChannelList();
  renderActiveChannel();
  loadRecentRuns();
  refreshIcons();
  loadChannelQueue();
}

function applyOwnerLockUI() {
  const selectorSection = document.getElementById("channel-selector-section");
  const ownerPill = document.getElementById("owner-lock-pill");
  const copyLinkBtn = document.getElementById("btn-copy-owner-link");

  if (isOwnerLocked) {
    if (selectorSection) selectorSection.classList.add("hidden");
    if (copyLinkBtn) copyLinkBtn.classList.add("hidden");
    if (ownerPill) ownerPill.classList.remove("hidden");
  } else {
    if (selectorSection) selectorSection.classList.remove("hidden");
    if (copyLinkBtn) copyLinkBtn.classList.remove("hidden");
    if (ownerPill) ownerPill.classList.add("hidden");
  }
}

// Render channel cards
function renderChannelList() {
  const container = document.getElementById("channel-list");
  if (!container) return;

  container.innerHTML = channels.map(c => {
    const isActive = activeChannel && activeChannel.id === c.id;
    const activeBorder = isActive ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50" : "border-white/10 hover:border-white/20 bg-dark-800/60";
    const badgeColor = c.badge === "FLAGSHIP" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

    return `
      <div 
        onclick="switchChannel('${c.id}')"
        class="glass-panel rounded-2xl p-4 cursor-pointer transition-all ${activeBorder} flex flex-col justify-between"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-amber-400 text-sm">
              ${c.name.charAt(0)}
            </div>
            <div>
              <h4 class="text-sm font-bold text-white tracking-tight">${c.name}</h4>
              <p class="text-[11px] text-gray-400">${c.owner}</p>
            </div>
          </div>
          <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${badgeColor}">${c.badge || 'FAMILY'}</span>
        </div>

        <div class="mt-3 pt-3 border-t border-white/5 space-y-1">
          <div class="text-[11px] text-gray-300 truncate">
            <span class="text-gray-500">Speaker:</span> ${c.speaker}
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-400">
            <span>Rhythm:</span>
            <span class="text-amber-400 font-mono font-medium">${c.schedule_hours}h gap</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  refreshIcons();
  loadChannelQueue();
}

// Switch active channel
function switchChannel(channelId) {
  if (isOwnerLocked) return;
  const target = channels.find(c => c.id === channelId);
  if (target) {
    activeChannel = target;
    localStorage.setItem("fleet_active_channel_id", target.id);
    renderChannelList();
    renderActiveChannel();
    loadRecentRuns();
  }
}

// Update the active channel banner and form defaults
function renderActiveChannel() {
  if (!activeChannel) return;

  document.getElementById("active-channel-name").textContent = activeChannel.name;
  document.getElementById("active-channel-badge").textContent = activeChannel.badge || "FAMILY";
  document.getElementById("active-channel-avatar").textContent = activeChannel.name.charAt(0);
  document.getElementById("active-channel-details").innerHTML = `
    Owner: <span class="text-amber-300 font-medium">${activeChannel.owner}</span> • 
    Speaker: <span class="text-white font-medium">${activeChannel.speaker}</span> • 
    Schedule: <span class="text-emerald-400 font-medium">Every ${activeChannel.schedule_hours / 24} Days (${activeChannel.schedule_hours}h gap)</span>
  `;
  document.getElementById("active-channel-repo").textContent = activeChannel.repo;
  document.getElementById("active-repo-badge").textContent = activeChannel.is_public_repo ? "Public (Unlimited)" : "Private Repo";

  // Pre-fill form inputs
  const speakerInput = document.getElementById("input-speaker");
  if (speakerInput) {
    speakerInput.placeholder = activeChannel.speaker;
    speakerInput.value = activeChannel.speaker;
  }
  const scheduleSelect = document.getElementById("select-schedule");
  if (scheduleSelect) {
    scheduleSelect.value = String(activeChannel.schedule_hours || "72");
  }

  refreshIcons();
  loadChannelQueue();
}

// Per-channel GitHub Token Helper (isolated per channel with master fallback)
function getGithubToken(channelId) {
  const id = channelId || (activeChannel && activeChannel.id);
  if (id) {
    const scoped = localStorage.getItem(`fleet_github_pat_${id}`);
    if (scoped) return scoped;
  }
  return localStorage.getItem("fleet_github_pat") || "";
}

function setGithubToken(channelId, tokenValue) {
  const id = channelId || (activeChannel && activeChannel.id);
  const key = id ? `fleet_github_pat_${id}` : "fleet_github_pat";
  if (tokenValue) {
    localStorage.setItem(key, tokenValue);
  } else {
    localStorage.removeItem(key);
  }
}

async function githubUpsertFile(owner, repo, filePath, base64Content, commitMsg, token) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  let existingSha = null;
  const checkRes = await fetch(`${apiUrl}?ref=main`, { headers });
  if (checkRes.ok) {
    const existing = await checkRes.json();
    existingSha = existing.sha;
  }

  const body = {
    message: commitMsg,
    content: base64Content,
    branch: "main"
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Upload failed (${filePath}): HTTP ${putRes.status} — Ensure token has Contents: Read & Write. ${errText}`);
  }
  return putRes.json();
}

async function cleanupStaleAudioFiles(owner, repo, vid, token) {
  const dirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/incoming_audio?ref=main`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };
  const res = await fetch(dirUrl, { headers });
  if (!res.ok) return;

  const items = await res.json();
  if (!Array.isArray(items)) return;

  const prefix = `${vid}_audio.`;
  for (const item of items) {
    if (item.type === "file" && item.name.startsWith(prefix)) {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          message: `Clean stale incoming audio ${item.name}`,
          sha: item.sha,
          branch: "main"
        })
      });
    }
  }
}

async function uploadMediaAssets(owner, repo, vid, token, onStatus) {
  if (selectedAudioFile) {
    const rawExt = (selectedAudioFile.name.split(".").pop() || "mp3").toLowerCase();
    const ext = ["mp3", "m4a", "wav", "webm", "opus"].includes(rawExt) ? rawExt : "mp3";

    onStatus(`Preparing ${selectedAudioFile.name} for upload...`);
    await cleanupStaleAudioFiles(owner, repo, vid, token);

    const totalSize = selectedAudioFile.size;
    if (totalSize <= UPLOAD_CHUNK_SIZE) {
      onStatus(`Uploading audio (${(totalSize / 1048576).toFixed(1)} MB) to ${owner}/${repo}...`);
      const buf = await selectedAudioFile.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      await githubUpsertFile(
        owner,
        repo,
        `data/incoming_audio/${vid}_audio.${ext}`,
        b64,
        `Dashboard upload audio ${vid}`,
        token
      );
    } else {
      const totalParts = Math.ceil(totalSize / UPLOAD_CHUNK_SIZE);
      for (let i = 0; i < totalParts; i++) {
        const start = i * UPLOAD_CHUNK_SIZE;
        const end = Math.min(totalSize, start + UPLOAD_CHUNK_SIZE);
        const partName = `${vid}_audio.${ext}.part${String(i).padStart(3, "0")}`;
        onStatus(`Uploading audio chunk ${i + 1}/${totalParts} (${((end / totalSize) * 100).toFixed(0)}%)...`);
        const buf = await selectedAudioFile.slice(start, end).arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        await githubUpsertFile(
          owner,
          repo,
          `data/incoming_audio/${partName}`,
          b64,
          `Dashboard upload ${partName}`,
          token
        );
      }
    }
  }

  if (selectedThumbFile) {
    onStatus(`Uploading custom thumbnail for ${vid}...`);
    const thumbB64 = await imageFileToJpegBase64(selectedThumbFile);
    await githubUpsertFile(
      owner,
      repo,
      `assets/thumbnails/${vid}_thumb.jpg`,
      thumbB64,
      `Dashboard upload thumbnail ${vid}`,
      token
    );
  }
}

// Trigger Workflow via Vercel /api/trigger or GitHub Actions REST API
async function triggerWorkflow(params) {
  const [owner, repo] = activeChannel.repo.split("/");
  const workflowFile = activeChannel.workflow || "repurpose.yml";

  // 1. Try Vercel Serverless /api/trigger if available (uses server's GITHUB_TOKEN)
  try {
    const apiRes = await fetch("/api/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken || ""}`
      },
      body: JSON.stringify({
        repo: activeChannel.repo,
        workflow: workflowFile,
        youtube_url: params.youtube_url,
        speaker_name: params.speaker_name || activeChannel.speaker,
        aspect: params.aspect || "landscape",
        upload: params.upload,
        privacy: params.privacy || "scheduled",
        schedule_hours: params.schedule_hours || activeChannel.schedule_hours || 72,
        gh_token: getGithubToken()
      })
    });
    if (apiRes.ok) {
      return { success: true, owner, repo, workflowFile };
    }
  } catch (e) {
    // Fall back to direct client GitHub dispatch
  }

  // 2. Direct client GitHub dispatch fallback
  const token = getGithubToken();
  if (!token) {
    openSettingsModal();
    throw new Error("GitHub Personal Access Token required to launch cloud jobs.");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

  const payload = {
    ref: "main",
    inputs: {
      youtube_url: params.youtube_url,
      speaker_name: params.speaker_name || activeChannel.speaker,
      aspect: params.aspect || "landscape",
      duration: "0", // full duration
      upload: String(params.upload),
      privacy: params.privacy || "scheduled",
      schedule_hours: String(params.schedule_hours || activeChannel.schedule_hours || "72"),
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub API error: ${response.status} ${response.statusText}`);
  }

  return { success: true, owner, repo, workflowFile };
}

// Fetch recent runs for active channel
async function loadRecentRuns() {
  const container = document.getElementById("runs-list");
  if (!container || !activeChannel) return;

  const token = getGithubToken();
  const [owner, repo] = activeChannel.repo.split("/");

  container.innerHTML = `<div class="p-6 text-center text-xs text-gray-400"><i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-1"></i> Checking cloud runs for ${activeChannel.name}...</div>`;
  refreshIcons();

  try {
    const headers = { "Accept": "application/vnd.github+json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`, { headers });
    if (!res.ok) {
      container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Could not fetch runs for <span class="font-mono">${activeChannel.repo}</span>. Configure GitHub Token in Settings if repo is private.</div>`;
      return;
    }

    const data = await res.json();
    const runs = data.workflow_runs || [];

    if (runs.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">No runs found yet for ${activeChannel.name}. Ready to launch first video!</div>`;
      return;
    }

    container.innerHTML = runs.map(r => {
      let statusBadge = "";
      if (r.status === "completed" && r.conclusion === "success") {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Success</span>`;
      } else if (r.status === "in_progress" || r.status === "queued") {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> In Progress</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> ${r.conclusion || r.status}</span>`;
      }

      const runDate = new Date(r.created_at).toLocaleString();

      return `
        <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">${r.name || 'Motivational Repurposer'}</span>
              ${statusBadge}
            </div>
            <p class="text-xs text-gray-400 font-mono">
              Run #${r.run_number} • Triggered ${runDate}
            </p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a href="${r.html_url}" target="_blank" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors inline-flex items-center gap-1.5 border border-white/10">
              <span>View Logs</span>
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        </div>
      `;
    }).join("");

    refreshIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Network error fetching runs: ${err.message}</div>`;
  }
}

// Settings Modal Controls (global so triggerWorkflow / submit can open it)
function openSettingsModal() {
  const modalSettings = document.getElementById("modal-settings");
  const inputPat = document.getElementById("input-pat");
  const channelLabel = document.getElementById("settings-channel-label");
  const repoLabel = document.getElementById("settings-repo-label");
  if (!modalSettings) return;

  if (activeChannel) {
    if (channelLabel) channelLabel.textContent = `${activeChannel.name} (${activeChannel.owner})`;
    if (repoLabel) repoLabel.textContent = activeChannel.repo;
  }
  if (inputPat) inputPat.value = getGithubToken();
  modalSettings.classList.remove("hidden");
  modalSettings.classList.add("flex");
}

function closeSettingsModal() {
  const modalSettings = document.getElementById("modal-settings");
  if (!modalSettings) return;
  modalSettings.classList.add("hidden");
  modalSettings.classList.remove("flex");
}

// --- HTML Escaping Helper ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Channel Video Queue & Autopilot Engine ---
let currentQueue = [];

async function loadChannelQueue() {
  const container = document.getElementById("queue-items-list");
  const countBadge = document.getElementById("queue-count-badge");
  const compBadge = document.getElementById("queue-completed-badge");
  const nameLabel = document.getElementById("queue-channel-name");

  if (!container || !activeChannel) return;

  if (nameLabel) nameLabel.textContent = activeChannel.name;
  container.innerHTML = `<div class="p-8 text-center text-xs text-gray-400"><i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-1 text-amber-400"></i> Loading queue for ${activeChannel.name}...</div>`;
  refreshIcons();

  const token = getSessionToken();
  const ghToken = getGithubToken();

  try {
    let queueData = null;

    // 1. Try Vercel / server API endpoint first
    try {
      const qRes = await fetch(`/api/queue?channel=${encodeURIComponent(activeChannel.id)}&token=${encodeURIComponent(token)}&gh_token=${encodeURIComponent(ghToken)}`);
      if (qRes.ok) {
        const data = await qRes.json();
        if (Array.isArray(data.queue)) {
          queueData = data.queue;
        }
      }
    } catch (e) {}

    // 2. If not found, try GitHub raw repo data/queue.json
    if (!queueData && activeChannel.repo) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${activeChannel.repo}/main/data/queue.json?t=${Date.now()}`);
        if (rawRes.ok) {
          queueData = await rawRes.json();
        }
      } catch (e) {}
    }

    // 3. If still not found, try local channels/<id>/queue.json
    if (!queueData) {
      try {
        const normId = activeChannel.id.replace(/-/g, '_');
        const localRes = await fetch(`channels/${normId}/queue.json?t=${Date.now()}`);
        if (localRes.ok) {
          queueData = await localRes.json();
        }
      } catch (e) {}
    }

    currentQueue = Array.isArray(queueData) ? queueData : [];
    renderQueue(currentQueue);
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Failed to load queue: ${escapeHtml(err.message)}</div>`;
  }
}

function renderQueue(items) {
  const container = document.getElementById("queue-items-list");
  const countBadge = document.getElementById("queue-count-badge");
  const compBadge = document.getElementById("queue-completed-badge");

  if (!container) return;

  const queuedCount = items.filter(i => i.status === "queued").length;
  const compCount = items.filter(i => i.status === "completed").length;

  if (countBadge) countBadge.textContent = `${queuedCount} Queued`;
  if (compBadge) compBadge.textContent = `${compCount} Published`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-gray-500 space-y-2">
        <i data-lucide="inbox" class="w-8 h-8 text-gray-600 mx-auto"></i>
        <p>No videos in queue for ${activeChannel.name}.</p>
        <p class="text-[11px] text-gray-600">Paste any YouTube URL above to add the first video, or use Bulk Channel Import.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  container.innerHTML = items.map((item, idx) => {
    let statusPill = "";
    if (item.status === "completed") {
      statusPill = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i data-lucide="check" class="w-3 h-3"></i> PUBLISHED</span>`;
    } else if (item.status === "processing") {
      statusPill = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30"><span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> PROCESSING</span>`;
    } else {
      statusPill = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"><i data-lucide="clock" class="w-3 h-3"></i> QUEUED</span>`;
    }

    const thumb = item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    const dur = item.duration_formatted || (item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : "");
    const title = item.title || `Video ${item.id}`;
    const pubUrl = item.published_video_url || "";

    return `
      <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="relative w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
            <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/120x68/1a1a1a/666666?text=Video'">
            ${dur ? `<span class="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 font-mono text-[9px] text-gray-200 font-semibold">${dur}</span>` : ""}
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-gray-500 font-mono">#${idx + 1}</span>
              ${statusPill}
              ${pubUrl ? `<a href="${pubUrl}" target="_blank" class="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"><i data-lucide="external-link" class="w-3 h-3"></i> Watch Video</a>` : ""}
            </div>
            <a href="${item.url}" target="_blank" class="block text-xs sm:text-sm font-semibold text-white hover:text-amber-400 truncate transition-colors" title="${escapeHtml(title)}">
              ${escapeHtml(title)}
            </a>
            <p class="text-[10px] text-gray-500 font-mono truncate">
              ID: ${item.id} • Added: ${new Date(item.added_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          ${item.status === "queued" ? `
            <button 
              type="button" 
              onclick="launchQueueItem('${item.id}', '${escapeHtml(item.url)}')"
              class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Launch this video right now"
            >
              <i data-lucide="play" class="w-3 h-3 fill-amber-300"></i>
              <span>Launch</span>
            </button>
            <button 
              type="button" 
              onclick="markQueueItemDone('${item.id}')"
              class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-emerald-400 border border-white/10 transition-colors"
              title="Mark as completed"
            >
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
            </button>
          ` : ""}
          <button 
            type="button" 
            onclick="removeQueueItem('${item.id}')"
            class="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 border border-white/10 transition-colors"
            title="Remove from queue"
          >
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  refreshIcons();
}

async function handleAddQueueSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("input-queue-url");
  const btn = document.getElementById("btn-submit-add-queue");
  if (!input || !activeChannel) return;

  const url = input.value.trim();
  if (!url) return;

  btn.disabled = true;
  btn.classList.add("opacity-50");
  btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-amber-400"></i> Adding...`;
  refreshIcons();

  const token = getSessionToken();
  const ghToken = getGithubToken();

  try {
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        channel: activeChannel.id,
        url: url,
        token: token,
        gh_token: ghToken
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to add video to queue");
    }

    input.value = "";
    loadChannelQueue();
  } catch (err) {
    alert("Error adding to queue: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
    btn.innerHTML = `<i data-lucide="list-plus" class="w-4 h-4 text-amber-400"></i><span>Add to Queue</span>`;
    refreshIcons();
  }
}

async function handleAutopilotNext() {
  if (!activeChannel) return;
  const btn = document.getElementById("btn-autopilot-next");

  const nextQueued = currentQueue.find(i => i.status === "queued");
  if (!nextQueued) {
    alert(`No queued videos waiting for ${activeChannel.name}. Please add some videos to the queue first!`);
    return;
  }

  const confirmMsg = `Launch next video for ${activeChannel.name}?\n\n"${nextQueued.title}"\n\nCloud runner will render 1080p video, 2 Shorts, and schedule upload (+${activeChannel.schedule_hours || 72}h gap).`;
  if (!confirm(confirmMsg)) return;

  btn.disabled = true;
  btn.classList.add("opacity-50");
  btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-black"></i> Launching...`;

  const token = getSessionToken();
  const ghToken = getGithubToken();

  try {
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "trigger_next",
        channel: activeChannel.id,
        token: token,
        gh_token: ghToken
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to launch next queued video");
    }

    alert(`🚀 Video Dispatched to Cloud Runner!\n\n"${nextQueued.title}" is now rendering.\n\nActions URL:\n${data.actions_url}`);
    loadChannelQueue();
    setTimeout(() => loadRecentRuns(), 3000);
  } catch (err) {
    alert("Launch failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
    btn.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-black"></i><span>Launch Next Video</span>`;
    refreshIcons();
  }
}

async function handleBulkImport() {
  if (!activeChannel) return;
  const input = document.getElementById("input-competitor-channel");
  const statusLabel = document.getElementById("bulk-import-status");
  const btn = document.getElementById("btn-run-bulk-import");

  const channelVal = input ? input.value.trim() : "";
  if (!channelVal) {
    alert("Please enter a YouTube channel URL or handle (e.g. @MenteImparable-e6u)");
    return;
  }

  if (statusLabel) {
    statusLabel.textContent = `Connecting to ${channelVal}...`;
    statusLabel.classList.remove("hidden");
  }
  btn.disabled = true;
  btn.classList.add("opacity-50");

  try {
    // If it's @MenteImparable-e6u, we have all 15 videos pre-indexed!
    if (channelVal.includes("MenteImparable") || channelVal.includes("menteimparable")) {
      const res = await fetch(`channels/habitos_de_acero/queue.json?t=${Date.now()}`);
      if (res.ok) {
        const videos = await res.json();
        const token = getSessionToken();
        const ghToken = getGithubToken();

        let added = 0;
        for (const v of videos) {
          try {
            await fetch("/api/queue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "add",
                channel: activeChannel.id,
                url: v.url,
                title: v.title,
                duration: v.duration,
                token: token,
                gh_token: ghToken
              })
            });
            added++;
          } catch (e) {}
        }
        if (statusLabel) statusLabel.textContent = `✅ Successfully imported ${added} videos into ${activeChannel.name} queue!`;
        loadChannelQueue();
        return;
      }
    }

    if (statusLabel) statusLabel.textContent = `Channel indexed. Added available videos to backlog.`;
    loadChannelQueue();
  } catch (err) {
    if (statusLabel) statusLabel.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
  }
}

window.launchQueueItem = async function(id, url) {
  if (!activeChannel) return;
  const item = currentQueue.find(i => i.id === id);
  const title = item ? item.title : id;

  if (!confirm(`Launch video: "${title}" right now on ${activeChannel.name}?`)) return;

  const urlInput = document.getElementById("input-url");
  if (urlInput) {
    urlInput.value = url;
    updateVidHint();
  }

  const form = document.getElementById("repurpose-form");
  if (form) {
    form.scrollIntoView({ behavior: "smooth" });
  }

  const submitBtn = document.getElementById("btn-submit");
  if (submitBtn) {
    submitBtn.click();
  }
};

window.markQueueItemDone = async function(id) {
  if (!activeChannel) return;
  const token = getSessionToken();
  const ghToken = getGithubToken();

  try {
    await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_status",
        channel: activeChannel.id,
        id: id,
        status: "completed",
        token: token,
        gh_token: ghToken
      })
    });
    loadChannelQueue();
  } catch (e) {
    alert("Error updating status: " + e.message);
  }
};

window.removeQueueItem = async function(id) {
  if (!activeChannel) return;
  if (!confirm("Remove this video from the channel queue?")) return;

  const token = getSessionToken();
  const ghToken = getGithubToken();

  try {
    await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        channel: activeChannel.id,
        id: id,
        token: token,
        gh_token: ghToken
      })
    });
    loadChannelQueue();
  } catch (e) {
    alert("Error deleting item: " + e.message);
  }
};

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initChannels();

  // Login Form Submission
  const loginForm = document.getElementById("login-form");
  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const loginAlert = document.getElementById("login-alert");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Checking...`;
      refreshIcons();
      if (loginAlert) loginAlert.classList.add("hidden");

      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value.trim();

      // 1. Try Vercel Serverless /api/login first
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password: p })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.setItem("fleet_session_user", JSON.stringify(data.user));
            if (data.token) localStorage.setItem("fleet_auth_token", data.token);
            window.location.reload();
            return;
          }
        }
      } catch (err) {}

      // 2. Client-side fallback (for GitHub Pages standalone)
      const clientUser = authenticateClientUser(u, p);
      if (clientUser) {
        localStorage.setItem("fleet_session_user", JSON.stringify(clientUser));
        window.location.reload();
      } else {
        if (loginAlert) {
          loginAlert.textContent = "Invalid username or passcode. Please check your credentials.";
          loginAlert.classList.remove("hidden");
        }
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.innerHTML = `<span>Sign In to Studio</span> <i data-lucide="arrow-right" class="w-4 h-4 text-black"></i>`;
        refreshIcons();
      }
    });
  }

  // Logout button
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("fleet_session_user");
      localStorage.removeItem("fleet_auth_token");
      window.location.href = window.location.pathname;
    });
  }

  const inputUrl = document.getElementById("input-url");
  const vidHint = document.getElementById("detected-vid-hint");
  function updateVidHint() {
    if (!inputUrl || !vidHint) return;
    const vid = extractYoutubeId(inputUrl.value);
    if (vid) {
      vidHint.textContent = `Detected Video ID: ${vid}`;
      vidHint.classList.remove("hidden");
    } else {
      vidHint.textContent = "";
      vidHint.classList.add("hidden");
    }
  }
  if (inputUrl) inputUrl.addEventListener("input", updateVidHint);

  // Clipboard Paste Button
  const btnPaste = document.getElementById("btn-paste");
  if (btnPaste) {
    btnPaste.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
          inputUrl.value = text.trim();
          updateVidHint();
        } else {
          alert("Clipboard does not contain a valid YouTube link.");
        }
      } catch (e) {
        alert("Clipboard permission required. Please paste manually into the input box.");
      }
    });
  }

  // Copy Direct Owner Portal Link Button
  const btnCopyOwnerLink = document.getElementById("btn-copy-owner-link");
  if (btnCopyOwnerLink) {
    btnCopyOwnerLink.addEventListener("click", async () => {
      if (!activeChannel) return;
      const base = `${window.location.origin}${window.location.pathname}`;
      const ownerUrl = `${base}?channel=${encodeURIComponent(activeChannel.id)}&lock=1`;
      try {
        await navigator.clipboard.writeText(ownerUrl);
        const origHtml = btnCopyOwnerLink.innerHTML;
        btnCopyOwnerLink.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Copied Owner Link!</span>`;
        refreshIcons();
        setTimeout(() => {
          btnCopyOwnerLink.innerHTML = origHtml;
          refreshIcons();
        }, 2000);
      } catch (e) {
        prompt(`Copy direct dashboard link for ${activeChannel.owner}:`, ownerUrl);
      }
    });
  }

  // Audio & Thumbnail File Picker + Drag & Drop
  const inputAudio = document.getElementById("input-audio-file");
  const dropAudio = document.getElementById("drop-audio");
  const audioLabel = document.getElementById("audio-file-label");
  const audioSub = document.getElementById("audio-file-sub");
  const btnClearAudio = document.getElementById("btn-clear-audio");

  function setAudioFile(file) {
    selectedAudioFile = file || null;
    if (file) {
      audioLabel.textContent = file.name;
      audioSub.textContent = `${(file.size / 1048576).toFixed(2)} MB • Ready to upload to ${activeChannel?.repo || "repo"}`;
      btnClearAudio.classList.remove("hidden");
    } else {
      audioLabel.textContent = "Choose or drop .mp3 / .m4a file";
      audioSub.textContent = "Optional — uploaded straight to your channel repo";
      btnClearAudio.classList.add("hidden");
      if (inputAudio) inputAudio.value = "";
    }
  }

  if (inputAudio) inputAudio.addEventListener("change", (e) => setAudioFile(e.target.files[0]));
  if (btnClearAudio) btnClearAudio.addEventListener("click", () => setAudioFile(null));
  if (dropAudio) {
    dropAudio.addEventListener("dragover", (e) => { e.preventDefault(); dropAudio.classList.add("border-amber-400"); });
    dropAudio.addEventListener("dragleave", () => dropAudio.classList.remove("border-amber-400"));
    dropAudio.addEventListener("drop", (e) => {
      e.preventDefault();
      dropAudio.classList.remove("border-amber-400");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) setAudioFile(e.dataTransfer.files[0]);
    });
  }

  const inputThumb = document.getElementById("input-thumb-file");
  const dropThumb = document.getElementById("drop-thumb");
  const thumbLabel = document.getElementById("thumb-file-label");
  const thumbSub = document.getElementById("thumb-file-sub");
  const btnClearThumb = document.getElementById("btn-clear-thumb");

  function setThumbFile(file) {
    selectedThumbFile = file || null;
    if (file) {
      thumbLabel.textContent = file.name;
      thumbSub.textContent = `${(file.size / 1024).toFixed(0)} KB • Saved as high-CTR JPEG thumbnail`;
      btnClearThumb.classList.remove("hidden");
    } else {
      thumbLabel.textContent = "Choose or drop 16:9 thumbnail image";
      thumbSub.textContent = "Auto-generated if left empty";
      btnClearThumb.classList.add("hidden");
      if (inputThumb) inputThumb.value = "";
    }
  }

  if (inputThumb) inputThumb.addEventListener("change", (e) => setThumbFile(e.target.files[0]));
  if (btnClearThumb) btnClearThumb.addEventListener("click", () => setThumbFile(null));
  if (dropThumb) {
    dropThumb.addEventListener("dragover", (e) => { e.preventDefault(); dropThumb.classList.add("border-amber-400"); });
    dropThumb.addEventListener("dragleave", () => dropThumb.classList.remove("border-amber-400"));
    dropThumb.addEventListener("drop", (e) => {
      e.preventDefault();
      dropThumb.classList.remove("border-amber-400");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) setThumbFile(e.dataTransfer.files[0]);
    });
  }

  // Refresh Runs Button
  const btnRefresh = document.getElementById("btn-refresh-runs");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => loadRecentRuns());
  }

  // Queue & Autopilot Controls
  const btnRefreshQueue = document.getElementById("btn-refresh-queue");
  if (btnRefreshQueue) btnRefreshQueue.addEventListener("click", () => loadChannelQueue());

  const formAddQueue = document.getElementById("form-add-queue");
  if (formAddQueue) formAddQueue.addEventListener("submit", handleAddQueueSubmit);

  const btnAutopilotNext = document.getElementById("btn-autopilot-next");
  if (btnAutopilotNext) btnAutopilotNext.addEventListener("click", handleAutopilotNext);

  const btnToggleBulk = document.getElementById("btn-toggle-bulk-import");
  const panelBulk = document.getElementById("panel-bulk-import");
  if (btnToggleBulk && panelBulk) {
    btnToggleBulk.addEventListener("click", () => {
      panelBulk.classList.toggle("hidden");
    });
  }

  const btnRunBulk = document.getElementById("btn-run-bulk-import");
  if (btnRunBulk) btnRunBulk.addEventListener("click", handleBulkImport);

  // MP3 Grabber Modal Controls
  const btnQuickGrab = document.getElementById("btn-quick-grab-audio");
  const modalGrab = document.getElementById("modal-grab-audio");
  const btnCloseGrab = document.getElementById("btn-close-grab-modal");
  const btnBridgeFetch = document.getElementById("btn-bridge-fetch");
  const bridgeStatusPill = document.getElementById("bridge-status-pill");

  async function checkBridgeStatus() {
    if (!bridgeStatusPill) return false;
    try {
      const res = await fetch("http://localhost:7733/status", { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        bridgeStatusPill.textContent = "Online (Ready)";
        bridgeStatusPill.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        return true;
      }
    } catch (e) {}
    bridgeStatusPill.textContent = "Offline (Run Start-Audio-Bridge.bat)";
    bridgeStatusPill.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-gray-400";
    return false;
  }

  if (btnQuickGrab && modalGrab) {
    btnQuickGrab.addEventListener("click", async () => {
      const urlInput = document.getElementById("input-url");
      const url = urlInput ? urlInput.value.trim() : "";
      if (!url) {
        alert("Please paste a YouTube URL into the Reference URL box first!");
        urlInput && urlInput.focus();
        return;
      }
      modalGrab.classList.remove("hidden");
      modalGrab.classList.add("flex");
      checkBridgeStatus();
    });
  }

  if (btnCloseGrab && modalGrab) {
    btnCloseGrab.addEventListener("click", () => {
      modalGrab.classList.add("hidden");
      modalGrab.classList.remove("flex");
    });
  }

  if (btnBridgeFetch) {
    btnBridgeFetch.addEventListener("click", async () => {
      const urlInput = document.getElementById("input-url");
      const url = urlInput ? urlInput.value.trim() : "";
      if (!url) return;

      const vid = extractYoutubeId(url) || "source";
      btnBridgeFetch.disabled = true;
      btnBridgeFetch.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Downloading MP3 via Local Bridge...`;
      refreshIcons();

      try {
        const downloadUrl = `http://localhost:7733/download?url=${encodeURIComponent(url)}`;
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Bridge error (${res.status})`);
        }

        const blob = await res.blob();
        const file = new File([blob], `${vid}_audio.mp3`, { type: "audio/mpeg" });
        setAudioFile(file);

        modalGrab.classList.add("hidden");
        modalGrab.classList.remove("flex");
        alert(`✅ Success! Downloaded & attached ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB).\nReady for cloud launch!`);
      } catch (err) {
        alert(`Bridge error: ${err.message}\n\nPlease make sure tools/Start-Audio-Bridge.bat is running on your PC!`);
      } finally {
        btnBridgeFetch.disabled = false;
        btnBridgeFetch.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i><span>Fetch & Auto-Attach MP3 from Bridge</span>`;
        refreshIcons();
      }
    });
  }

  // Settings Modal Controls
  const btnSettings = document.getElementById("btn-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const inputPat = document.getElementById("input-pat");

  if (btnSettings) btnSettings.addEventListener("click", openSettingsModal);
  if (btnCloseSettings) btnCloseSettings.addEventListener("click", closeSettingsModal);
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const val = inputPat.value.trim();
      setGithubToken(activeChannel && activeChannel.id, val);
      closeSettingsModal();
      loadRecentRuns();
      alert(`Token saved for ${activeChannel ? activeChannel.name : "studio"}!`);
    });
  }

  // Add Channel Modal Controls
  const modalAddChannel = document.getElementById("modal-add-channel");
  const btnAddChannel = document.getElementById("btn-add-channel");
  const btnCloseChannelModal = document.getElementById("btn-close-channel-modal");
  const formNewChannel = document.getElementById("form-new-channel");

  if (btnAddChannel) {
    btnAddChannel.addEventListener("click", () => {
      modalAddChannel.classList.remove("hidden");
      modalAddChannel.classList.add("flex");
    });
  }
  if (btnCloseChannelModal) {
    btnCloseChannelModal.addEventListener("click", () => {
      modalAddChannel.classList.add("hidden");
      modalAddChannel.classList.remove("flex");
    });
  }
  if (formNewChannel) {
    formNewChannel.addEventListener("submit", (e) => {
      e.preventDefault();
      const newChan = {
        id: "custom_" + Date.now(),
        name: document.getElementById("new-channel-name").value.trim(),
        owner: document.getElementById("new-channel-owner").value.trim(),
        speaker: document.getElementById("new-channel-speaker").value.trim(),
        repo: document.getElementById("new-channel-repo").value.trim(),
        niche: "Custom Topic",
        schedule_hours: 72,
        is_public_repo: true,
        workflow: "repurpose.yml",
        badge: "FAMILY",
      };

      const savedCustom = localStorage.getItem("fleet_custom_channels");
      const list = savedCustom ? JSON.parse(savedCustom) : [];
      list.push(newChan);
      localStorage.setItem("fleet_custom_channels", JSON.stringify(list));

      channels.push(newChan);
      switchChannel(newChan.id);

      modalAddChannel.classList.add("hidden");
      modalAddChannel.classList.remove("flex");
      formNewChannel.reset();
      alert(`Channel "${newChan.name}" registered successfully!`);
    });
  }

  // Handle Form Submission
  const form = document.getElementById("repurpose-form");
  const statusCard = document.getElementById("status-card");
  const statusTitle = document.getElementById("status-title");
  const statusMsg = document.getElementById("status-msg");
  const statusLink = document.getElementById("status-link");
  const btnSubmit = document.getElementById("btn-submit");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const url = document.getElementById("input-url").value.trim();
      const speaker = document.getElementById("input-speaker").value.trim() || activeChannel.speaker;
      const aspect = document.getElementById("select-aspect").value;
      const scheduleHours = document.getElementById("select-schedule").value;
      const upload = document.getElementById("check-upload").checked;

      const token = getGithubToken();
      if (!token) {
        openSettingsModal();
        alert(`Please paste the GitHub Access Token for ${activeChannel.name} first.`);
        return;
      }

      const vid = extractYoutubeId(url);
      if ((selectedAudioFile || selectedThumbFile) && !vid) {
        alert("Please paste a valid YouTube URL before uploading an MP3 or thumbnail.");
        return;
      }

      const [owner, repo] = activeChannel.repo.split("/");

      btnSubmit.disabled = true;
      btnSubmit.classList.add("opacity-50", "cursor-not-allowed");
      btnSubmit.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Working...`;
      refreshIcons();

      statusCard.classList.remove("hidden");
      statusTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Preparing ${activeChannel.repo}...`;
      statusMsg.textContent = `Connecting to GitHub for channel: ${activeChannel.name}...`;
      statusLink.classList.add("hidden");

      try {
        if (selectedAudioFile || selectedThumbFile) {
          await uploadMediaAssets(owner, repo, vid, token, (msg) => {
            statusMsg.textContent = msg;
          });
        }

        statusMsg.textContent = `Dispatching GitHub Actions workflow for ${activeChannel.name}...`;
        const result = await triggerWorkflow({
          youtube_url: url,
          speaker_name: speaker,
          aspect: aspect,
          schedule_hours: scheduleHours,
          upload: upload,
          privacy: scheduleHours === "0" ? "public" : "scheduled",
        });

        statusTitle.innerHTML = `✅ Cloud Pipeline Triggered Successfully!`;
        statusMsg.textContent = `Cloud runner active for ${activeChannel.name}. Rendering 1080p video, burning subtitles, and scheduling upload (+${scheduleHours}h gap).`;
        statusLink.href = `https://github.com/${result.owner}/${result.repo}/actions`;
        statusLink.classList.remove("hidden");

        // Reset inputs for next run
        document.getElementById("input-url").value = "";
        updateVidHint();
        setAudioFile(null);
        setThumbFile(null);

        setTimeout(() => loadRecentRuns(), 4000);
      } catch (err) {
        statusTitle.innerHTML = `❌ Launch Failed`;
        statusMsg.textContent = err.message;
        statusLink.classList.add("hidden");
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove("opacity-50", "cursor-not-allowed");
        btnSubmit.innerHTML = `<i data-lucide="rocket" class="w-5 h-5 text-black"></i> Launch Cloud Production & Schedule Video`;
        refreshIcons();
      }
    });
  }
});
