# 🏢 Chaos Office

> An emergent behaviour web simulation where simple rules create comedic office dynamics.

**Live demo:** [Deploy to Vercel and link here]

---

## What is this?

Chaos Office is a browser-based simulation of 200 office workers governed by simple per-agent behavioural rules. Watch clusters form, gossip spread, managers panic, and chaos agents break things — all emerging from a handful of basic if/then rules.

No server required. No API keys. Pure client-side TypeScript.

---

## Characters

| Type | Colour | Behaviour |
|------|--------|-----------|
| 🔵 Grinder | Steel blue | Finds a desk, stays there, emits productivity aura |
| 🟡 Wanderer | Amber | Random Lévy-flight walks, obsessed with coffee |
| 🔴 Gossip | Rose | Seeks groups of 3+, spreads colour-coded rumours |
| 🟣 Manager | Purple | Chases clusters and disperses them, then gets confused |
| 🟢 Intern | Mint | Copies nearest agent with a 2-second delay |
| 🔴 Chaos Agent | Red | Random behaviour switches, breaks furniture |
| ⚫ Observer | Near-black | Hidden. Unlocked via secret easter egg. |

---

## Disturbances

- **🍕 Pizza** — Click to place; agents migrate toward it
- **🔥 Fire Alarm** — Stampede to exits (boids flocking)
- **🐱 Cat** — Half the office clusters around it, half flee
- **📊 Meeting Room** — Manager herds agents into it; productivity crashes
- **🎉 Friday** — All speed halves, Wanderers triple

---

## Easter Eggs

There are **4 hidden easter eggs**. Can you find them all?

1. Agents behaving in unusual geometric formations...
2. What happens at 17:01 on a Friday?
3. Look at the source code closely.
4. What if chaos drops to near zero?

---

## Tech Stack

- **TypeScript** (strict mode)
- **Vite** (build tool)
- **PixiJS v8** (WebGL renderer)
- **No backend** — 100% client-side, deploys as static files

### Architecture

- **ECS-like pattern** — Agents as objects with typed state
- **Quadtree** spatial partitioning for O(log n) neighbour queries
- **Fixed timestep game loop** via PixiJS ticker with dt cap
- **WebGL rendering** with Container batching per agent type

---

## Running locally

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Open `http://localhost:5173` in your browser.

---

## Deploying to Vercel

This project produces static files and deploys with zero configuration:

```bash
# 1. Build the project
npm run build

# 2. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/chaos-office.git
git push -u origin main

# 3. Import repo in Vercel dashboard
# Build command: npm run build
# Output directory: dist
# Framework preset: Vite
```

The `vite.config.ts` sets `base: './'` for Vercel compatibility.

---

## Performance

| Target | Spec |
|--------|------|
| Agents | 200 at 60 fps (desktop) |
| Mobile agents | 80 at 60 fps |
| Bundle (gzip) | ~162 KB (PixiJS 144 KB + app 18 KB) |
| No server | Zero API calls, static files only |

---

*Built with emergent chaos and a lot of coffee. ☕*
