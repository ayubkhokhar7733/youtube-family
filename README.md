# 🚀 YouTube Family & Friends Fleet Studio

A live, mobile-friendly multi-channel control center designed for family members, cousins, and friends who want automated YouTube channels **without needing a laptop, terminal, or git**.

---

## 🌟 Key Features

1. **Mobile-First 1-Tap Dashboard**:
   - Family members simply open the web link on their smartphone (iPhone/Android).
   - Tap their channel (e.g. *Mente & Enfoque*, *The Stoic Frontier*, *Sabiduría Diaria*).
   - Paste any winning reference YouTube link and tap **"Launch Cloud Production"**.

2. **Unlimited Free Rendering Minutes (Public Repos)**:
   - Private GitHub repos cap at 2,000 minutes/month.
   - Public GitHub repos provide **100% UNLIMITED FREE cloud runner minutes**.
   - Your API keys and YouTube OAuth tokens remain **100% private and encrypted** inside GitHub Secrets.

3. **Multi-Channel Architecture**:
   - Each channel has its own authority speaker, custom schedule rhythm (72h / 48h), and dedicated repo.
   - Videos are rendered in 1080p HD, subtitles are generated, thumbnails are attached, and videos are automatically **Scheduled** in YouTube Studio.

---

## 📱 How to Run the Dashboard

### Option 1: Live on Vercel (Recommended for Family Access)
1. Push this folder to a GitHub repository (e.g. `ayubkhokhar7733/family-fleet-studio`).
2. Go to [vercel.com](https://vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Select this repo.
3. In Vercel Environment Variables, add:
   - `GITHUB_TOKEN`: Your GitHub Personal Access Token (with `repo` & `workflow` scopes).
4. Click **Deploy**!
5. Send the generated link (`https://family-fleet.vercel.app`) to your nephew, brother, and cousins! They can bookmark it on their phones.

---

### Option 2: Live on GitHub Pages (Zero-Cost Static Hosting)
1. In your GitHub repo settings: **Settings** $\rightarrow$ **Pages** $\rightarrow$ Source: **Deploy from a branch** (`main` / root `/`).
2. Open the generated `https://ayubkhokhar7733.github.io/family-fleet-studio`.
3. In the dashboard top-right **Settings (⚙️)**, enter your GitHub Personal Access Token once. It stays saved securely in the browser.

---

### Option 3: Local Server (Test on your Computer or Home Wi-Fi)
1. Run:
   ```bash
   python server.py
   ```
2. Open on your PC: `http://localhost:5000`
3. Open on your phone: `http://<YOUR-PC-IP>:5000` (while connected to the same home Wi-Fi).

---

## 🛠️ Adding a New Channel for a Family Member (30 Seconds)

To set up a new channel for a cousin, brother, or friend:

```bash
python scripts/create_family_repo.py --repo channel-nephew-mente --owner "Nephew" --name "Mente & Enfoque" --speaker "Dra. Marian Rojas Estapé" --public
```

This creates the public repository on GitHub, sets up unlimited minutes, and registers the channel in `channels.json`.

---

## 🔒 Security Guarantee
- **Public Code $\neq$ Public Secrets**: GitHub Secrets (`YOUTUBE_REFRESH_TOKEN`, `GROQ_API_KEY`, etc.) are completely hidden and write-only. External users can never view or download them.
- **Permission Boundary**: Only the repository owner or approved collaborators can trigger `workflow_dispatch`. Internet strangers cannot run your workflows.
