# Last Chance Fantasy Pick'em 🏈

A weekly matchup pick'em web application built specifically for the **Last Chance Fantasy** 12-team Sleeper league (League ID: `1390903684027670528`).

Inspired by the visual design, dark athletic aesthetic, and tactile micro-interactions of **The Set Pick 'Em** (`https://thesetpickem.com`), this app enables league mates to predict the weekly winners of their own 6 head-to-head fantasy matchups, track season-long standings, test their accuracy, and celebrate weekly champions.

---

## 🚀 Key Features

### 1. Picks Tab (`#v-picks`)
- **Horizontal Week Rail**: Fast scrolling pills (Weeks 1–14) with status badges (`Final`, `Open`, `Locked`).
- **6 Weekly Matchup Cards**:
  - Live team logos and avatars from the Sleeper CDN.
  - Team names, owner handles, season records (e.g. `2-0`, `1-1`), and live score updates.
  - Tactile card selection with electric blue neon outline glow (`--glow`).
- **League Consensus Split Bar**: Shows the percentage and pick count across the league (e.g. `83% picked Team Alpha`).
- **Weekly Tiebreaker: Player Ceiling**:
  - Guess the fantasy points scored by the **single highest-scoring player across the entire league** that week (starters or bench, e.g. `38.5 pts`).
  - Resolved automatically from Sleeper's `players_points` data (`max(...player_points)`).
- **Floating Save Action**: Instant save feedback with floating toast notifications and celebratory confetti.

### 2. Leaderboard Tab (`#v-board`)
- **Season Standings**:
  - Crown `👑` for Rank #1; glowing ranks for the top 3.
  - Bold records (e.g. `10-2`), win percentages, and streak indicators (`🔥 4W` / `❄️ 2L`).
  - Distinct gold/blue highlight for the logged-in user (`.row.you`).
- **Weekly Champions View**: Highlights top performers week-by-week.
- **Deep User Linking**: Tapping any manager opens their complete profile.

### 3. Profile Tab (`#v-profile`)
- **Manager Hero Card**: Large Sleeper avatar with glowing ring, display name, team name, and current season rank.
- **4-Stat Metrics Grid**: Accuracy %, Total Correct, Best Week high-water mark, and Current Streak.
- **Homer Pick Index**: Tracks loyalty vs rationality (*"Picked own team: 2 of 2 weeks — 50% win rate"*).
- **Past Slate History**: Breakdown of previous weeks with win/loss results (✅ / ❌).

### 4. Frictionless 4-Digit PIN Auth
- Zero email verification required for friends.
- Managers select their team logo from the 12-team grid and enter a 4-digit PIN.
- Session persists in `localStorage` across mobile Safari, Chrome, and desktop.

### 5. Resilient to Team Name Changes
- Sleeper binds teams to permanent, immutable numerical IDs: `user_id` (e.g. `733806129737535488`) and `roster_id` (e.g. `10`).
- If any manager renames their team or changes their avatar in the Sleeper mobile app at any point, the app automatically reflects the new name on page load.
- All historical picks, records, and leaderboards remain completely intact!

---

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Google Fonts (`Anton` & `Barlow`) + Lucide Icons + Canvas Confetti
- **Data Pipeline**: Direct Sleeper API Client (unauthenticated read with wildcard CORS `*`)
- **Database & Sync**: Supabase (PostgreSQL) with automatic local fallback storage
- **CLI Sync Engine**: Custom TypeScript CLI (`scripts/sync-sleeper.ts`) powered by `tsx`

---

## 💻 WSL & Local Environment Setup

### 1. Global Dev Tools (Installed in WSL)
The following tools are pre-configured in your WSL Node environment:
- **`pnpm`** (v12.5.1): Fast package manager (`npm install -g pnpm`)
- **`tsx`** (v4.23.15): TypeScript CLI runner (`npm install -g tsx`)
- **`tsc`** (v6.0.3): Global TypeScript compiler
- **`serve`** (v14.2.4): Local production preview server

*(Optional system packages: `sudo apt update && sudo apt install -y build-essential jq ripgrep tree zip unzip htop`)*

---

## 🏃 Running the Application

### Start Development Server
```bash
cd projects/last-chance-pickem
pnpm dev
```
Open **`http://localhost:5173`** in your browser.

### Run Live Sleeper Sync CLI
To fetch the latest matchups, scores, and calculate the highest-scoring player tiebreaker:
```bash
pnpm sync
```

### Production Build & Preview
```bash
pnpm build
pnpm preview
```

---

## ☁️ Connecting Supabase (For Cross-Device League Sync)

The application works in local demo mode out of the box. To enable live cross-device sync for all 12 league members:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in the Supabase Dashboard and paste the contents of [`src/supabase_schema.sql`](src/supabase_schema.sql).
3. Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
4. Add your project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
5. Deploy for free on **Vercel** or **Netlify**!

---

## ⚠️ Current Development State

### Working Now (no Supabase needed)
- ✅ Full UI: Picks, Leaderboard, Profile tabs with all interactions
- ✅ Live Sleeper data (team names, avatars, matchups, records, points)
- ✅ Correct `isLocked` state — matchups lock at real Thursday 8:15 PM ET kickoff time
- ✅ Per-user profile stats (each of the 12 managers has distinct placeholder data)
- ✅ Week navigation with season-accurate kickoff date per week
- ✅ PIN auth with state reset on reopen + mobile numeric keyboard
- ✅ Team name / avatar auto-sync from Sleeper on every page load
- ✅ Local `localStorage` persistence for picks and tiebreaker

### Requires Supabase to be Real
- 🔲 Leaderboard standings computed from actual saved picks (currently placeholder records)
- 🔲 Profile stats computed from actual picks vs. Sleeper winner outcomes
- 🔲 League consensus split bar (currently deterministic simulated data)
- 🔲 Cross-device / cross-browser pick sync (currently per-device localStorage)

### Season Hardcoding
The NFL season year `2026` and Week 1 Thursday date (`2026-09-11T00:15:00Z`) are hardcoded in:
- `src/lib/sleeper.ts` → `getThursdayKickoff()`
- `src/lib/store.ts` → Supabase tiebreaker upsert

Update these values each NFL season.

