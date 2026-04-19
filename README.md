# AtomR

> A turn-based AtomR board game — play locally, online, or against AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Convex](https://img.shields.io/badge/Backend-Convex-ee342f)](https://convex.dev/)

---

## Features

| Feature | Description |
|---|---|
| 🎮 **Local pass-and-play** | Two or more players share one device |
| 🌐 **Online multiplayer** | Matchmaking and private rooms |
| 🤖 **AI opponents** | CPU play and AI vs AI battle simulation |
| 🧠 **Training mode** | Real-time AI move suggestions while you play |

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS 4 |
| Routing / SSR | TanStack Start + TanStack Router |
| Backend / DB | Convex |
| Auth | Better Auth |
| Testing | Vitest |
| Linting | Biome |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- A [Convex](https://convex.dev/) account (free tier is fine)

### Installation

```bash
git clone https://github.com/tnfssc/atomr.git
cd atomr
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (see [Environment](#environment) below), then:

```bash
pnpm dev
```

This starts both servers concurrently:

- **App** → `http://localhost:3000`
- **Convex dev loop** → real-time backend sync

> [!NOTE]
> On the very first run, the Convex CLI may prompt you to create or select a dev deployment.

## Environment

### App / Vite variables (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_CONVEX_URL` | ✅ | Convex deployment URL |
| `VITE_CONVEX_SITE_URL` | ✅ | Convex HTTP site URL |
| `SITE_URL` | ✅ | Local or deployed app URL |
| `VITE_POSTHOG_KEY` | ☑️ optional | PostHog analytics key |
| `VITE_POSTHOG_HOST` | ☑️ optional | PostHog host |

### Convex deployment variables

These must also be set **inside your Convex deployment** (not just in `.env.local`):

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | Random secret for Better Auth |
| `BETTER_AUTH_URL` / `SITE_URL` | Canonical app URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CONVEX_SITE_URL` | Convex HTTP site URL |
| `CONVEX_CLOUD_URL` | Convex cloud URL |
| `TRUSTED_ORIGINS` | Comma-separated list of trusted origins |

Set them via the Convex CLI:

```bash
npx convex env set BETTER_AUTH_SECRET <value>
npx convex env set GOOGLE_CLIENT_ID   <value>
npx convex env set GOOGLE_CLIENT_SECRET <value>
# … and so on
```

## Scripts

```bash
pnpm dev          # start app + Convex dev loop
pnpm build        # production build
pnpm test         # run Vitest suite
pnpm typecheck    # tsc type-check
pnpm check        # Biome lint + format check
pnpm storybook    # component explorer on :6006
```

## Deployment

| Part | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com/) |
| Backend / Auth | [Convex](https://convex.dev/) |

A GitHub Actions workflow automatically deploys Convex on every push to `develop`. It requires a `CONVEX_DEPLOY_KEY` secret in the repository settings.

**Pre-launch checklist:**

- [ ] `SITE_URL` / `BETTER_AUTH_URL` points to your production domain
- [ ] All Convex deployment env vars are set
- [ ] Google OAuth **Authorized origins** and **redirect URIs** include the production domain

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

[MIT](./LICENSE.md)
