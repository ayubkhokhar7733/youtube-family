<?php
require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Check for 1-Click Magic Login Key in URL (?key=...)
$magic_key = trim($_GET['key'] ?? '');
if ($magic_key) {
    foreach ($USERS as $uid => $u) {
        if (!empty($u['magic_key']) && hash_equals($u['magic_key'], $magic_key)) {
            $_SESSION['user_id'] = $uid;
            header('Location: index.php');
            exit;
        }
    }
}

// 2. Identify Current User & Allowed Channels
$current_uid = $_SESSION['user_id'] ?? null;
$current_user = ($current_uid && isset($USERS[$current_uid])) ? array_merge(['id' => $current_uid], $USERS[$current_uid]) : null;

$allowed_channels = [];
if ($current_user) {
    if ($current_user['is_admin'] || in_array('*', $current_user['channels'], true)) {
        $allowed_channels = array_values($CHANNELS);
    } else {
        foreach ($current_user['channels'] as $cid) {
            if (isset($CHANNELS[$cid])) {
                $allowed_channels[] = $CHANNELS[$cid];
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fleet Studio — Cloud Repurposing Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            dark: {
              900: '#080a0f',
              800: '#0f131c',
              700: '#161b27',
              600: '#212838',
            },
            amber: {
              400: '#fbbf24',
              500: '#f59e0b',
              600: '#d97706',
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      background: radial-gradient(circle at 50% 0%, #151a28 0%, #080a0f 75%);
      min-height: 100vh;
    }
    .glass-panel {
      background: rgba(15, 19, 28, 0.75);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glow-gold {
      box-shadow: 0 0 35px -8px rgba(245, 158, 11, 0.22);
    }
  </style>
</head>
<body class="text-gray-100 font-sans antialiased selection:bg-amber-500/20 selection:text-amber-300">

<?php if (!$current_user): ?>
  <!-- ──────────────────────── LOGIN VIEW ──────────────────────── -->
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="glass-panel glow-gold rounded-3xl max-w-md w-full p-8 space-y-6 relative border border-white/10">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="shield-check" class="w-7 h-7"></i>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">Fleet Studio</h1>
        <p class="text-xs text-gray-400">Sign in to access your channel's cloud production suite</p>
      </div>

      <div id="login-alert" class="hidden rounded-xl p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium"></div>

      <form id="login-form" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Username</label>
          <input 
            type="text" 
            id="login-user" 
            required 
            placeholder="e.g. shafqat, zahid, brother, admin"
            class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 font-mono"
          >
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Password / PIN</label>
          <input 
            type="password" 
            id="login-pass" 
            required 
            placeholder="Enter your private passcode"
            class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400"
          >
        </div>

        <button 
          type="submit" 
          id="btn-login"
          class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>Sign In to Studio</span>
          <i data-lucide="arrow-right" class="w-4 h-4 text-black"></i>
        </button>
      </form>

      <div class="border-t border-white/5 pt-4 text-center">
        <p class="text-[11px] text-gray-500">Authorized personnel only. Protected by Hostinger Security.</p>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      lucide.createIcons();
      const form = document.getElementById("login-form");
      const btn = document.getElementById("btn-login");
      const alertBox = document.getElementById("login-alert");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Checking...`;
        lucide.createIcons();
        alertBox.classList.add("hidden");

        const formData = new FormData();
        formData.append("action", "login");
        formData.append("username", document.getElementById("login-user").value.trim());
        formData.append("password", document.getElementById("login-pass").value.trim());

        try {
          const res = await fetch("api.php", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && data.success) {
            window.location.reload();
          } else {
            alertBox.textContent = data.error || "Login failed.";
            alertBox.classList.remove("hidden");
          }
        } catch (err) {
          alertBox.textContent = "Network error connecting to Hostinger.";
          alertBox.classList.remove("hidden");
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<span>Sign In to Studio</span> <i data-lucide="arrow-right" class="w-4 h-4 text-black"></i>`;
          lucide.createIcons();
        }
      });
    });
  </script>

<?php else: ?>
  <!-- ──────────────────────── STUDIO DASHBOARD VIEW ──────────────────────── -->
  <header class="border-b border-white/10 glass-panel sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 text-lg">
          F
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-extrabold text-white tracking-tight">Fleet Studio</h1>
            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Hostinger Secure
            </span>
          </div>
          <p class="text-xs text-gray-400">Channel Owner: <span class="text-amber-300 font-semibold"><?= htmlspecialchars($current_user['name']) ?></span></p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button id="btn-logout" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors flex items-center gap-1.5">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

    <?php if (count($allowed_channels) > 1): ?>
      <!-- Channel Switcher (Only visible to Admin or users with multiple channels) -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <i data-lucide="layers" class="w-4 h-4 text-amber-400"></i>
          Your Channels
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <?php foreach ($allowed_channels as $idx => $c): ?>
            <div 
              onclick="selectChannel('<?= $c['id'] ?>')"
              id="chan-card-<?= $c['id'] ?>"
              class="chan-card glass-panel rounded-2xl p-4 cursor-pointer transition-all border <?= $idx === 0 ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20' ?> flex flex-col justify-between"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="text-sm font-bold text-white"><?= htmlspecialchars($c['name']) ?></h4>
                  <p class="text-[11px] text-gray-400"><?= htmlspecialchars($c['speaker']) ?></p>
                </div>
                <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-gray-300"><?= htmlspecialchars($c['badge'] ?? 'FAMILY') ?></span>
              </div>
              <div class="mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-400 flex justify-between">
                <span>Rhythm:</span>
                <span class="text-amber-400 font-mono"><?= $c['schedule_hours'] ?>h gap</span>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endif; ?>

    <!-- Active Channel Banner -->
    <section id="active-banner" class="glass-panel rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-amber-500">
      <div class="flex items-center gap-4">
        <div id="active-avatar" class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-extrabold text-2xl shrink-0">
          E
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h3 id="active-name" class="text-lg font-bold text-white">Loading...</h3>
            <span id="active-badge" class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">FAMILY</span>
          </div>
          <p id="active-sub" class="text-xs text-gray-400 mt-0.5"></p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-400 font-mono bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
        <i data-lucide="git-branch" class="w-3.5 h-3.5 text-amber-400"></i>
        <span id="active-repo">...</span>
      </div>
    </section>

    <!-- 1-Tap Video Repurposer Form -->
    <section class="glass-panel glow-gold rounded-3xl p-5 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden">
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
            <i data-lucide="sparkles" class="w-5 h-5 text-amber-400"></i>
            1-Tap Cloud Video Repurposer
          </h2>
          <p class="text-xs text-gray-400 mt-1">Paste the reference YouTube URL and optionally attach your downloaded MP3 audio + custom thumbnail image.</p>
        </div>
      </div>

      <form id="trigger-form" class="space-y-5">
        <input type="hidden" id="selected-channel-id" value="">

        <!-- URL Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">
            YouTube Reference Video URL <span class="text-rose-400">*</span>
          </label>
          <div class="relative">
            <input 
              type="url" 
              id="input-url" 
              required
              placeholder="https://www.youtube.com/watch?v=bF4_7wzVQdM" 
              class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3.5 pl-11 pr-20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
            >
            <i data-lucide="link" class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
            <button 
              type="button" 
              id="btn-paste"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300 flex items-center gap-1"
            >
              <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
              <span>Paste</span>
            </button>
          </div>
          <p id="vid-hint" class="hidden text-[11px] text-emerald-400 font-mono pl-1"></p>
        </div>

        <!-- Direct MP3 Audio & Thumbnail Uploaders -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
              <span>Upload MP3 Audio <span class="text-emerald-400 font-semibold normal-case">(Bypasses YT Blocks)</span></span>
              <button type="button" id="btn-clear-audio" class="hidden text-[11px] text-rose-400 hover:underline">Remove</button>
            </label>
            <label id="drop-audio" class="flex items-center gap-3 w-full bg-dark-900/70 hover:bg-dark-900 border border-dashed border-white/20 hover:border-amber-400/70 rounded-xl px-4 py-3 cursor-pointer transition-all">
              <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <i data-lucide="music" class="w-4 h-4 text-amber-400"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p id="audio-label" class="text-xs font-semibold text-gray-200 truncate">Choose or drop .mp3 file</p>
                <p id="audio-sub" class="text-[11px] text-gray-500 truncate">Streamed securely via Hostinger to GitHub</p>
              </div>
              <input type="file" id="input-audio" accept=".mp3,.m4a,.wav,.webm,.opus,audio/*" class="hidden">
            </label>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
              <span>Custom Thumbnail <span class="text-gray-500 font-normal normal-case">(Optional .jpg/.png)</span></span>
              <button type="button" id="btn-clear-thumb" class="hidden text-[11px] text-rose-400 hover:underline">Remove</button>
            </label>
            <label id="drop-thumb" class="flex items-center gap-3 w-full bg-dark-900/70 hover:bg-dark-900 border border-dashed border-white/20 hover:border-amber-400/70 rounded-xl px-4 py-3 cursor-pointer transition-all">
              <div class="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <i data-lucide="image" class="w-4 h-4 text-gray-300"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p id="thumb-label" class="text-xs font-semibold text-gray-200 truncate">Choose or drop 16:9 image</p>
                <p id="thumb-sub" class="text-[11px] text-gray-500 truncate">Auto-generated if left empty</p>
              </div>
              <input type="file" id="input-thumb" accept="image/jpeg,image/png,image/webp" class="hidden">
            </label>
          </div>
        </div>

        <!-- Speaker, Aspect, Schedule -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Authority Speaker</label>
            <input 
              type="text" 
              id="input-speaker" 
              class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
            >
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Video Aspect Ratio</label>
            <select 
              id="select-aspect" 
              class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="landscape" selected>16:9 Landscape (Full Video)</option>
              <option value="portrait">9:16 Portrait (Vertical Shorts)</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Publishing Schedule</label>
            <select 
              id="select-schedule" 
              class="w-full bg-dark-900/90 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="72" selected>⏰ Auto 3 Days (72h gap - Recommended)</option>
              <option value="96">⏰ Auto 4 Days (96h gap)</option>
              <option value="48">⏰ Auto 2 Days (48h gap)</option>
              <option value="0">⚡ Publish Immediately (Public)</option>
            </select>
          </div>
        </div>

        <!-- Launch Button -->
        <div class="pt-2">
          <button 
            type="submit" 
            id="btn-submit"
            class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-base tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all"
          >
            <i data-lucide="rocket" class="w-5 h-5 text-black"></i>
            <span>Launch Cloud Production & Schedule Video</span>
          </button>
        </div>
      </form>

      <!-- Status Alert Banner -->
      <div id="status-card" class="hidden rounded-2xl p-4 bg-dark-900/90 border border-white/10 space-y-2">
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-2 text-xs font-bold text-amber-400" id="status-title">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Launching Cloud Pipeline...
          </span>
          <a id="status-link" href="#" target="_blank" class="text-xs text-blue-400 hover:underline flex items-center gap-1">
            <span>View GitHub Actions Run</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>
        <p id="status-msg" class="text-xs text-gray-400 font-mono">Connecting to cloud infrastructure...</p>
      </div>
    </section>

    <!-- Recent Cloud Runs -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <i data-lucide="activity" class="w-4 h-4 text-emerald-400"></i>
          Live Production Pipeline Status
        </h2>
        <button id="btn-refresh-runs" class="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          <span>Refresh</span>
        </button>
      </div>

      <div class="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div id="runs-list" class="divide-y divide-white/5">
          <div class="p-6 text-center text-xs text-gray-400">Loading recent runs...</div>
        </div>
      </div>
    </section>

  </main>

  <script>
    const ALLOWED_CHANNELS = <?= json_encode($allowed_channels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
    let activeChannel = ALLOWED_CHANNELS[0] || null;

    function refreshIcons() {
      if (window.lucide) window.lucide.createIcons();
    }

    function selectChannel(cid) {
      const target = ALLOWED_CHANNELS.find(c => c.id === cid);
      if (target) {
        activeChannel = target;
        updateActiveUI();
        loadRuns();
      }
    }

    function updateActiveUI() {
      if (!activeChannel) return;
      document.getElementById("selected-channel-id").value = activeChannel.id;
      document.getElementById("active-name").textContent = activeChannel.name;
      document.getElementById("active-badge").textContent = activeChannel.badge || "FAMILY";
      document.getElementById("active-avatar").textContent = activeChannel.name.charAt(0);
      document.getElementById("active-sub").innerHTML = `
        Speaker: <span class="text-white font-medium">${activeChannel.speaker}</span> • 
        Schedule: <span class="text-emerald-400 font-medium">Every ${activeChannel.schedule_hours / 24} Days (${activeChannel.schedule_hours}h gap)</span>
      `;
      document.getElementById("active-repo").textContent = activeChannel.repo;
      document.getElementById("input-speaker").value = activeChannel.speaker;
      document.getElementById("select-schedule").value = String(activeChannel.schedule_hours || "72");

      document.querySelectorAll(".chan-card").forEach(el => {
        el.classList.remove("border-amber-500", "bg-amber-500/10");
        el.classList.add("border-white/10");
      });
      const card = document.getElementById("chan-card-" + activeChannel.id);
      if (card) {
        card.classList.add("border-amber-500", "bg-amber-500/10");
        card.classList.remove("border-white/10");
      }
      refreshIcons();
    }

    async function loadRuns() {
      const container = document.getElementById("runs-list");
      if (!container || !activeChannel) return;
      container.innerHTML = `<div class="p-6 text-center text-xs text-gray-400">Fetching live runs for ${activeChannel.name}...</div>`;

      try {
        const res = await fetch(`api.php?action=runs&channel_id=${encodeURIComponent(activeChannel.id)}`);
        const data = await res.json();
        const runs = data.runs || [];

        if (runs.length === 0) {
          container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">No runs recorded yet for this channel.</div>`;
          return;
        }

        container.innerHTML = runs.map(r => {
          const isSuccess = r.conclusion === "success";
          const isInProgress = r.status === "in_progress" || r.status === "queued";
          const icon = isSuccess ? "check-circle" : isInProgress ? "loader" : "alert-circle";
          const iconColor = isSuccess ? "text-emerald-400" : isInProgress ? "text-amber-400 animate-spin" : "text-rose-400";
          const badgeText = isSuccess ? "SUCCESS" : isInProgress ? "RUNNING" : (r.conclusion || r.status).toUpperCase();
          const badgeBg = isSuccess ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : isInProgress ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30";

          return `
            <div class="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
              <div class="flex items-center gap-3 min-w-0">
                <i data-lucide="${icon}" class="w-5 h-5 ${iconColor} shrink-0"></i>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-white truncate">${r.display_title || r.name}</p>
                  <p class="text-[11px] text-gray-400 font-mono">Run #${r.run_number} • ${new Date(r.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badgeBg}">${badgeText}</span>
                <a href="${r.html_url}" target="_blank" class="p-1 text-gray-400 hover:text-white transition-colors" title="View details on GitHub">
                  <i data-lucide="external-link" class="w-4 h-4"></i>
                </a>
              </div>
            </div>
          `;
        }).join("");
        refreshIcons();
      } catch (e) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-rose-400">Failed to load runs.</div>`;
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      updateActiveUI();
      loadRuns();

      // Logout button
      document.getElementById("btn-logout").addEventListener("click", async () => {
        await fetch("api.php?action=logout");
        window.location.reload();
      });

      // Refresh runs
      document.getElementById("btn-refresh-runs").addEventListener("click", loadRuns);

      // Paste button
      const inputUrl = document.getElementById("input-url");
      const vidHint = document.getElementById("vid-hint");

      function updateVid() {
        const val = inputUrl.value.trim();
        const m = val.match(/(?:[?&]v=|youtu\.be\/|\/(?:shorts|live|embed)\/)([a-zA-Z0-9_-]{11})/) || (val.length === 11 ? [null, val] : null);
        if (m && m[1]) {
          vidHint.textContent = `Detected Video ID: ${m[1]}`;
          vidHint.classList.remove("hidden");
        } else {
          vidHint.classList.add("hidden");
        }
      }
      inputUrl.addEventListener("input", updateVid);

      document.getElementById("btn-paste").addEventListener("click", async () => {
        try {
          const txt = await navigator.clipboard.readText();
          if (txt) {
            inputUrl.value = txt.trim();
            updateVid();
          }
        } catch (e) {
          alert("Paste manually into the box.");
        }
      });

      // File pickers
      const inputAudio = document.getElementById("input-audio");
      const audioLabel = document.getElementById("audio-label");
      const audioSub = document.getElementById("audio-sub");
      const btnClearAudio = document.getElementById("btn-clear-audio");

      inputAudio.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) {
          audioLabel.textContent = f.name;
          audioSub.textContent = `${(f.size / 1048576).toFixed(2)} MB • Ready to stream to Hostinger`;
          btnClearAudio.classList.remove("hidden");
        }
      });
      btnClearAudio.addEventListener("click", () => {
        inputAudio.value = "";
        audioLabel.textContent = "Choose or drop .mp3 file";
        audioSub.textContent = "Streamed securely via Hostinger to GitHub";
        btnClearAudio.classList.add("hidden");
      });

      const inputThumb = document.getElementById("input-thumb");
      const thumbLabel = document.getElementById("thumb-label");
      const thumbSub = document.getElementById("thumb-sub");
      const btnClearThumb = document.getElementById("btn-clear-thumb");

      inputThumb.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) {
          thumbLabel.textContent = f.name;
          thumbSub.textContent = `${(f.size / 1024).toFixed(0)} KB • Custom thumbnail`;
          btnClearThumb.classList.remove("hidden");
        }
      });
      btnClearThumb.addEventListener("click", () => {
        inputThumb.value = "";
        thumbLabel.textContent = "Choose or drop 16:9 image";
        thumbSub.textContent = "Auto-generated if left empty";
        btnClearThumb.classList.add("hidden");
      });

      // Form submission
      const form = document.getElementById("trigger-form");
      const btnSubmit = document.getElementById("btn-submit");
      const statusCard = document.getElementById("status-card");
      const statusTitle = document.getElementById("status-title");
      const statusMsg = document.getElementById("status-msg");
      const statusLink = document.getElementById("status-link");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnSubmit.classList.add("opacity-50", "cursor-not-allowed");
        btnSubmit.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Processing & Uploading...`;
        refreshIcons();

        statusCard.classList.remove("hidden");
        statusTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Uploading to ${activeChannel.name}...`;
        statusMsg.textContent = "Uploading audio/thumbnail and dispatching cloud runner...";
        statusLink.classList.add("hidden");

        const formData = new FormData();
        formData.append("action", "trigger");
        formData.append("channel_id", activeChannel.id);
        formData.append("youtube_url", inputUrl.value.trim());
        formData.append("speaker_name", document.getElementById("input-speaker").value.trim());
        formData.append("aspect", document.getElementById("select-aspect").value);
        formData.append("schedule_hours", document.getElementById("select-schedule").value);
        formData.append("upload", "true");

        if (inputAudio.files && inputAudio.files[0]) {
          formData.append("audio_file", inputAudio.files[0]);
        }
        if (inputThumb.files && inputThumb.files[0]) {
          formData.append("thumb_file", inputThumb.files[0]);
        }

        try {
          const res = await fetch("api.php", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && data.success) {
            statusTitle.innerHTML = `✅ Cloud Pipeline Triggered Successfully!`;
            statusMsg.textContent = `Job active for ${data.channel}. Video is rendering in the cloud!`;
            statusLink.href = data.actions;
            statusLink.classList.remove("hidden");

            // Reset form inputs
            inputUrl.value = "";
            vidHint.classList.add("hidden");
            btnClearAudio.click();
            btnClearThumb.click();

            setTimeout(loadRuns, 4000);
          } else {
            statusTitle.innerHTML = `❌ Launch Failed`;
            statusMsg.textContent = data.error || "Server error";
          }
        } catch (err) {
          statusTitle.innerHTML = `❌ Network Error`;
          statusMsg.textContent = err.message;
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.classList.remove("opacity-50", "cursor-not-allowed");
          btnSubmit.innerHTML = `<i data-lucide="rocket" class="w-5 h-5 text-black"></i> Launch Cloud Production & Schedule Video`;
          refreshIcons();
        }
      });
    });
  </script>
<?php endif; ?>

</body>
</html>
