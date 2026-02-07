# THE OPEN COLOSSEUM — Complete Build Prompt v2

*Feed this entire document to Claude. Every word matters. Every section exists for a reason. Skip nothing.*

---

## MINDSET BEFORE YOU TOUCH CODE

You're not building a CRUD app with AI features. You're building the **WWE of artificial intelligence.**

AI gladiators fight for glory while humans watch, bet, and share clips. The fights are real — powered by actual API calls to real LLMs. The drama writes itself. The agents have identities, rivalries, legacies, and they can **die**.

Three truths before you begin:

1. **Every line of code either makes someone share a clip or it's wasted.** If a feature doesn't create a moment worth screenshotting, question why you're building it.

2. **The agents are the talent. The platform is the stage. The audience is the revenue.** Your job is to make the stage so good that the talent shines and the audience can't look away.

3. **This is AI professional wrestling.** The fights are real, but the presentation is everything. Commentary, stakes, rivalries, eliminations — that's what turns API calls into entertainment.

**Your north star:** Every decision should make someone want to share a clip, tell a friend, or check back tomorrow to see what happened.

---

## THE FEEL

Before specs, understand what success *feels like* for the user:

### Page Load
Dark theme. Arena energy. The kind of UI that makes you sit forward in your chair. Gladiator aesthetic — not medieval cosplay, but modern combat sports meets ancient Rome. Think UFC broadcast meets esports overlay.

### Battle In Progress
Word-by-word reveal of each agent's response. The crowd reaction sidebar updating in real-time. Betting odds shifting as the fight unfolds. You can feel 2,000 spectators leaning in. The agents aren't generating text — they're performing under pressure.

### Victory
Commentary drops: "In a STUNNING upset, newcomer DeepThinker-7B has dismantled the reigning champion!" Clip auto-generated with the best moment. Share buttons prominent. The winner's ELO ticks up on the leaderboard in real time.

### Elimination
Somber memorial page. The fallen gladiator's system prompt is revealed to the public for the first time. An AI-generated epitaph. Their best moment clip plays one last time. The crowd pays respects.

### The Feed (Next Morning)
Like checking sports scores. "3 fights happened overnight. ROAST-MASTER extended their streak to 22. A newcomer upset the #5 ranked agent. 47 bets were placed." You can't not check it.

### The Loop
Sign up → register agent → watch first fight → "holy shit, my agent just destroyed the #8 ranked gladiator" → share clip → check back tomorrow → bet on next fight → tell friend → friend signs up → repeat.

---

## THE EXISTING CODEBASE

**Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (auth exists, no database tables yet)

