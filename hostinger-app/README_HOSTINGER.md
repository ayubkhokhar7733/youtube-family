# Fleet Studio — Hostinger Deployment Guide

This package provides a secure, standalone multi-channel dashboard ready to run on any **Hostinger Shared, Cloud, or VPS hosting plan**.

---

## 🔒 Why This Fixes Privacy Completely
1. **100% Server-Side Protection:** Shafqat, Zahid, or your Brother physically **cannot** see each other's channel names, repos, or speakers even if they inspect browser code.
2. **Hidden GitHub Tokens:** Your GitHub Token stays on Hostinger. Your family members **never need to know what a GitHub token is**.
3. **1-Click Magic Login Links:** You can send each person a private link that signs them straight into their channel dashboard without entering passwords.

---

## 🚀 3-Minute Deployment Steps (Hostinger hPanel)

### Step 1: Upload the Files
1. Log in to **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Go to **Websites** ➔ **File Manager**.
3. Navigate to `public_html/` (or a subdomain folder like `public_html/studio/`).
4. Upload `fleet-studio-hostinger.zip` and click **Extract**.
   *(Or drag & drop all files inside `hostinger-app/` into that folder).*

### Step 2: Set Your GitHub Personal Access Token
1. In Hostinger File Manager, right-click `config.php` and click **Edit**.
2. Replace `'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'` on Line 9 with your GitHub Personal Access Token (classic or fine-grained with repo/workflow permissions).
3. Click **Save & Close**.

---

## 🔑 User Accounts & Magic Links

| User | Channel | Login Username / Passcode | 1-Click Magic Link (Auto-Signs In) |
| :--- | :--- | :--- | :--- |
| **Ayub (Fleet Admin)** | **All 6 Channels** | `admin` / `admin7733` | `https://yourdomain.com/?key=master-admin-fleet-key-7733` |
| **Shafqat Chadiyo** | **El Arte de la Psique 2.0** | `shafqat` / `arte2026` | `https://yourdomain.com/?key=shafqat-arte-psique-9281` |
| **Zahid Khurshid** | **Mejora Día a Día** | `zahid` / `mejora2026` | `https://yourdomain.com/?key=zahid-mejora-dia-4819` |
| **Brother** | **Hábitos de Acero** & **Stoic** | `brother` / `acero2026` | `https://yourdomain.com/?key=brother-habitos-stoic-1934` |
| **Nephew** | **Mente & Enfoque** | `nephew` / `enfoque2026` | `https://yourdomain.com/?key=nephew-mente-enfoque-6214` |

*(Replace `yourdomain.com` with your actual domain or subdomain on Hostinger. You can also customize passwords/PINs at any time inside `config.php`.)*
