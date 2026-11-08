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
    id: "cousin_mindset",
    name: "Hábitos de Acero",
    owner: "Cousin",
    handle: "@habitosdeacero",
    speaker: "Dr. Mario Alonso Puig",
    language: "es",
    niche: "Desarrollo Personal & Liderazgo",
    schedule_hours: 72,
    repo: "ayubkhokhar7733/channel-habitos-acero",
    workflow: "repurpose.yml",
    color: "rose",
    badge: "FAMILY"
  }
];

let channels = [];
let activeChannel = null;

// Initialize Lucide icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Load channels from channels.json or localStorage
async function initChannels() {
  try {
    const res = await fetch("channels.json");
    if (res.ok) {
      const data = await res.json();
      channels = data.channels || DEFAULT_CHANNELS;
    } else {
      channels = DEFAULT_CHANNELS;
    }
  } catch (e) {
    console.warn("Using default channels list:", e);
    channels = DEFAULT_CHANNELS;
  }

  // Merge any custom user channels from localStorage
  const savedCustom = localStorage.getItem("fleet_custom_channels");
  if (savedCustom) {
    try {
      const customList = JSON.parse(savedCustom);
      channels = [...channels, ...customList];
    } catch (e) {}
  }

  // Set active channel
  const savedActiveId = localStorage.getItem("fleet_active_channel_id");
  activeChannel = channels.find(c => c.id === savedActiveId) || channels[0];

  renderChannelList();
  renderActiveChannel();
  loadRecentRuns();
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
}

// Switch active channel
function switchChannel(channelId) {
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
    Speaker: <span class="text-white font-medium">${activeChannel.speaker}</span> • 
    Schedule: <span class="text-emerald-400 font-medium">Every ${activeChannel.schedule_hours / 24} Days (${activeChannel.schedule_hours}h gap)</span> • 
    Niche: <span class="text-gray-300">${activeChannel.niche}</span>
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
}

// GitHub API Client Helper
function getGithubToken() {
  return localStorage.getItem("fleet_github_pat") || "";
}

// Trigger Workflow via GitHub Actions REST API
async function triggerWorkflow(params) {
  const token = getGithubToken();
  if (!token) {
    openSettingsModal();
    throw new Error("GitHub Personal Access Token required to launch cloud jobs.");
  }

  const [owner, repo] = activeChannel.repo.split("/");
  const workflowFile = activeChannel.workflow || "repurpose.yml";
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

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initChannels();

  // Clipboard Paste Button
  const btnPaste = document.getElementById("btn-paste");
  if (btnPaste) {
    btnPaste.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.includes("youtube.com")) {
          document.getElementById("input-url").value = text.trim();
        } else {
          alert("Clipboard does not contain a valid YouTube link.");
        }
      } catch (e) {
        alert("Clipboard permission required. Please paste manually into the input box.");
      }
    });
  }

  // Refresh Runs Button
  const btnRefresh = document.getElementById("btn-refresh-runs");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => loadRecentRuns());
  }

  // Settings Modal Controls
  const modalSettings = document.getElementById("modal-settings");
  const btnSettings = document.getElementById("btn-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const inputPat = document.getElementById("input-pat");

  function openSettingsModal() {
    inputPat.value = getGithubToken();
    modalSettings.classList.remove("hidden");
    modalSettings.classList.add("flex");
  }

  function closeSettingsModal() {
    modalSettings.classList.add("hidden");
    modalSettings.classList.remove("flex");
  }

  if (btnSettings) btnSettings.addEventListener("click", openSettingsModal);
  if (btnCloseSettings) btnCloseSettings.addEventListener("click", closeSettingsModal);
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const val = inputPat.value.trim();
      localStorage.setItem("fleet_github_pat", val);
      closeSettingsModal();
      loadRecentRuns();
      alert("Settings saved successfully!");
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

      btnSubmit.disabled = true;
      btnSubmit.classList.add("opacity-50", "cursor-not-allowed");
      btnSubmit.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Dispatching Cloud Runner...`;
      refreshIcons();

      statusCard.classList.remove("hidden");
      statusTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Launching Cloud Pipeline on ${activeChannel.repo}...`;
      statusMsg.textContent = `Connecting to GitHub Actions for channel: ${activeChannel.name}...`;

      try {
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

        // Clear URL
        document.getElementById("input-url").value = "";

        // Reload runs in 5 seconds
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
