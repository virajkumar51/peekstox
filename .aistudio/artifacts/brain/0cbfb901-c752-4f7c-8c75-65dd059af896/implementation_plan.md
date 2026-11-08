# Cloud Deployment & GitHub Live Updates Plan for PeekStox

Deploy PeekStox from GitHub to a full-stack cloud platform (Render, Railway, or Google Cloud Run) so live stock quotes, technical indicator feeds, and virtual portfolio simulations function seamlessly in production with automatic deployment on every `git push`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> GitHub itself is a source-code version control repository and does not host dynamic Node.js servers natively. Because PeekStox relies on its Express backend (`server.ts`) to fetch live Yahoo Finance feeds and compute technical indicators without CORS restrictions, it requires a full-stack Node.js host rather than static-only hosting (such as GitHub Pages).

- **Confirmed Decision**: Deploy PeekStox as a full-stack cloud application connected to GitHub, preserving all live financial data feeds, technical analysis calculations, and simulated trading.
- **Recommended Cloud Platform**: **Render** or **Railway** via direct GitHub integration (Zero-configuration Web Service, automatic SSL, free tier available, triggers live builds automatically whenever you push code).
- **Alternative Portable Container**: Include a production-grade multi-stage `Dockerfile` and `render.yaml` so the repository can also deploy immediately to Google Cloud Run, AWS App Runner, or DigitalOcean with zero manual configuration.

---

## 1. Overview & Core Concept

- **What It Delivers**: A production-ready GitHub repository configuration that allows pushing PeekStox to GitHub and automatically deploying it to the cloud. When deployed, the live web app maintains real-time stock prices, 252-day technical indicator series (RSI, MACD, SMA, Bollinger Bands), and continuous portfolio persistence.
- **Live Updates Behavior**:
  - **Code Updates**: Every `git push` to your GitHub `main` branch automatically triggers a build and deploys the new code version without downtime.
  - **Market Updates**: The deployed cloud server queries live financial markets on demand and serves real-time pricing and indicators to connected web and mobile users.
- **Target Experience**: Seamless 1-click or automated deployment where users never encounter CORS failures, missing indicator data, or broken API routes.

---

## 2. User Experience & Visual Design

- **Production Health Indicator**: The frontend header will display a subtle, elegant live market connection status badge indicating real-time feed latency and exchange connectivity.
- **Environment & Error Gracefulness**:
  - Transparent fallback from live Yahoo Finance quotes to simulated high-frequency ticks if external rate limits or market holidays occur.
  - Zero disruption to the existing dark glassmorphism theme, spatial tilt hero, interactive candlestick charts, and trading simulator dashboard.
- **Deployment Documentation**: A concise, copy-paste ready `DEPLOYMENT.md` guide added to the repository detailing exact steps for GitHub setup, environment variable configuration, and cloud platform linking.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Cloud Host vs. Static GitHub Pages**
  - *Chosen Approach*: Full-stack Node.js hosting (Render / Railway / Cloud Run).
  - *Why*: Yahoo Finance and external financial data providers prohibit direct browser requests via browser CORS policies. PeekStox's `server.ts` acts as an authorized server-side proxy and computes standard 252-day technical indicators. Static GitHub Pages cannot run Node.js and would fail to load live quotes.
  - *Alternatives Considered*: Client-only CORS proxies (unreliable, frequently blocked, rate-limited).
- **Decision 2: Automated Git Push Continuous Deployment (CI/CD)**
  - *Chosen Approach*: Native GitHub Webhook integration with cloud platforms, complemented by a `.github/workflows/ci.yml` action to test and lint before deployment.
  - *Why*: Guarantees that any code pushed to GitHub is automatically verified and published live within 2–3 minutes.
- **Decision 3: Production Server Packaging**
  - *Chosen Approach*: Build Vite frontend into static assets served directly by Express in production mode (`process.env.NODE_ENV === 'production'`), alongside a containerized Docker configuration.
  - *Why*: Single-port deployment (port 3000 / 8080) simplifies hosting costs and avoids multi-domain CORS hurdles.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Machine                        │
│                git push origin main                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                       │
│  - Automated GitHub Actions (lint & compile tests)          │
│  - Webhook triggers cloud deployment                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Cloud Hosting Service (Render / Railway)        │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  Express API Server   │◄─────►│ Yahoo Finance / BATS  │  │
│  │  (Port 3000 / $PORT)  │       │ Live Market Feeds     │  │
│  └───────────┬───────────┘       └───────────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌───────────────────────┐                                  │
│  │ Static Vite SPA Dist  │                                  │
│  │ React 19 Frontend     │                                  │
│  └───────────┬───────────┘                                  │
└──────────────┼──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│               End Users (Desktop, Mobile, Tablet)           │
│  - Live Stock Quotes & Sparklines                           │
│  - Technical Indicators (RSI, MACD, SMA, Bollinger)         │
│  - $100k Virtual Simulator & Order Execution                │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Action Items:
1. **Add Production Start Script & Port Binding**: Ensure `package.json` has `"build": "vite build"`, `"start": "tsx server.ts"`, and binds dynamically to cloud-assigned `process.env.PORT`.
2. **Add Multi-Platform Dockerfile**: Create an optimized container file supporting Google Cloud Run, AWS, and DigitalOcean.
3. **Add Render & Railway Blueprints**: Include `render.yaml` for instant 1-click cloud provisioning connected directly to GitHub.
4. **Add GitHub Actions Workflow**: Include `.github/workflows/ci.yml` to automatically validate linting, compilation, and simulator unit tests on every push.
5. **Add Clear Step-by-Step Guide**: Provide `DEPLOYMENT.md` with instructions on pushing to GitHub and connecting to free cloud hosting.
