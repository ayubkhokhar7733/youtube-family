# 🧭 PROJECT HANDOVER & OPERATIONAL HISTORY

> **Directory**: `D:\youtube-automation-flows\automation-family`  
> **Date**: November 8, 2026  
> **Primary Goal**: Multi-Channel YouTube Automation Fleet for Family & Friends (Nephew, Brother, Cousin) accessible from smartphones without requiring laptops or Git.

---

## 1. Executive Summary & Proven Formula

This project scales the exact viral automation architecture developed on the flagship channel **"Sabiduría Diaria"** (`@sabiduriadiaria-g6p`, ID: `UCq0BWajYtQ2_6uYFTXn6D3A`).

### Flagship Proven Growth Track Record (November 2026):
* **Subscribers**: Exploded from **23 to 609+ subscribers** (+2,500% surge).
* **Total Channel Views**: Climbed from **1,993 to 34,761+ views**.
* **Watch Time**: Exceeded **1,000+ hours** (25% on the roadmap to YPP monetization).
* **Top Performers**:
  * [`-Y5Ez53fG2A`](https://youtu.be/-Y5Ez53fG2A): **22,551 views** *(7 COSAS que TU CEREBRO necesita que guardes en secreto | Nazareth Castellanos)*
  * [`RobmVNXZDxc`](https://youtu.be/RobmVNXZDxc): **15,404 views** *(Lo que más protege TU CEREBRO en LA VEJEZ no es la compañía | Nazareth Castellanos)*

### The Non-Negotiable Algorithmic Golden Rules:
1. **Title Structure**: Always place the high-stakes curiosity hook first, followed by the authority speaker:
   `[High-Stakes Hook / Curiosity Gap] | [Authority Speaker Name]`
   *(Omitting the speaker name drops CTR by 80%).*
2. **Thumbnail Structure**:
   * Authentic photo of the recognized speaker looking directly into the camera lens with warm/confident expression.
   * 3-tier high-contrast text: Yellow/Gold brush banner hook + 3D bold white line + dark navy pill banner.
   * Prominent microphone authority badge (`DRA. NAZARETH CASTELLANOS`, `DRA. MARIAN ROJAS ESTAPÉ`).
3. **Release Rhythm**:
   * **72-hour / 3-day gap** (or 96-hour / 4-day gap).
   * Scheduled at **16:00 UTC (9:00 PM PKT / 5:00 PM Madrid)**.
   * Prevents video cannibalization and matches long-form neuroscience/psychology consumption.

---

## 2. Status of Flagship Workspace (`motivational-flow`)

> [!IMPORTANT]
> The directory `D:\youtube-automation-flows\motivational-flow` is **100% UNTOUCHED, ACTIVE, AND WORKING**. Do not modify it.

* **Video #6 (Live & Exploding)**: [`RobmVNXZDxc`](https://youtu.be/RobmVNXZDxc) at **15,404 views**.
* **Video #7 (Scheduled)**: [`zn-JZrk1UW0`](https://youtu.be/zn-JZrk1UW0) — *Descubre la FORTALEZA MENTAL al soltar lo incontrolable | Nazareth Castellanos* scheduled for **Nov 8 at 16:00 UTC (9:00 PM PKT)**.
* **Video #8 (Scheduled)**: [`0eYHEdny1nI`](https://youtu.be/0eYHEdny1nI) — *Tu CEREBRO cambiará para SIEMPRE | Nazareth Castellanos* scheduled for **Nov 11 at 16:00 UTC (9:00 PM PKT)**.

---

## 3. The New Multi-Channel System (`automation-family`)

This directory is an independent system built to let family members (nephews, brothers, cousins) manage their own automated channels directly from their **smartphones**.

### Core Architecture & Technical Stack:
* **UI**: Modern, dark-mode, mobile-responsive Web Dashboard (`index.html` + `app.js`) styled with TailwindCSS and Lucide icons.
* **Hosting**:
  * **Option A: Vercel** (`vercel.json` + serverless functions `api/trigger.js` & `api/channels.js`).
  * **Option B: GitHub Pages** (Static root `index.html` + `app.js` using browser `localStorage` for GitHub PAT).
  * **Option C: Local Python Server** (`server.py` on port 5000, accessible on home Wi-Fi from phones).
* **Quota Solution (Unlimited Free Minutes)**:
  * Private GitHub repos are capped at 2,000 minutes/month.
  * **Public GitHub repos receive 100% UNLIMITED FREE GitHub Actions minutes**.
  * Secrets (`YOUTUBE_REFRESH_TOKEN`, `GROQ_API_KEY`, etc.) remain **100% encrypted and private** in GitHub Secrets, even on public repos.
  * Workflow dispatch is restricted to repository owners/collaborators only.

---

## 4. File Manifest in `automation-family`

```text
D:\youtube-automation-flows\automation-family\
├── HANDOVER.md                   # This master context and history document
├── README.md                     # Comprehensive architecture and setup guide
├── channels.json                 # Central channel registry (Flagship, Nephew, Brother, Cousin)
├── index.html                    # Root web dashboard (for GitHub Pages deployment)
├── app.js                        # Root reactive dashboard client engine
├── server.py                     # Local & home Wi-Fi server (http://localhost:5000)
├── vercel.json                   # Vercel configuration for 1-click cloud deployment
├── public/
│   ├── index.html                # Vercel public directory entrypoint
│   └── app.js                    # Vercel public client script
├── api/
│   ├── trigger.js                # Serverless function to dispatch GitHub Actions workflows
│   └── channels.js               # Serverless function returning channels registry
└── scripts/
    └── create_family_repo.py     # Automated CLI provisioner to create new public channel repos
```

---

## 5. Channel Registry (`channels.json`)

The current pre-registered channel fleet:
1. **Flagship**: *Sabiduría Diaria* (`ayubkhokhar7733/youtube-motivational`) — Speaker: *Dra. Nazareth Castellanos* (Spanish, 72h gap).
2. **Nephew**: *Mente & Enfoque* (`ayubkhokhar7733/channel-mente-enfoque`) — Speaker: *Dra. Marian Rojas Estapé* (Spanish, 72h gap, Public Repo).
3. **Brother**: *The Stoic Frontier* (`ayubkhokhar7733/channel-stoic-frontier`) — Speaker: *Marcus Aurelius / Seneca* (English, 48h gap, Public Repo).
4. **Cousin**: *Hábitos de Acero* (`ayubkhokhar7733/channel-habitos-acero`) — Speaker: *Dr. Mario Alonso Puig* (Spanish, 72h gap, Public Repo).

---

## 6. Immediate Next Steps for the Next Conversation

When opening a new chat session scoped to `D:\youtube-automation-flows\automation-family`:

1. **Deploy the Dashboard Live**:
   * Either deploy to **Vercel** (`vercel`) or enable **GitHub Pages** so the nephew and family can open `https://family-fleet.vercel.app` on their phones.
2. **Provision Nephew's Channel**:
   * Run `python scripts/create_family_repo.py --repo channel-nephew-mente --owner "Nephew" --name "Mente & Enfoque" --speaker "Dra. Marian Rojas Estapé" --public`.
   * Add the nephew's Google OAuth refresh token to his repository secrets.
3. **Prepare First Video for Nephew**:
   * Select a winning competitor reference video for *Dra. Marian Rojas Estapé* (e.g. on cortisol, anxiety, or emotional intelligence).
   * Pre-cache audio, generate the matching thumbnail with her face, and launch via the mobile dashboard!
