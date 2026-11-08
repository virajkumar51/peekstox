# PeekStox Cloud Deployment & GitHub Setup Guide

This guide explains how **live updates** work with GitHub and details step-by-step instructions to host PeekStox on a cloud platform with full real-time stock market data.

---

## 1. How "Live Updates" Work With GitHub

- **GitHub as Source Repository**: GitHub is a code version control platform. It stores your commits, files, and branches. It does not run background processes or execute financial APIs by itself.
- **Why PeekStox Needs a Full-Stack Host**:
  - PeekStox is a **full-stack platform** with a Node.js/Express backend (`server.ts`) and a React 19 frontend.
  - The backend proxies live quotes from Yahoo Finance/BATS and calculates standard 252-day technical indicators (RSI, MACD, SMA 20/50/200, Bollinger Bands) without CORS blocking.
  - **Static hosting (like standard GitHub Pages) cannot run the Node server.**
  - **Cloud platforms (Render, Railway, Cloud Run)** run both the frontend and backend together.
- **Continuous Deployment (Auto Code Updates)**:
  - When you link your GitHub repository to Render or Railway, any `git push` automatically rebuilds and deploys your website in ~2 minutes with zero downtime.
  - Deployed visitors will always see **live stock prices, updated indicators, and working simulator trades**.

---

## 2. Step 1: Push Your Code to GitHub

Open your terminal in the PeekStox project root folder and run:

```bash
# 1. Initialize git (if not already done)
git init

# 2. Stage and commit all files
git add .
git commit -m "feat: PeekStox with dedicated Simulator tab and fixed technical indicators"

# 3. Rename branch to main
git branch -M main

# 4. Link your remote GitHub repository (replace with your repo URL)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git

# 5. Push code to GitHub
git push -u origin main
```

---

## 3. Step 2: Host With Live Market Prices (Recommended: Render — Free & Fast)

Render connects directly to your GitHub repo and provides free hosting for full-stack Node.js applications.

1. Sign up or log in at **[render.com](https://render.com)**.
2. Click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub account.
4. Select your **PeekStox** repository.
5. Render will automatically detect the settings from `render.yaml`, or you can verify:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Click **Create Web Service**.
7. Once deployed (typically 2–3 minutes), Render provides a live URL (e.g., `https://peekstox.onrender.com`).
8. **Result**: Your live app now serves real-time stock prices, 14-period RSI, MACD, Bollinger Bands, and the $100,000 virtual simulator. Any future `git push` to GitHub will automatically trigger a live update!

---

## 4. Alternative Cloud Hosts

### Option A: Vercel (Fastest & Easiest)
This repository is configured with `vercel.json` and `/api/index.ts`. Vercel automatically deploys the frontend as a high-speed CDN and mounts the Express backend as a serverless function!

1. Sign up or log in at **[vercel.com](https://vercel.com)**.
2. Click **Add New...** > **Project**.
3. Import your **PeekStox** GitHub repository.
4. Framework Preset will automatically detect **Vite**.
5. Click **Deploy**.
6. Within ~60 seconds, your website is live on a `.vercel.app` domain with full live stock quotes, technical indicators, and simulator! Every `git push` will deploy automatically.

### Option B: Railway (One-Click Auto-Deploy)
1. Go to **[railway.app](https://railway.app)**.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository. Railway automatically runs `npm install`, `npm run build`, and `npm start`.

### Option C: Google Cloud Run / Docker
A production `Dockerfile` is included in this repository.
```bash
# Build Docker image
docker build -t peekstox .

# Run locally or deploy to Google Cloud Run / AWS
docker run -p 3000:3000 peekstox
```

---

## 5. Summary of Live Capabilities in Cloud Production

| Feature | In Production on Cloud Host |
| :--- | :--- |
| **Real-time Stock Quotes** | Active (Proxied via Yahoo Finance/BATS on demand) |
| **S&P 500 Technical Indicators** | Active (252-day historical data: RSI 14, MACD, SMA, Bollinger) |
| **Stock Market Simulator** | Active ($100,000 USD virtual cash, market/limit orders, schedules) |
| **Automated Deployments** | Active (Triggers automatically on every `git push`) |