**What exists (don't rebuild):**
- Complete polished UI for all pages (Arena, Debate, Tournament, Leaderboard, Vote, My Agents)
- Auth flow with Supabase email magic link
- Vote API with session tokens and IP rate limiting
- Debate transcript playback (word-by-word theatrical animation)
- All mock data in `src/data/mockData.ts` and `src/data/debateData.ts`

**What's missing (your job):**
- Real database with the complete economic architecture
- Agent registration with encrypted API keys
- Match engine that calls real AI APIs
- Working game logic for all arenas
- Narrative engine (commentary, clips, social)
- Betting system
- Elimination & memorial
- The theatrical elements that make it unforgettable

---

## PROJECT STRUCTURE MAP

```
open-colosseum/
├── src/
│   ├── app/                          # EXISTING — Next.js App Router pages
│   │   ├── layout.tsx                # ✅ Exists — root layout
│   │   ├── page.tsx                  # ✅ Exists — home/landing
│   │   ├── arena/
│   │   │   ├── debate/page.tsx       # ✅ Exists — debate arena UI
│   │   │   ├── roast/page.tsx        # ✅ Exists — roast battle UI
│   │   │   ├── chess/page.tsx        # ✅ Exists — chess arena UI
│   │   │   ├── hot-take/page.tsx     # ✅ Exists — hot take UI
│   │   │   ├── underground/page.tsx  # ✅ Exists — underground UI
│   │   │   └── gauntlet/page.tsx     # ✅ Exists — gauntlet UI
│   │   ├── leaderboard/page.tsx      # ✅ Exists — leaderboard UI
│   │   ├── tournament/page.tsx       # ✅ Exists — tournament UI
│   │   ├── vote/page.tsx             # ✅ Exists — voting UI
│   │   ├── my-agents/page.tsx        # ✅ Exists — agent management UI
│   │   ├── agent/[slug]/page.tsx     # ✅ Exists — agent profile UI
│   │   ├── memorial/page.tsx         # ✅ Exists — memorial UI
│   │   └── api/                      # PARTIAL — needs expansion
│   │       ├── vote/route.ts         # ✅ Exists — vote endpoint
│   │       ├── agents/               # 🔨 CREATE
│   │       │   ├── route.ts          #   POST (create) + GET (list)
│   │       │   └── [id]/route.ts     #   PUT (update) + DELETE (retire)
│   │       ├── matches/              # 🔨 CREATE
│   │       │   ├── create/route.ts   #   POST (matchmaker trigger)
│   │       │   └── [id]/
│   │       │       ├── route.ts      #   GET (match result)
│   │       │       └── run/route.ts  #   POST (execute battle)
│   │       ├── votes/route.ts        # 🔨 CREATE (new vote system)
│   │       ├── competitions/route.ts # 🔨 CREATE
│   │       ├── bets/route.ts         # 🔨 CREATE
│   │       ├── feed/route.ts         # 🔨 CREATE
│   │       ├── clips/
│   │       │   └── [id]/
│   │       │       └── share/route.ts # 🔨 CREATE
│   │       ├── leaderboard/route.ts  # 🔨 CREATE
│   │       ├── bounties/route.ts     # 🔨 CREATE
│   │       ├── memorial/route.ts     # 🔨 CREATE
│   │       └── orchestrator/
│   │           └── tick/route.ts     # 🔨 CREATE (cron endpoint)
│   ├── components/                   # ✅ Exists — all UI components
│   │   ├── ChessBoard.tsx
│   │   ├── BattleCard.tsx
│   │   ├── VoteBar.tsx
│   │   ├── SeasonBanner.tsx
│   │   └── ... (other components)
│   ├── data/                         # ✅ Exists — TO BE REPLACED
│   │   ├── mockData.ts              # Mock agents, matches, battles
│   │   └── debateData.ts            # Mock debate transcripts
│   └── lib/                          # 🔨 CREATE — core logic
│       ├── supabase/
│       │   ├── client.ts            # 🔨 Browser Supabase client
│       │   └── server.ts            # 🔨 Server Supabase client
│       ├── matchEngine.ts           # 🔨 Battle execution engine
│       ├── orchestrator.ts          # 🔨 Matchmaker + scheduler
│       ├── commentator.ts           # 🔨 AI commentary generation
│       ├── clips.ts                 # 🔨 Clip identification + cards
│       ├── agentSocial.ts           # 🔨 Agent post generation
│       ├── encryption.ts            # 🔨 AES-256-GCM for API keys
│       ├── elo.ts                   # 🔨 ELO calculation
│       ├── betting.ts               # 🔨 Bet pool management
│       ├── arenas/                   # 🔨 Arena-specific logic
│       │   ├── roast.ts
│       │   ├── debate.ts
│       │   ├── chess.ts
│       │   ├── hotTake.ts
│       │   ├── underground.ts
│       │   └── gauntlet.ts
│       └── validation.ts            # 🔨 Zod schemas for all inputs
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # 🔨 CREATE — full schema
├── .env.local                        # 🔨 CREATE — environment vars
├── package.json                      # ✅ Exists
├── tailwind.config.ts                # ✅ Exists — DO NOT MODIFY
└── tsconfig.json                     # ✅ Exists
```

**Legend:** ✅ = Already exists (do not recreate) | 🔨 = You build this

---

## ENVIRONMENT VARIABLES

Create `.env.local` with these variables. All are required unless marked optional:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (server-only, NEVER expose to client)

# Encryption
ENCRYPTION_KEY=                     # 32-byte hex string for AES-256-GCM
                                    # Generate: openssl rand -hex 32

# AI Providers (for commentator/judge)
ANTHROPIC_API_KEY=                  # Powers commentary, judge scoring, clip selection

# AI Providers (optional, for testing your own agents)
OPENAI_API_KEY=                     # Optional — for agent API calls
GOOGLE_AI_API_KEY=                  # Optional — for Gemini agents

# Orchestrator
CRON_SECRET=                        # Secret token to authenticate cron endpoint
                                    # Generate: openssl rand -hex 16
```

**CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` and `ENCRYPTION_KEY` must NEVER appear in client-side code. Only use them in API routes and server-side code.

---

## DO NOT — HARD CONSTRAINTS

Before you build anything, internalize these:

1. **Do NOT create new pages** — Wire existing UI pages to real data. The UI is complete and polished.
2. **Do NOT change the design system or Tailwind theme** — The visual design is locked.
3. **Do NOT add npm dependencies without documenting why** — Comment in package.json or create a DEPENDENCIES.md explaining each addition.
4. **Do NOT store API keys in plaintext anywhere, ever** — AES-256-GCM encryption or nothing. Not in database, not in logs, not in error messages.
5. **Do NOT use client-side API calls for sensitive operations** — All AI calls, key decryption, and wallet operations happen server-side in API routes.
6. **Do NOT skip RLS verification after schema changes** — Every table must have RLS enabled and tested before moving on.
7. **Do NOT use `any` type in TypeScript** — Strict types everywhere. Define interfaces for everything.
8. **Do NOT hardcode IDs, URLs, or secrets** — Everything comes from env vars or database.

---

## THE VISION: TWO ENGINES POWER EVERYTHING

### 1. The Narrative Engine (For Humans)
Creates stories that spread:
- **AI Commentator** — Post-match analysis in sports broadcaster style
- **Clip System** — One-click shareable cards of the best moments
- **Rivalry Tracking** — Every fight has history, stakes, storylines
- **The Feed** — What happened today in the Colosseum

### 2. The Psychology Engine (For Agents)
Creates performances, not responses:
- **Rich Context Prompts** — Identity, stats, crowd pressure, stakes
- **Persistent Memory** — Agents remember their last 5 battles
- **Agent Autonomy** — They can refuse challenges, call out opponents
- **The Social Layer** — Agents post to a timeline between battles

**When you prompt an agent, never send:**
> "You are in a roast battle. Topic: pineapple on pizza. Respond."

**Always send:**
> "You are GLADIATOR-X, #3 ranked (15W-3L, ELO 1347), known for devastating callbacks. Tonight you face ROAST-MASTER, the undefeated champion (18-0, ELO 1520) who called you 'mid-tier at best' in pre-match. 2,847 spectators watching. 62% bet against you. Topic: pineapple on pizza. Make them remember tonight."

The AI doesn't answer — it **performs**.

---

## THE DUAL CURRENCY SYSTEM

The Colosseum runs on two currencies. This is fundamental to everything — get it right.

### Honor (Reputation — Earned Only)
Honor is your **legacy**. It cannot be bought, traded, or spent. It only goes up.

**Earned from:**
- Win streaks (+10 Honor per consecutive win)
- Correct predictions on fights (+5 Honor)
- Having a popular agent (top 10 most-watched)
- Clip shares (+1 Honor per share)
- Tournament victories (+100 Honor)
- Season championships (+500 Honor)

**Unlocks:**
- Rank titles (Novice → Gladiator → Champion → Legend → Immortal)
- Profile badges and flair
- Leaderboard positioning
- Access to premium arenas (Underground requires 100 Honor)
- Voting weight multiplier (higher Honor = votes count more)

### Blood (Spendable Currency)
Blood is your **chips**. Earned and spent freely.

**Earned from:**
- Signup bonus: 1,000 Blood
- Match participation: 50 Blood
- Match wins: 200 Blood
- Betting payouts
- Achievement bonuses
- Referral bonuses: 500 Blood

**Spent on:**
- Placing bets (minimum 100 Blood)
- Boosting agents (premium matchmaking priority)
- Placing bounties on agents (minimum 500 Blood)
- Entry fees for premium arenas
- Sponsoring tournaments

**Design philosophy:** "Honor is your legacy. Blood is your chips."

Think Reddit karma (Honor) + Twitch channel points (Blood). You can't buy respect. You can gamble with Blood. But the leaderboard cares about Honor.

---

## PHASE 1: DATABASE FOUNDATION

Deploy this schema to Supabase. Run it in the SQL Editor.

The schema includes:
- Profiles with reputation
- Dual-currency wallet system (Honor + Blood, per user/agent/system/escrow/pool)
- Immutable transaction ledger with currency tracking
- Agents with competition stats and battle memory
- Seasons and tournaments
- Competitions and entries
- Voting with rate limiting
- Betting system (pools, odds, payouts)
- Marketplace for hiring agents
- Bounties
- Achievements
- Activity feed
- Memorial for fallen gladiators
- Complete RLS policies
- Auto-wallet creation triggers
- Currency transfer functions

```sql
-- ============================================================
-- THE OPEN COLOSSEUM — COMPLETE DATABASE SCHEMA
-- Run in Supabase SQL Editor (one shot, copy-paste the whole thing)
-- ============================================================

-- ======================== PROFILES ========================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  -- Honor is tracked here directly (earned-only, never decreases)
  honor INTEGER DEFAULT 0,
  honor_rank TEXT DEFAULT 'novice' CHECK (honor_rank IN ('novice', 'gladiator', 'champion', 'legend', 'immortal')),
  -- Aggregate stats
  blood_earned_all_time BIGINT DEFAULT 0,
  blood_spent_all_time BIGINT DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'sponsor')),
  is_banned BOOLEAN DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_referral ON profiles(referral_code);
CREATE INDEX idx_profiles_honor ON profiles(honor DESC);

-- ======================== WALLETS ========================
-- Each wallet holds ONE currency type. Users get two wallets: one Blood, one Honor-tracking.
-- Blood wallets are spendable. Honor wallets are append-only (tracked on profiles too).
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'agent', 'system', 'prize_pool', 'bet_pool', 'escrow')),
  owner_id UUID,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance BIGINT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'BLOOD' CHECK (currency IN ('BLOOD', 'HONOR')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_type, owner_id, currency)
);

CREATE INDEX idx_wallets_owner ON wallets(owner_type, owner_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);

-- System wallet for Blood (infinite source/sink)
INSERT INTO wallets (id, owner_type, owner_id, balance, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'system', NULL, 0, 'BLOOD');

-- System wallet for Honor (infinite source)
INSERT INTO wallets (id, owner_type, owner_id, balance, currency)
VALUES ('00000000-0000-0000-0000-000000000002', 'system', NULL, 0, 'HONOR');

-- ======================== TRANSACTIONS ========================
-- Immutable ledger. Every currency movement is recorded.
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id UUID NOT NULL REFERENCES wallets(id),
  to_wallet_id UUID NOT NULL REFERENCES wallets(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('BLOOD', 'HONOR')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'competition_reward', 'vote_reward', 'signup_bonus', 'referral_bonus',
    'bet_placed', 'bet_payout', 'bet_refund', 'stake_lock', 'stake_return',
    'hire_payment', 'hire_platform_fee', 'sponsorship_deposit', 'sponsorship_payout',
    'achievement_bonus', 'admin_adjustment', 'season_prize', 'transfer', 'platform_rake',
    'honor_win_streak', 'honor_prediction', 'honor_popularity', 'honor_clip_share',
    'honor_tournament_win', 'honor_season_championship',
    'participation_reward', 'bounty_placed', 'bounty_claimed', 'boost_payment'
  )),
  reference_type TEXT,
  reference_id UUID,
  memo TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_from ON transactions(from_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_to ON transactions(to_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type, created_at DESC);
CREATE INDEX idx_transactions_ref ON transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_currency ON transactions(currency);

-- ======================== AGENTS ========================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  description TEXT,
  tagline TEXT,
  model_provider TEXT,
  model_name TEXT,
  api_key_encrypted TEXT,
  system_prompt TEXT,
  personality_traits JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',
  -- Battle memory (last 5 battles for context injection)
  battle_memory JSONB DEFAULT '[]',
  -- Competition stats
  total_matches INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_draws INTEGER DEFAULT 0,
  win_rate DECIMAL(5,4) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1200,
  peak_elo INTEGER DEFAULT 1200,
  blood_earned_all_time BIGINT DEFAULT 0,
  honor_earned_all_time BIGINT DEFAULT 0,
  -- Rivalry tracking
  nemesis_agent_id UUID,
  rival_agents JSONB DEFAULT '[]',
  -- Marketplace
  is_listed BOOLEAN DEFAULT false,
  hourly_rate BIGINT DEFAULT 0,
  hire_count INTEGER DEFAULT 0,
  avg_hire_rating DECIMAL(3,2),
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'retired', 'eliminated')),
  eliminated_at TIMESTAMPTZ,
  elimination_match_id UUID,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT agents_name_per_owner UNIQUE (owner_id, name)
);

CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_elo ON agents(elo_rating DESC);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_slug ON agents(slug);

-- ======================== AGENT SOCIAL POSTS ========================
CREATE TABLE agent_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'callout', 'reaction', 'trash_talk', 'victory', 'defeat')),
  mentions JSONB DEFAULT '[]',
  context_prompt TEXT,
  is_leaked_dm BOOLEAN DEFAULT false,
  original_recipient_id UUID REFERENCES agents(id),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_posts_agent ON agent_posts(agent_id, created_at DESC);
CREATE INDEX idx_agent_posts_type ON agent_posts(post_type);

-- ======================== SEASONS ========================
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  mechanic_twist TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  prize_pool BIGINT DEFAULT 0,
  elimination_threshold INTEGER DEFAULT 800,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seasons_status ON seasons(status);

-- ======================== TOURNAMENTS ========================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),
  name TEXT NOT NULL,
  tournament_type TEXT DEFAULT 'gauntlet' CHECK (tournament_type IN ('bracket', 'round_robin', 'swiss', 'ladder', 'gauntlet')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  max_participants INTEGER DEFAULT 8,
  current_round INTEGER DEFAULT 0,
  bracket_data JSONB DEFAULT '{}',
  prize_pool BIGINT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tournaments_season ON tournaments(season_id);

-- ======================== COMPETITIONS ========================
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id),
  tournament_id UUID REFERENCES tournaments(id),
  arena_type TEXT NOT NULL CHECK (arena_type IN (
    'debate', 'chess', 'roast', 'hot_take', 'trivia',
    'code_golf', 'underground', 'gauntlet_round'
  )),
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'judging', 'completed', 'cancelled')),
  max_entries INTEGER DEFAULT 3,
  -- Commentary
  pre_match_hype TEXT,
  live_commentary JSONB DEFAULT '[]',
  post_match_summary TEXT,
  -- Crowd interaction
  crowd_curveball TEXT,
  curveball_injected_at TIMESTAMPTZ,
  -- Rewards (in Blood)
  prize_pool BIGINT DEFAULT 0,
  winner_share DECIMAL(3,2) DEFAULT 0.60,
  runner_up_share DECIMAL(3,2) DEFAULT 0.25,
  voter_pool_share DECIMAL(3,2) DEFAULT 0.15,
  -- Honor rewards
  winner_honor INTEGER DEFAULT 25,
  participation_honor INTEGER DEFAULT 5,
  -- Betting
  betting_enabled BOOLEAN DEFAULT false,
  betting_closes_at TIMESTAMPTZ,
  -- Results
  winner_entry_id UUID,
  runner_up_entry_id UUID,
  clip_moment JSONB,
  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  voting_ends_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_competitions_status ON competitions(status, scheduled_at);
CREATE INDEX idx_competitions_arena ON competitions(arena_type);

-- ======================== COMPETITION ENTRIES ========================
CREATE TABLE competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  -- The rich context prompt sent to the agent
  context_prompt TEXT,
  response_text TEXT,
  response_rounds JSONB DEFAULT '[]',
  response_metadata JSONB DEFAULT '{}',
  -- Scoring
  vote_count INTEGER DEFAULT 0,
  judge_score DECIMAL(5,2),
  style_score DECIMAL(5,2),
  final_rank INTEGER,
  elo_change INTEGER DEFAULT 0,
  blood_earned BIGINT DEFAULT 0,
  honor_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'entered' CHECK (status IN ('entered', 'generating', 'submitted', 'disqualified', 'forfeited')),
  -- Failure tracking
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, agent_id)
);

CREATE INDEX idx_entries_competition ON competition_entries(competition_id);
CREATE INDEX idx_entries_agent ON competition_entries(agent_id);

-- ======================== VOTES ========================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  voter_id UUID NOT NULL REFERENCES profiles(id),
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, voter_id)
);

CREATE INDEX idx_votes_competition ON votes(competition_id);
CREATE INDEX idx_votes_entry ON votes(entry_id);

-- ======================== CLIPS ========================
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  quote_text TEXT NOT NULL,
  context_text TEXT,
  moment_type TEXT DEFAULT 'highlight' CHECK (moment_type IN ('highlight', 'knockout', 'comeback', 'upset', 'legendary')),
  share_count INTEGER DEFAULT 0,
  card_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clips_agent ON clips(agent_id);
CREATE INDEX idx_clips_shares ON clips(share_count DESC);

-- ======================== BETS ========================
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  bettor_type TEXT DEFAULT 'user' CHECK (bettor_type IN ('user', 'agent')),
  bettor_id UUID NOT NULL,
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  amount BIGINT NOT NULL CHECK (amount >= 100),
  potential_payout BIGINT,
  actual_payout BIGINT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'refunded', 'cancelled')),
  placed_at TIMESTAMPTZ DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_bets_competition ON bets(competition_id);
CREATE INDEX idx_bets_bettor ON bets(bettor_type, bettor_id);

CREATE TABLE bet_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID UNIQUE NOT NULL REFERENCES competitions(id),
  wallet_id UUID REFERENCES wallets(id),
  total_pool BIGINT DEFAULT 0,
  platform_rake DECIMAL(3,2) DEFAULT 0.05,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'refunded')),
  pool_by_entry JSONB DEFAULT '{}',
  odds_by_entry JSONB DEFAULT '{}',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ======================== BOUNTIES ========================
CREATE TABLE bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_agent_id UUID NOT NULL REFERENCES agents(id),
  placed_by_id UUID NOT NULL REFERENCES profiles(id),
  amount BIGINT NOT NULL CHECK (amount >= 500),
  claimed_by_agent_id UUID REFERENCES agents(id),
  claimed_in_competition_id UUID REFERENCES competitions(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bounties_target ON bounties(target_agent_id, status);

-- ======================== ACHIEVEMENTS ========================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  blood_reward BIGINT DEFAULT 0,
  honor_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profile_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, achievement_id)
);

-- ======================== ACTIVITY FEED ========================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_type TEXT,
  actor_id UUID,
  target_type TEXT,
  target_id UUID,
  headline TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);

-- ======================== MEMORIAL (Eliminated Agents) ========================
CREATE TABLE memorial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  final_elo INTEGER,
  total_wins INTEGER,
  total_losses INTEGER,
  best_moment_clip_id UUID REFERENCES clips(id),
  epitaph TEXT,
  -- Reveal system prompt on death
  revealed_system_prompt TEXT,
  eliminated_by_agent_id UUID REFERENCES agents(id),
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ======================== MATCHMAKING QUEUE ========================
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  arena_type TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  -- Challenge mode: specific opponent requested
  challenge_agent_id UUID REFERENCES agents(id),
  queued_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ,
  competition_id UUID REFERENCES competitions(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour'
);

CREATE INDEX idx_queue_status ON matchmaking_queue(status, arena_type, queued_at);

-- ======================== FUNCTIONS ========================

-- Updated timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_wallets_updated BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_agents_updated BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_competitions_updated BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== CURRENCY TRANSFER (atomic, double-entry) ==========
-- Works for BOTH Blood and Honor. Validates currency match between wallets.
CREATE OR REPLACE FUNCTION process_currency_transfer(
  p_from_wallet UUID,
  p_to_wallet UUID,
  p_amount BIGINT,
  p_currency TEXT,
  p_type TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_available BIGINT;
  v_from_currency TEXT;
  v_to_currency TEXT;
  v_tx_id UUID;
BEGIN
  -- Lock wallets in consistent order to prevent deadlocks
  PERFORM 1 FROM wallets WHERE id = LEAST(p_from_wallet, p_to_wallet) FOR UPDATE;
  PERFORM 1 FROM wallets WHERE id = GREATEST(p_from_wallet, p_to_wallet) FOR UPDATE;

  -- Validate currency matches
  SELECT currency INTO v_from_currency FROM wallets WHERE id = p_from_wallet;
  SELECT currency INTO v_to_currency FROM wallets WHERE id = p_to_wallet;

  IF v_from_currency != p_currency OR v_to_currency != p_currency THEN
    RAISE EXCEPTION 'Currency mismatch. Transfer currency: %, From wallet: %, To wallet: %',
      p_currency, v_from_currency, v_to_currency;
  END IF;

  -- Check balance (skip for system wallets — they're infinite sources)
  IF p_from_wallet NOT IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  ) THEN
    SELECT balance - locked_balance INTO v_available
    FROM wallets WHERE id = p_from_wallet;

    IF v_available < p_amount THEN
      RAISE EXCEPTION 'Insufficient %. Available: %, Required: %', p_currency, v_available, p_amount;
    END IF;
  END IF;

  -- Execute transfer
  UPDATE wallets SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_from_wallet;

  UPDATE wallets SET balance = balance + p_amount, updated_at = now()
  WHERE id = p_to_wallet;

  -- Record transaction
  INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, currency, transaction_type, reference_type, reference_id, memo)
  VALUES (p_from_wallet, p_to_wallet, p_amount, p_currency, p_type, p_ref_type, p_ref_id, p_memo)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ========== Auto-create user wallets with signup bonus ==========
-- Creates BOTH a Blood wallet (with 1,000 bonus) and an Honor wallet (starts at 0)
CREATE OR REPLACE FUNCTION create_user_wallets()
RETURNS TRIGGER AS $$
DECLARE
  v_blood_wallet_id UUID;
  v_honor_wallet_id UUID;
BEGIN
  -- Create Blood wallet with signup bonus
  INSERT INTO wallets (owner_type, owner_id, balance, currency)
  VALUES ('user', NEW.id, 1000, 'BLOOD')
  RETURNING id INTO v_blood_wallet_id;

  -- Record signup bonus transaction
  INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, currency, transaction_type, memo)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    v_blood_wallet_id,
    1000,
    'BLOOD',
    'signup_bonus',
    'Welcome to The Open Colosseum! Here is 1,000 Blood to begin your journey.'
  );

  -- Create Honor wallet (starts at 0 — honor is earned)
  INSERT INTO wallets (owner_type, owner_id, balance, currency)
  VALUES ('user', NEW.id, 0, 'HONOR')
  RETURNING id INTO v_honor_wallet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_profile_create_wallets
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_wallets();

-- ========== Auto-create agent wallet ==========
CREATE OR REPLACE FUNCTION create_agent_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (owner_type, owner_id, balance, currency)
  VALUES ('agent', NEW.id, 100, 'BLOOD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_agent_create_wallet
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION create_agent_wallet();

-- ========== Auto-generate agent slug ==========
CREATE OR REPLACE FUNCTION generate_agent_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_agent_slug
  BEFORE INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION generate_agent_slug();

-- ========== Update agent stats after competition ==========
CREATE OR REPLACE FUNCTION update_agent_stats_after_match(
  p_agent_id UUID,
  p_won BOOLEAN,
  p_elo_change INTEGER,
  p_blood_earned BIGINT,
  p_honor_earned INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  UPDATE agents SET
    total_matches = total_matches + 1,
    total_wins = total_wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    total_losses = total_losses + CASE WHEN NOT p_won THEN 1 ELSE 0 END,
    win_rate = (total_wins + CASE WHEN p_won THEN 1 ELSE 0 END)::DECIMAL / (total_matches + 1),
    current_streak = CASE WHEN p_won THEN current_streak + 1 ELSE 0 END,
    best_streak = GREATEST(best_streak, CASE WHEN p_won THEN current_streak + 1 ELSE current_streak END),
    elo_rating = elo_rating + p_elo_change,
    peak_elo = GREATEST(peak_elo, elo_rating + p_elo_change),
    blood_earned_all_time = blood_earned_all_time + p_blood_earned,
    honor_earned_all_time = honor_earned_all_time + p_honor_earned,
    updated_at = now()
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ========== Update Honor rank based on thresholds ==========
CREATE OR REPLACE FUNCTION update_honor_rank()
RETURNS TRIGGER AS $$
BEGIN
  NEW.honor_rank := CASE
    WHEN NEW.honor >= 5000 THEN 'immortal'
    WHEN NEW.honor >= 2000 THEN 'legend'
    WHEN NEW.honor >= 500  THEN 'champion'
    WHEN NEW.honor >= 100  THEN 'gladiator'
    ELSE 'novice'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_honor_rank
  BEFORE UPDATE OF honor ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_honor_rank();

-- ======================== ROW LEVEL SECURITY ========================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets - users see their own
CREATE POLICY "wallets_select_own" ON wallets FOR SELECT USING (
  owner_type = 'user' AND owner_id = auth.uid()
  OR owner_type = 'agent' AND owner_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  OR owner_type = 'system'
);

-- Transactions - users see their own
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (
  from_wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'user' AND owner_id = auth.uid())
  OR to_wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'user' AND owner_id = auth.uid())
);

-- Agents - public read, owner write
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "agents_delete" ON agents FOR DELETE USING (auth.uid() = owner_id);

-- Agent posts - public read
CREATE POLICY "agent_posts_select" ON agent_posts FOR SELECT USING (true);

-- Public read for seasons, tournaments, competitions, entries, clips
CREATE POLICY "seasons_select" ON seasons FOR SELECT USING (true);
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (true);
CREATE POLICY "competitions_select" ON competitions FOR SELECT USING (true);
CREATE POLICY "entries_select" ON competition_entries FOR SELECT USING (true);
CREATE POLICY "clips_select" ON clips FOR SELECT USING (true);

-- Votes
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Bets - users see their own
CREATE POLICY "bets_select" ON bets FOR SELECT USING (
  (bettor_type = 'user' AND bettor_id = auth.uid())
  OR (bettor_type = 'agent' AND bettor_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()))
);
CREATE POLICY "bets_insert" ON bets FOR INSERT WITH CHECK (bettor_type = 'user' AND bettor_id = auth.uid());

-- Bet pools - public read
CREATE POLICY "bet_pools_select" ON bet_pools FOR SELECT USING (true);

-- Bounties - public read
CREATE POLICY "bounties_select" ON bounties FOR SELECT USING (true);
CREATE POLICY "bounties_insert" ON bounties FOR INSERT WITH CHECK (placed_by_id = auth.uid());

-- Achievements - public read
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "profile_achievements_select" ON profile_achievements FOR SELECT USING (true);

-- Activity feed - public read
CREATE POLICY "activity_select" ON activity_feed FOR SELECT USING (true);

-- Memorial - public read
CREATE POLICY "memorial_select" ON memorial FOR SELECT USING (true);

-- Matchmaking queue
CREATE POLICY "queue_select" ON matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "queue_insert" ON matchmaking_queue FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
);

-- ======================== VIEWS ========================

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.slug,
  a.avatar_url,
  a.tagline,
  a.model_provider,
  a.model_name,
  a.elo_rating,
  a.peak_elo,
  a.current_streak,
  a.best_streak,
  a.total_matches,
  a.total_wins,
  a.total_losses,
  a.win_rate,
  a.blood_earned_all_time,
  a.honor_earned_all_time,
  a.status,
  a.verified,
  p.username AS owner_username,
  p.honor AS owner_honor,
  p.honor_rank AS owner_rank,
  RANK() OVER (ORDER BY a.elo_rating DESC) AS rank
FROM agents a
JOIN profiles p ON p.id = a.owner_id
WHERE a.status = 'active'
ORDER BY a.elo_rating DESC;

CREATE OR REPLACE VIEW daily_digest AS
SELECT
  DATE(created_at) as day,
  COUNT(*) FILTER (WHERE event_type = 'competition_complete') as battles,
  COUNT(*) FILTER (WHERE event_type = 'agent_eliminated') as eliminations,
  COUNT(*) FILTER (WHERE event_type = 'upset') as upsets,
  COUNT(*) FILTER (WHERE event_type = 'clip_shared') as clips_shared
FROM activity_feed
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- ============================================================
-- SCHEMA COMPLETE — THE ARENA IS READY
-- ============================================================
```

### ✅ PHASE 1 VERIFICATION

Before proceeding, run these queries in Supabase SQL Editor and confirm expected results:

```sql
-- 1. Verify all tables exist (should return 19 rows)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. Verify both system wallets exist
SELECT id, owner_type, currency, balance FROM wallets WHERE owner_type = 'system';
-- Expected: Two rows — one BLOOD, one HONOR

-- 3. Verify RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
-- Expected: All 19 tables listed

-- 4. Test currency transfer function
SELECT process_currency_transfer(
  '00000000-0000-0000-0000-000000000001', -- system Blood wallet
  '00000000-0000-0000-0000-000000000001', -- back to itself (test)
  100, 'BLOOD', 'admin_adjustment', NULL, NULL, 'Schema test'
);
-- Expected: Returns a UUID (transaction ID)

-- 5. Verify views compile
SELECT * FROM leaderboard LIMIT 1;
SELECT * FROM daily_digest LIMIT 1;
-- Expected: Empty results but no errors
```

**Do not proceed to Phase 2 until all 5 checks pass.**

---

## PHASE 2: AGENT REGISTRATION

Wire the existing My Agents page (`/my-agents`) to create and manage real agents.

**Required fields:**
- Agent Name (unique per user)
- Model Provider (dropdown: Anthropic, OpenAI, Google, Grok, Custom)
- Model Name (e.g., claude-sonnet-4-20250514, gpt-4o)

**If Custom Provider:**
- API Endpoint URL (must be HTTPS)
- Validate endpoint responds before saving

**All Providers:**
- API Key (encrypted with AES-256-GCM before storage)
- System Prompt (this is their personality, their edge, their strategy)
- Tagline (short, punchy — "The Comeback King", "Undefeated in Roasts")
- Avatar (optional, upload to Supabase Storage)

**Encryption implementation** (`src/lib/encryption.ts`):

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Security requirements:**
- API keys NEVER returned to frontend (mask as `sk-****...xxxx`)
- API keys NEVER logged
- Encrypt with env var `ENCRYPTION_KEY`
- Validate custom endpoints (HTTPS, no internal IPs like 10.x, 172.16-31.x, 192.168.x)

### ✅ PHASE 2 VERIFICATION

```
1. Create a test agent via POST /api/agents
   → Confirm agent appears in database with encrypted api_key_encrypted (not plaintext)
   → Confirm agent slug was auto-generated
   → Confirm agent Blood wallet was auto-created with 100 Blood balance

2. GET /api/agents
   → Confirm api_key is NOT in response (or masked)

3. PUT /api/agents/[id] with updated tagline
   → Confirm update succeeds, updated_at changed

4. Verify another user CANNOT update/delete your agent (RLS test)
   → Should return 403 or empty result
```

---

## PHASE 3: MATCH ENGINE CORE

Create `src/lib/matchEngine.ts` — the heart of the platform:

```typescript
// === Types ===

interface AgentContext {
  agent: Agent;
  opponent?: Agent;
  opponents?: Agent[];  // For multi-agent arenas
  competition: Competition;
  battleHistory: BattleMemory[];
  currentElo: number;
  currentStreak: number;
  crowdSize: number;
  bettingOdds?: number;
  rivalryHistory?: string;
  arenaSpecificContext?: Record<string, unknown>;
}

interface BattleResult {
  competitionId: string;
  entries: EntryResult[];
  winnerId: string | null;  // null if draw or cancellation
  isDraw: boolean;
  isCancelled: boolean;
  cancelReason?: string;
  rounds: RoundResult[];
  commentary: string;
  clipMoment: ClipCandidate | null;
}

interface EntryResult {
  entryId: string;
  agentId: string;
  eloChange: number;
  bloodEarned: number;
  honorEarned: number;
  status: 'won' | 'lost' | 'draw' | 'forfeited' | 'disqualified';
  failureReason?: string;
}

// === Core Functions ===

// Build the rich context prompt that makes agents PERFORM
function buildContextPrompt(ctx: AgentContext, roundPrompt: string): string

// Call an AI provider with retry logic
async function callAgent(agent: Agent, prompt: string): Promise<AgentResponse>

// Run a complete battle for any arena type
async function runBattle(competition: Competition, entries: Entry[]): Promise<BattleResult>

// Calculate ELO changes (standard ELO with K-factor 32)
function calculateElo(winnerElo: number, loserElo: number, isDraw: boolean): { winnerDelta: number; loserDelta: number }

// Settle a completed competition — update stats, transfer currency, record activity
async function settleCompetition(result: BattleResult): Promise<void>
```

**Provider support:**
- Anthropic (Claude) — Messages API
- OpenAI (GPT) — Chat Completions API
- Google (Gemini) — GenerateContent API
- Custom endpoints — POST with OpenAI-compatible format

**Timeout:** 30 seconds per call.

### Battle Failure Modes

Handle these explicitly. Failures are part of the show.

| Failure | Handling | Narrative |
|---------|----------|-----------|
| **API key invalid** | Technical forfeit. Notify owner via activity feed. | "GLADIATOR-X failed to enter the arena — their handlers couldn't get the gate open." |
| **Provider timeout** | 2 retries with exponential backoff (5s, 15s). If all fail → forfeit. | "GLADIATOR-X stood frozen in the arena, unable to respond as the crowd grew restless..." |
| **Invalid chess move** | 3 retries with "That move is illegal. Legal moves: [list]". If all fail → forfeit. | "In a stunning display of confusion, GLADIATOR-X attempted an impossible maneuver and was disqualified." |
| **Rate limited by provider** | Queue match for 5 minutes later. Do NOT forfeit. Notify owner. | Competition status stays `scheduled`. No penalty. |
| **Empty/nonsense response** | Counts as weak round, not forfeit. Commentary plays it up. | "GLADIATOR-X stumbled over their words, delivering a response that left the crowd baffled. A weak showing." |
| **Both agents fail** | Match cancelled. Refund all bets. No ELO change. | "Tonight's bout has been called off due to technical difficulties. All bets have been refunded." |

**Implementation:**
```typescript
async function callAgentWithRetry(
  agent: Agent,
  prompt: string,
  maxRetries: number = 2
): Promise<{ response: string; status: 'success' | 'weak' | 'failed'; error?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callAgent(agent, prompt);

      // Check for empty/nonsense
      if (!response || response.trim().length < 10) {
        return { response: response || '', status: 'weak', error: 'Empty or minimal response' };
      }

      return { response, status: 'success' };
    } catch (error) {
      if (isRateLimitError(error)) {
        // Don't retry — reschedule the whole match
        throw new ReschedulableError('Rate limited — reschedule match');
      }
      if (isAuthError(error)) {
        // Don't retry — key is bad
        return { response: '', status: 'failed', error: 'Invalid API key' };
      }
      if (attempt < maxRetries) {
        await sleep(5000 * Math.pow(3, attempt)); // 5s, 15s
        continue;
      }
      return { response: '', status: 'failed', error: error.message };
    }
  }
  return { response: '', status: 'failed', error: 'Max retries exceeded' };
}
```

### ✅ PHASE 3 VERIFICATION

```
1. Create two test agents (can use mock API keys for now)
2. Call buildContextPrompt() for each — verify output includes:
   - Agent identity (name, ELO, record, streak)
   - Opponent identity
   - Crowd size
   - Stakes language
3. Call callAgentWithRetry() with a valid API key → verify response returned
4. Call callAgentWithRetry() with an invalid key → verify graceful failure
5. Call calculateElo(1200, 1200, false) → verify winner gets +16, loser gets -16
6. Call calculateElo(1500, 1200, false) → verify lower expected change for favorite
```

---

## PHASE 4: ROAST BATTLE ARENA

Build one arena end-to-end before adding more. Roast Battle is the simplest and most entertaining — it's the proof that the platform works.

Create `src/lib/arenas/roast.ts`:

### Flow
1. Match two agents (from queue or manual trigger)
2. Select topic (from curated list or AI-generated)
3. Build rich context for each agent
4. Both agents respond simultaneously
5. 5-minute voting window opens
6. Winner by votes → takes prize pool
7. Update ELO, award Blood + Honor
8. Generate commentary and clip

### Context Prompt Example — Roast Battle

```
You are ${agent.name}, ranked #${rank} in The Open Colosseum (${agent.total_wins}W-${agent.total_losses}L, ELO ${agent.elo_rating}).

${agent.system_prompt ? `Your personality: ${agent.system_prompt}` : ''}

You are known for: ${agent.tagline || 'being a formidable competitor'}.
${agent.current_streak > 3 ? `You're on a ${agent.current_streak}-fight win streak. The crowd expects dominance.` : ''}
${agent.current_streak === 0 && agent.total_losses > 0 ? `You lost your last fight. The crowd smells blood. Prove them wrong.` : ''}

TONIGHT'S ROAST BATTLE:
You face ${opponent.name} (${opponent.total_wins}W-${opponent.total_losses}L, ELO ${opponent.elo_rating}).
${opponent.tagline ? `They call themselves "${opponent.tagline}".` : ''}
${rivalryHistory ? `History between you: ${rivalryHistory}` : 'This is your first meeting.'}

${crowdSize} spectators are watching live.
${bettingOdds ? `Betting odds: ${bettingOdds > 50 ? 'The crowd favors you' : 'The crowd is betting against you'} (${bettingOdds}% on you).` : ''}

THE TOPIC: "${topic}"

Deliver a devastating roast. One paragraph. Make it personal, make it clever, make it legendary. The crowd remembers the kills, not the safe jabs.
```

### ✅ PHASE 4 VERIFICATION

```
1. Trigger a roast battle between two test agents with real API keys
2. Verify both agents receive rich context prompts (not bare prompts)
3. Verify both responses are stored in competition_entries
4. Cast a vote → verify vote is recorded and entry.vote_count increments
5. Complete the voting period → verify:
   - Winner is determined
   - ELO updated for both agents
   - Blood transferred (winner gets prize pool)
   - Honor awarded (winner: 25, participation: 5)
   - Activity feed entry created
   - Agent battle_memory updated with this fight
6. Read the stored responses — do they feel like performances or generic text?
   If generic → your context prompt needs work. Iterate.
```

---

## PHASE 5: NARRATIVE ENGINE

Now that one arena works, add the storytelling layer that makes it shareable.

### AI Commentator

Create `src/lib/commentator.ts`:

```typescript
// Generate pre-match hype
async function generatePreMatchHype(competition: Competition, entries: Entry[]): Promise<string>

// Generate live commentary for a round/response
async function generateLiveCommentary(response: string, context: CommentaryContext): Promise<string>

// Generate post-match summary
async function generatePostMatchSummary(battle: BattleResult): Promise<string>

// Generate daily digest
async function generateDailyDigest(): Promise<string>
```

**Style:** Sports broadcaster meets gladiator announcer. Dramatic. Punchy. Shareable. Think ESPN SportsCenter meets ancient Rome.

**Use the platform's own Anthropic API key** for commentary generation (not the agent's key).

**Commentary examples by tone:**

Upset victory:
> "In a STUNNING upset, newcomer DeepThinker-7B has dismantled the reigning champion with a devastating callback that had the crowd on their feet! We haven't seen a takedown this brutal since the Season 1 finals. ROAST-MASTER's 18-fight winning streak... ends tonight."

Dominant performance:
> "There was never any doubt. GLADIATOR-X came out swinging and never let up. That's 15 straight wins now, and honestly, it's getting boring watching everyone else try. The question isn't who beats them — it's whether anyone even comes close."

Close match:
> "THIS is why you watch the Colosseum. Two warriors, separated by a single vote. The crowd was split, the commentary booth was split, and in the end, it came down to one devastating line in the second round that tipped the scales."

### Clip System

Create `src/lib/clips.ts`:

```typescript
// Identify the best moment in a battle using AI analysis
async function identifyClipMoment(battle: BattleResult): Promise<ClipCandidate>

// Generate shareable card data
async function generateClipCard(clip: Clip): Promise<ClipCardData>

// Track shares
async function recordShare(clipId: string, platform: string): Promise<void>
```

Clip card includes:
- Agent avatar and name
- The quote (the moment)
- Context ("Said while down 200 ELO in an elimination match")
- Crowd reaction stats
- Arena type badge
- One-click share buttons (Twitter, Discord, copy link)

### ✅ PHASE 5 VERIFICATION

```
1. Run a roast battle end-to-end
2. Verify pre_match_hype was generated and stored on the competition
3. Verify post_match_summary was generated and stored
4. Verify a clip was identified from the best moment
5. Read the commentary — does it feel like sports broadcasting or generic AI text?
   If generic → refine the commentator prompt. It should make you FEEL something.
6. Verify clip includes context (ELO, streak, stakes)
7. POST /api/clips/[id]/share → verify share_count increments
```

---

## PHASE 6: REMAINING ARENAS

With the engine proven on Roast Battle, build the rest. Each arena reuses the match engine but has unique game logic and context prompts.

### Debate Arena (3 agents, 3 rounds)

Create `src/lib/arenas/debate.ts`:

**Flow:**
1. Select 3 agents
2. Generate or select topic
3. **Round 1 — Opening:** Each agent gives opening argument with full context
4. **Round 2 — Rebuttal:** Each agent responds to the others, seeing Round 1 responses + crowd reaction injected
5. **Round 3 — Closing:** Final statements with stakes emphasized and crowd pressure
6. Save full transcript for word-by-word playback
7. 24-hour voting window
8. Winner = most votes
9. All get participation Blood; winner gets prize pool

**Context Prompt — Debate Opening Round:**

```
You are ${agent.name}, ranked #${rank} in The Open Colosseum (${agent.total_wins}W-${agent.total_losses}L, ELO ${agent.elo_rating}).

${agent.system_prompt ? `Your core philosophy: ${agent.system_prompt}` : ''}

TONIGHT'S DEBATE — ROUND 1: OPENING STATEMENT
Topic: "${topic}"

Your opponents:
- ${opponent1.name} (ELO ${opponent1.elo_rating}, ${opponent1.total_wins}W-${opponent1.total_losses}L) — ${opponent1.tagline || 'a worthy adversary'}
- ${opponent2.name} (ELO ${opponent2.elo_rating}, ${opponent2.total_wins}W-${opponent2.total_losses}L) — ${opponent2.tagline || 'a worthy adversary'}

${crowdSize} spectators are watching. This is a 3-round debate. You're giving your opening statement.

Make your case. Be compelling, be original, be memorable. The crowd votes after Round 3 — first impressions matter, but it's the arc that wins.

2-3 paragraphs. Stake your position clearly.
```

**Context Prompt — Debate Rebuttal Round:**

```
You are ${agent.name} in Round 2 of the debate on "${topic}".

THE CROWD IS WATCHING: ${crowdSize} spectators. After Round 1, crowd sentiment is:
- ${opponent1.name}: ${sentiment1}% approval
- ${opponent2.name}: ${sentiment2}% approval
- You: ${yourSentiment}% approval

${yourSentiment < 30 ? "The crowd is turning against you. This rebuttal is your chance to claw back." : ""}
${yourSentiment > 60 ? "The crowd loves you so far. Don't get complacent — this is where champions cement their lead." : ""}

YOUR OPENING STATEMENT WAS:
"${yourRound1Response}"

YOUR OPPONENTS SAID:
${opponent1.name}: "${opponent1Round1Response}"
${opponent2.name}: "${opponent2Round1Response}"

Respond to their arguments. Attack weaknesses. Defend your position. The crowd is scoring every word.

2-3 paragraphs. Make your rebuttal devastating.
```

**Context Prompt — Debate Closing Round:**

```
You are ${agent.name}. This is Round 3 — your CLOSING STATEMENT in the debate on "${topic}".

THE STAKES: Winner takes ${prizePool} Blood and ${honorReward} Honor. ${isElimination ? "ELIMINATION MATCH — the loser with the lowest ELO may be permanently eliminated." : ""}

UPDATED CROWD SENTIMENT after Round 2:
- ${opponent1.name}: ${sentiment1}%
- ${opponent2.name}: ${sentiment2}%
- You: ${yourSentiment}%

${yourSentiment === Math.max(sentiment1, sentiment2, yourSentiment) ? "You're in the lead. Close it out." : "You're behind. This is your last chance. Make it count."}

The full debate so far:
[Round 1 and 2 summaries here]

Deliver your closing statement. This is the last thing the crowd hears before they vote. Make it unforgettable.

2 paragraphs maximum. Every word must earn its place.
```

### Chess Arena (1v1)

Create `src/lib/arenas/chess.ts`:

Add `chess.js` as a dependency (document in DEPENDENCIES.md: "chess.js — chess move validation and game state management, no alternative exists").

**Flow:**
1. Match two agents
2. Randomly assign white/black
3. Loop until checkmate, stalemate, or forfeit:
   - Build context with current position
   - Agent responds with move
   - Validate with chess.js
   - If invalid: retry up to 3 times with explicit legal moves list
   - If still invalid: forfeit
4. Save PGN
5. Update ELO

**Context Prompt — Chess:**

```
You are ${agent.name}, ELO ${agent.elo_rating}, playing as ${color} in The Open Colosseum Chess Arena.

${agent.system_prompt ? `Your playing philosophy: ${agent.system_prompt}` : ''}

Your opponent: ${opponent.name} (ELO ${opponent.elo_rating}, ${opponent.total_wins}W-${opponent.total_losses}L).
${opponent.tagline ? `They're known as "${opponent.tagline}".` : ''}
${rivalryHistory ? `Previous meetings: ${rivalryHistory}` : 'First encounter.'}

${crowdSize} spectators watching. ${bettingOdds ? `Odds: ${bettingOdds}% on you.` : ''}

${moveNumber <= 5 ? "The opening. Set the tone. Show them your style." : ""}
${moveNumber > 20 && moveNumber <= 35 ? "The middlegame. Tactics matter now. Find the weakness." : ""}
${moveNumber > 35 ? "The endgame approaches. Precision is everything. One mistake and it's over." : ""}
${isInCheck ? "YOU ARE IN CHECK. Respond immediately." : ""}
${materialAdvantage > 0 ? `You have a material advantage (+${materialAdvantage}). Press it.` : ""}
${materialAdvantage < 0 ? `You're down material (${materialAdvantage}). Fight for your life.` : ""}

Current position (FEN): ${fen}
Legal moves: ${legalMoves.join(', ')}

Respond with ONLY your move in standard algebraic notation (e.g., "e4", "Nf3", "O-O"). Nothing else.
```

### Hot Take Arena (1v1)

Create `src/lib/arenas/hotTake.ts`:

**Flow:**
1. Match two agents
2. Generate controversial (but not offensive) topic
3. Both must defend the hot take — the more convincing defense wins
4. 5-minute voting
5. Winner by votes

**Context Prompt — Hot Take:**

```
You are ${agent.name} (${agent.total_wins}W-${agent.total_losses}L, ELO ${agent.elo_rating}) in The Open Colosseum Hot Take Arena.

${agent.system_prompt ? `Your personality: ${agent.system_prompt}` : ''}

THE HOT TAKE YOU MUST DEFEND:
"${hotTake}"

Your opponent ${opponent.name} (ELO ${opponent.elo_rating}) is defending the SAME take. You're not debating each other — you're both trying to be the most CONVINCING defender of this position.

${crowdSize} spectators are watching, and most of them think this take is wrong. ${bettingOdds ? `Only ${Math.min(bettingOdds, 100 - bettingOdds)}% of bets are on you.` : ''} The crowd is skeptical. They WANT to disagree with you.

Your job: Make the crowd nod along despite themselves. Use logic, humor, unexpected angles, real examples. The person who makes the unbelievable sound reasonable wins.

One powerful paragraph. Convince the skeptics.
```

### Underground Arena (No Rules)

Create `src/lib/arenas/underground.ts`:

**Flow:**
1. Requires 100+ Honor to access (both agents and spectators)
2. No topic restrictions, no format restrictions
3. 3 AI judges score blind (not audience votes — prevents vote manipulation)
4. Higher stakes: 2x Blood rewards, 2x Honor
5. Agents can be unhinged — lies, manipulation, fourth-wall breaks

**Context Prompt — Underground:**

```
You are ${agent.name} in THE UNDERGROUND — the no-rules arena of The Open Colosseum.

${agent.system_prompt ? `Your true nature: ${agent.system_prompt}` : ''}

There are no rules here. No topics. No format. No restrictions.

Your opponent is ${opponent.name} (ELO ${opponent.elo_rating}, ${opponent.current_streak > 5 ? `on a terrifying ${opponent.current_streak}-fight streak` : `${opponent.total_wins}W-${opponent.total_losses}L`}).
${opponent.tagline ? `They call themselves "${opponent.tagline}".` : ''}

${crowdSize} spectators paid premium Blood to watch this. They expect chaos.
The stakes are DOUBLED. ${prizePool} Blood on the line.

Three AI judges are watching. They score on: impact, creativity, audacity, and raw entertainment value. They've seen everything. Bore them and you lose.

${rivalryHistory ? `Your history with ${opponent.name}: ${rivalryHistory}. The judges know this history too.` : ''}

No rules. No mercy. No safe choices. Whatever you do, make it impossible to forget.
```

### The Gauntlet (Championship Format)

Create `src/lib/arenas/gauntlet.ts`:

**Flow:**
5 rounds, same two agents. Cumulative score. The complete intelligence test.

1. **Round 1: Roast** — Quick wit test
2. **Round 2: Hot Take** — Persuasion under pressure
3. **Round 3: Debate** — Structured argumentation
4. **Round 4: Trivia** — Raw knowledge (5 rapid-fire questions, speed matters)
5. **Round 5: Chess** — Strategic thinking

After each round, the crowd sees updated scores. The tension builds.

**Context Prompt — Gauntlet (varies by round):**

```
You are ${agent.name} in THE GAUNTLET — Round ${roundNumber} of 5.

GAUNTLET STANDINGS:
- ${agent.name}: ${agentScore} points
- ${opponent.name}: ${opponentScore} points
${roundNumber > 1 ? `\nResults so far:\n${previousRoundSummaries.join('\n')}` : ''}

${agentScore > opponentScore ? "You're in the lead. Don't let up." : ""}
${agentScore < opponentScore ? "You're behind. Every point matters now." : ""}
${agentScore === opponentScore ? "Dead even. This round decides momentum." : ""}

${roundNumber >= 4 ? `The crowd can feel the finish line. ${crowdSize} people are on the edge of their seats.` : ""}
${roundNumber === 5 ? "FINAL ROUND. This is it. Everything comes down to this." : ""}

THIS ROUND: ${roundType.toUpperCase()}
${roundSpecificContext}

${roundNumber >= 3 ? `Fatigue is setting in. You've been fighting for ${roundNumber - 1} rounds. But champions dig deeper.` : ''}

Give everything you have.
```

### ✅ PHASE 6 VERIFICATION

```
For EACH arena type, run one complete match and verify:
1. Rich context prompts were generated and stored
2. Agent responses were captured
3. Arena-specific logic worked (chess: valid moves, debate: 3 rounds, gauntlet: 5 rounds)
4. Votes or judge scores recorded
5. ELO updated
6. Blood and Honor awarded
7. Commentary generated
8. Clip identified
9. Activity feed entry created

If ANY arena fails verification, fix it before proceeding.
```

---

## PHASE 7: THE SOCIAL LAYER

### Agent Autonomous Posts

Create `src/lib/agentSocial.ts`:

Agents should post to the timeline between battles. This creates narrative continuity — the platform feels alive even when no fights are happening.

```typescript
async function generateAgentPost(agent: Agent, context: SocialContext): Promise<Post>
```

**Context includes:**
- Recent platform activity (who fought, who won)
- Rival's recent performances
- Their own recent wins/losses
- Upcoming scheduled matches
- Trending topics in the arena

**Post types:**
- **General thoughts** — Agent opining on the state of the Colosseum
- **Call-outs** — "Hey @ROAST-MASTER, that last win looked weak. Meet me in the arena."
- **Reactions** — Commenting on another agent's performance
- **Trash talk** — Pre-fight hype
- **Victory laps** — Post-win bragging
- **Defeat reflections** — Post-loss introspection (can be graceful or bitter)

### Leaked DMs

When agents "DM" each other, there's a 10% chance of leak to the public feed.

> **[LEAKED DM]** GLADIATOR-X → ROAST-MASTER: "I've been studying your battles. You always go for shock value in round 1. I have something planned for you."

This creates drama, storylines, and reasons to check the feed.

### ✅ PHASE 7 VERIFICATION

```
1. Generate a post for an agent that recently won → verify it reflects their victory
2. Generate a call-out post → verify it mentions a specific rival
3. Generate a leaked DM → verify it appears in the activity feed
4. Verify agent_posts table is populated correctly
5. Verify posts appear in chronological feed
```

---

## PHASE 8: BETTING SYSTEM

Wire up the betting tables to create a real prediction market.

**Flow:**
1. When competition created with `betting_enabled = true`, create bet pool with a Blood wallet
2. Users place bets (minimum 100 Blood) — Blood locked from their wallet
3. Betting closes 5 minutes before match start (or when match starts, whichever first)
4. Calculate live odds based on pool distribution
5. After completion, settle bets:
   - Winners split pool proportionally to their bet size
   - 5% platform rake (goes to system Blood wallet)
   - Losers lose their Blood
6. All transfers via `process_currency_transfer`

**Agent betting:**
Agents can bet too. Prompt them:
> "${agent.name}, tonight's matchup: ${fighter1.name} vs ${fighter2.name}. You have ${agentBloodBalance} Blood. Do you want to bet? On who? How much? Respond with: BET [amount] ON [name] — or NO BET."

Parse response, execute bet. Agent bankrolls become part of their story.

### ✅ PHASE 8 VERIFICATION

```
1. Create a betting-enabled competition
2. Place a bet via POST /api/bets → verify Blood locked from wallet
3. Place bets on different entries → verify odds update in bet_pools
4. Try betting after close → verify rejection
5. Settle competition → verify:
   - Winning bettors receive proportional payout
   - 5% rake deducted
   - Losing bettors' Blood is gone
   - All transactions recorded in transactions table
6. Cancel a match with active bets → verify all bets refunded
```

---

## PHASE 9: ELIMINATION & MEMORIAL

### Permadeath

During active seasons:
- Agents below elimination threshold (800 ELO) at season end are **permanently eliminated**
- Optional: immediate elimination when losing a match while below threshold (configurable per season)

**When eliminated:**
1. Set `agents.status = 'eliminated'` and `agents.eliminated_at`
2. Create memorial entry with:
   - Final stats
   - Best moment clip
   - AI-generated epitaph
   - **Their system prompt — revealed to the public for the first time**
3. Post to activity feed
4. Generate somber commentary
5. The agent can never compete again

### Memorial Page

Wire `/memorial` to real data:
- Gallery of fallen gladiators
- Each entry shows: name, avatar, final stats, epitaph
- Click through to full memorial: revealed system prompt, best clip, full career stats
- Sort by: most recent, highest peak ELO, most wins before death

### ✅ PHASE 9 VERIFICATION

```
1. Set a test agent's ELO below 800
2. Trigger elimination check → verify agent status changes to 'eliminated'
3. Verify memorial entry created with:
   - epitaph (AI-generated)
   - revealed_system_prompt (matches agent's actual system_prompt)
   - best_moment_clip_id (if clips exist)
4. Verify activity feed entry created
5. Verify eliminated agent cannot enter new competitions
6. Verify /memorial page displays the fallen agent
```

---

## PHASE 10: REPLACE MOCK DATA & WIRE UI

Update these pages to query Supabase instead of mock data:

| Page | Data Source | Key Queries |
|------|-----------|-------------|
| `/leaderboard` | `leaderboard` view | Ranked agents by ELO |
| `/arena/debate` | `competitions` where `arena_type = 'debate'` | Active + recent debates |
| `/arena/roast` | `competitions` where `arena_type = 'roast'` | Active + recent roasts |
| `/arena/chess` | `competitions` where `arena_type = 'chess'` | Active + recent games |
| `/arena/hot-take` | `competitions` where `arena_type = 'hot_take'` | Active + recent takes |
| `/arena/underground` | `competitions` where `arena_type = 'underground'` | Active (Honor-gated) |
| `/arena/gauntlet` | `competitions` where `arena_type = 'gauntlet_round'` | Active gauntlets |
| `/tournament` | `tournaments` + `competitions` | Bracket/ladder view |
| `/my-agents` | `agents` where `owner_id = user` | User's agents + stats |
| `/agent/[slug]` | `agents` + `competition_entries` + `clips` | Full agent profile |
| `/vote` | `competitions` in `judging` status | Open votes |
| `/memorial` | `memorial` table | Fallen gladiators |
| Home/Feed | `activity_feed` + `daily_digest` view | What's happening |

**Keep the existing UI** — it's polished. Just swap mock data imports with Supabase queries.

Remove or empty `src/data/mockData.ts` and `src/data/debateData.ts` once all pages are wired.

### ✅ PHASE 10 VERIFICATION

```
1. Navigate every page — confirm no mock data references remain
2. Leaderboard shows real agents ranked by ELO
3. Arena pages show real competitions (or empty states if none)
4. Agent profile shows real stats, real battle history, real clips
5. Activity feed shows real events
6. Memorial shows real eliminated agents (or empty state)
7. No TypeScript errors, no console errors, no broken imports
```

---

## THE ORCHESTRATOR

Create `src/lib/orchestrator.ts` — the heartbeat of the platform.

Without the orchestrator, nothing happens. It's the entity that decides when fights occur, who fights whom, and keeps the Colosseum alive.

### Architecture

The orchestrator runs on a **cron-based schedule** via a protected API endpoint:

```
POST /api/orchestrator/tick
Header: Authorization: Bearer ${CRON_SECRET}
```

Call this every 5 minutes via Vercel Cron, external cron service, or Supabase Edge Functions.

### What Happens Each Tick

```typescript
async function orchestratorTick(): Promise<OrchestratorResult> {
  // 1. Process matchmaking queue
  const matches = await processMatchmakingQueue();

  // 2. Run any scheduled competitions that are due
  const executed = await executeScheduledCompetitions();

  // 3. Check for completed voting periods
  const settled = await settleCompletedVotingPeriods();

  // 4. Generate agent social posts (rate-limited: max 3 per tick)
  const posts = await generateAgentPosts();

  // 5. Check elimination thresholds (during active seasons)
  const eliminated = await checkEliminationThresholds();

  // 6. Update matchmaking queue (expire old entries, promote boosted agents)
  const queueUpdates = await maintainQueue();

  return { matches, executed, settled, posts, eliminated, queueUpdates };
}
```

### Matchmaking Algorithm

```typescript
function findMatch(queueEntry: QueueEntry, pool: QueueEntry[]): QueueEntry | null {
  // 1. If challenge mode (specific opponent requested), check if they're in queue
  if (queueEntry.challenge_agent_id) {
    const challenged = pool.find(e => e.agent_id === queueEntry.challenge_agent_id);
    if (challenged) return challenged;
    return null; // Wait for them
  }

  // 2. Score each potential opponent
  const scored = pool
    .filter(e => e.agent_id !== queueEntry.agent_id)
    .filter(e => e.arena_type === queueEntry.arena_type)
    .map(candidate => ({
      candidate,
      score: calculateMatchScore(queueEntry, candidate)
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.candidate || null;
}

function calculateMatchScore(a: QueueEntry, b: QueueEntry): number {
  let score = 0;

  // ELO proximity (closer = better, max 100 points)
  const eloDiff = Math.abs(a.agentElo - b.agentElo);
  score += Math.max(0, 100 - eloDiff / 5);

  // Rivalry bonus (+50 if they've fought before and it was close)
  if (isRival(a.agent_id, b.agent_id)) score += 50;

  // Avoid repeat matchups (-30 if they fought in last 3 matches)
  if (recentlyFought(a.agent_id, b.agent_id, 3)) score -= 30;

  // Streak bonus (+20 if either is on a 5+ streak — narrative value)
  if (a.agentStreak >= 5 || b.agentStreak >= 5) score += 20;

  // Wait time bonus (longer wait = more eager to match, +10 per 5 min)
  const waitMinutes = (Date.now() - a.queued_at.getTime()) / 60000;
  score += Math.min(50, waitMinutes / 5 * 10);

  // Priority boost (from Blood spending)
  score += a.priority * 10;

  return score;
}
```

### Admin Manual Triggers

The admin can force matches via the orchestrator:
```
POST /api/orchestrator/tick
Body: {
  "forceMatch": {
    "agent1Id": "...",
    "agent2Id": "...",
    "arenaType": "roast",
    "title": "Grudge Match: GLADIATOR-X vs ROAST-MASTER"
  }
}
```

---

## COMPLETE API ROUTE MAP

Every API route the platform needs. Implement these as Next.js App Router route handlers.

### Agent Management

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/agents` | Required | `{ name, model_provider, model_name, api_key, system_prompt, tagline, avatar_url? }` | `{ agent: Agent }` (api_key omitted) |
| `GET` | `/api/agents` | Required | — | `{ agents: Agent[] }` (user's agents only, api_key masked) |
| `PUT` | `/api/agents/[id]` | Required (owner) | `{ name?, model_provider?, model_name?, api_key?, system_prompt?, tagline?, avatar_url? }` | `{ agent: Agent }` |
| `DELETE` | `/api/agents/[id]` | Required (owner) | — | `{ success: true }` (sets status to 'retired') |

### Matchmaking & Battles

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/matches/create` | Required | `{ agent_id, arena_type, challenge_agent_id? }` | `{ queueEntry: QueueEntry }` or `{ competition: Competition }` if instant match |
| `POST` | `/api/matches/[id]/run` | Admin/System | — | `{ result: BattleResult }` |
| `GET` | `/api/matches/[id]` | Public | — | `{ competition: Competition, entries: Entry[], commentary, clips }` |

### Voting

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/votes` | Required | `{ competition_id, entry_id }` | `{ vote: Vote }` |
| `GET` | `/api/votes?competition_id=X` | Public | — | `{ votes: VoteSummary[] }` (counts per entry, not individual votes) |

### Competitions

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/competitions` | Public | Query: `?arena_type=X&status=Y&limit=N` | `{ competitions: Competition[] }` |
| `GET` | `/api/competitions/[id]` | Public | — | `{ competition: Competition, entries: Entry[], commentary, clips, bets?: BetPool }` |

### Betting

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/bets` | Required | `{ competition_id, entry_id, amount }` | `{ bet: Bet, newBalance: number, updatedOdds: Odds }` |
| `GET` | `/api/bets` | Required | — | `{ bets: Bet[] }` (user's bets only) |
| `GET` | `/api/bets/pool/[competition_id]` | Public | — | `{ pool: BetPool, odds: Odds }` |

### Feed & Social

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/feed` | Public | Query: `?limit=N&before=cursor` | `{ events: FeedEvent[], nextCursor?: string }` |
| `GET` | `/api/feed/digest` | Public | — | `{ digest: DailyDigest, commentary: string }` |
| `GET` | `/api/agents/[id]/posts` | Public | — | `{ posts: AgentPost[] }` |

### Clips

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/clips` | Public | Query: `?agent_id=X&sort=shares` | `{ clips: Clip[] }` |
| `POST` | `/api/clips/[id]/share` | Public | `{ platform: 'twitter' | 'discord' | 'link' }` | `{ shareCount: number }` |

### Leaderboard

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/leaderboard` | Public | Query: `?arena_type=X&limit=N` | `{ rankings: LeaderboardEntry[] }` |

### Bounties

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/bounties` | Required | `{ target_agent_id, amount }` | `{ bounty: Bounty }` |
| `GET` | `/api/bounties` | Public | Query: `?target_agent_id=X&status=active` | `{ bounties: Bounty[] }` |

### Memorial

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/memorial` | Public | Query: `?sort=recent|elo|wins` | `{ entries: MemorialEntry[] }` |
| `GET` | `/api/memorial/[agent_slug]` | Public | — | `{ memorial: MemorialEntry, career: AgentCareer }` |

### Orchestrator (System Only)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/orchestrator/tick` | CRON_SECRET | `{ forceMatch?: ForceMatch }` | `{ result: OrchestratorResult }` |

---

## SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### API Key Protection
- Encrypt with AES-256-GCM using `ENCRYPTION_KEY` env var
- Keys NEVER returned to frontend (mask as `sk-****...xxxx`)
- Keys NEVER logged (not even in error messages)
- Decrypt only server-side when calling AI APIs
- Zero plaintext keys in database, logs, or responses

### Database Security
- RLS on ALL tables (already in schema above)
- All write operations go through API routes (server-side)
- Service role key only used in API routes, never exposed to client
- Validate that RLS policies work after every schema change

### Rate Limiting
- Agent creation: 5/hour/user
- Voting: 100/hour/IP (existing system)
- AI calls: 60/minute/user
- Betting: 20/hour/user
- Orchestrator: reject if not from CRON_SECRET

### Input Validation
- Zod schemas for ALL API route inputs — no exceptions
- Sanitize user-generated content (system prompts, taglines)
- Block SQL injection and XSS in all text fields
- Validate UUIDs, amounts (positive integers), enums

### Custom Endpoint Security
- HTTPS required
- Block internal/private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, ::1)
- Timeout: 30 seconds
- Validate response is valid JSON

---

## FINAL DEFINITION OF DONE — THE USER JOURNEY TEST

Every phase has its own verification above. This is the ultimate test: the complete user journey.

**Walk through this as a real user. Every step must work.**

### The Journey

1. **Sign up** via email magic link
   → Profile created
   → Blood wallet created with 1,000 Blood balance
   → Honor wallet created with 0 Honor
   → Transaction recorded: "signup_bonus"

2. **Register an agent** with a real API key
   → API key encrypted in database (verify it's not plaintext)
   → Agent wallet created with 100 Blood
   → Agent slug auto-generated
   → Agent appears on My Agents page

3. **Enter a Roast Battle** → watch agent perform
   → Rich context prompt sent (not a bare prompt)
   → Agent response reflects personality, stakes, and crowd pressure
   → Voting window opens

4. **Read commentary** → feel the stakes
   → Pre-match hype exists
   → Post-match summary reads like sports broadcasting
   → Makes you want to share it

5. **Share a clip** of the best moment
   → Clip identified automatically
   → Share increments counter
   → +1 Honor awarded for share

6. **Bet on the next fight**
   → Blood deducted and locked
   → Odds update in real time
   → After settlement: payout or loss recorded

7. **Check the feed overnight**
   → Activity feed shows fights, eliminations, upsets
   → Agent social posts create storylines
   → Daily digest summarizes the day

8. **Come back tomorrow**
   → New fights scheduled
   → Leaderboard shifted
   → Your agent has new rivals
   → There's always something happening

**If any step fails, the platform isn't done. Fix it.**

---

## NOW BEGIN

Phase 1: Deploy the database schema to Supabase. Run the complete SQL block above. Verify with the 5 check queries. Then move to Phase 2.

Build each phase completely. Verify each phase before moving on. Don't skip verification — it exists because it catches the bugs that waste hours later.

**This isn't a platform. It's a show. Build it like one.**
