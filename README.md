# Last Chance Fantasy Pick'em 🏈

A weekly matchup pick'em web application built specifically for the **Last Chance Fantasy** 12-team Sleeper league (League ID: `1390903684027670528`).

Inspired by the visual design and tactile micro-interactions of **The Set Pick 'Em** (`https://thesetpickem.com`), this app enables league mates to pick the winners of their own 6 weekly head-to-head fantasy matchups, track season-long rankings, and see live score tallies on game days.

---

## 🚀 Features

- **Picks Tab (`#v-picks`)**:
  - Horizontal week rail (Weeks 1–14) with status indicators (`Final`, `Open`, `Locked`).
  - 6 weekly matchup cards showing Sleeper team avatars, names, owner handles, records, and fantasy scores.
  - Interactive tactile card selection with neon electric blue active glow (`--glow`).
  - League split consensus bar showing pick percentages across the league.
  - Weekly tiebreaker guess (Total League Fantasy Points).
  - Floating save bar with toast confirmation and confetti celebration.
- **Leaderboard Tab (`#v-board`)**:
  - Season standings with crown 👑 for rank #1 and glowing ranks for top 3.
  - Streak tracker (`🔥 4W` / `❄️ 2L`).
  - Weekly Champions view highlighting top scorers per week.
- **Profile Tab (`#v-profile`)**:
  - Sleeper avatar hero card with rank badge.
  - 4-stat performance grid (Accuracy %, Total Correct, Best Week, Streak).
  - Homer Index (loyalty vs rationality tracking).
  - Past week results accordion with match outcomes.
- **Frictionless Auth**:
  - Claim your team from the 12 Sleeper rosters and enter a 4-digit PIN.
- **Mobile-First Blob Navigation**:
  - Floating bottom pill with an animated spring sliding blob indicator.

---

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Google Fonts (`Anton` & `Barlow`) + Lucide Icons + Canvas Confetti
- **Data Source**: Sleeper API (Direct client ingestion with wildcard CORS)
- **Database / Backend**: Supabase (PostgreSQL) with local fallback mode

---

## 🏃 Getting Started

### 1. Run Locally
```bash
cd projects/last-chance-pickem
pnpm dev
```
Open `http://localhost:5173` in your browser.

### 2. Connect Supabase (Optional for multi-device sync)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and run the SQL script found in `src/supabase_schema.sql`.
3. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 3. Deploy
Deploy in 1-click to **Vercel** or **Netlify**:
```bash
pnpm build
```
Upload the generated `dist/` directory or connect your Git repository.
