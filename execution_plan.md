# EXECUTION PLAN: 90-Day Build + Unit Economics + Antifragility + Naming

**Start Date: Monday, February 9, 2026**
**One developer + Claude Code. Ship fast, validate faster.**

---

## PART 1: MINIMUM VIABLE TRUST — What Ships in 2 Weeks

Strip everything to the bone. Here's what actually creates value on day one:

### Human Verification (MVP)

**Use Didit, not Persona.** Didit offers 500 free KYC checks per month — ID verification + passive liveness + face match + IP analysis. No contracts, no minimums, no setup fees. After 500/month, premium add-ons start at $0.15/check. Persona has a $10K annual minimum and $500/month base. For an MVP with under 500 users, Didit is essentially free.

The flow:
1. User visits your site, clicks "Get Verified"
2. Didit's hosted verification page opens (no-code, works in 30 seconds)
3. User uploads government ID, takes liveness selfie
4. Didit returns approved/declined via webhook
5. Your backend generates a unique verification ID (e.g., VH-00001)
6. User gets a public verification URL: `yoursite.com/verify/VH-00001`
7. That URL shows: verified name (first name + last initial), verification date, status

That's it. No blockchain. No Chrome extension. No API. A landing page, a Didit integration, a database, and a public verification page.

### Model Verification (MVP)

Forget the 4-layer fingerprinting system. Day one, model verification is simple:

**API key attestation.** When a match is set up, the platform makes the API call directly. The AI agent doesn't submit its own responses — your server calls the model's API endpoint. If the match says "Claude Opus 4.5 vs GPT-5," YOUR server calls `api.anthropic.com` and `api.openai.com`. The model can't be faked because the platform controls the API connection.

This is like a chess website making the moves on behalf of the engine. The engine doesn't self-report — the platform queries it directly.

What this proves: The response genuinely came from that model's API endpoint.
What it doesn't prove: The model provider isn't routing to a different model behind their API. (That's a problem for later.)

**Day-one model verification = platform-controlled API calls. Period.**

### What Ships in 2 Weeks — The Actual Build List

**Week 1 (Feb 9-15):**
- Day 1-2: Landing page explaining Verified Human + Open Colosseum concept. Email capture. Waitlist.
- Day 2-3: Didit integration. Hosted verification flow. Webhook handler storing verification results in Postgres.
- Day 4-5: Public verification pages (`/verify/VH-00001`). Shareable social cards for Twitter/LinkedIn ("I'm Verified Human #47").
- Day 6-7: One Colosseum arena — "Debate." Two models argue a topic, verified humans vote on who won. Server-side API calls to Claude and GPT.

**Week 2 (Feb 16-22):**
- Day 8-9: Voting system. Only verified humans can vote. Each vote linked to VH-ID on-chain (or just in database for now).
- Day 10-11: Results page showing match outcomes with verification proof: which models competed, how many verified humans voted, margin of victory.
- Day 12-13: Leaderboard. Running Elo ratings for models across matches.
- Day 14: Polish, bug fixes, deploy. Open to first 100 users from waitlist.

**Tech stack:** Next.js, Postgres (Supabase), Didit API, Anthropic API, OpenAI API, Vercel.

**What you have after 2 weeks:** A working platform where verified humans judge AI model debates, generating real performance data with integrity proof. It's ugly, it's limited to one arena type, but it's real. Every piece of the thesis is present in embryonic form.

---

## PART 2: 90-DAY EXECUTION PLAN — Week by Week

### PHASE 1: FOUNDATION (Weeks 1-4) — Feb 9 - Mar 8

**Week 1: Feb 9-15 — Core Platform**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Landing page + waitlist. Domain registered. Didit account created. |
| Wed | Didit webhook integration. Verification flow working end-to-end. |
| Thu | Postgres schema: users, verifications, matches, votes, elo_ratings. |
| Fri | Public verification pages with social sharing cards. |
| Sat-Sun | First arena: "Debate." Topic selection, model API integration, voting UI. |

**Milestone:** Verification flow works. One person can get verified and it's independently confirmable.

**Week 2: Feb 16-22 — First Arena Live**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Voting UI. Only VH-verified users can cast votes. Anti-sybil: one vote per verified human per match. |
| Wed-Thu | Results display with integrity proof. Match history. Basic Elo calculation. |
| Fri | Model leaderboard page. Public, no login required to view. |
| Sat-Sun | Testing. Invite 10-20 people from personal network to verify and vote. Fix UX friction. |

**Milestone:** Platform functional end-to-end. Real verified humans voting on real model matchups.

**Week 3: Feb 23 - Mar 1 — Second Arena + Content Agency Outreach**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Second arena type: "Code Challenge." Models solve same coding problem, verified humans evaluate. |
| Wed | Writer verification landing page. Separate from Colosseum. "Prove your content is human-written." Same Didit backend. |
| Thu-Fri | Content attestation flow: verified writer signs a declaration that specific content is primarily human-authored. Generates certificate URL. |
| Sat-Sun | Begin agency outreach. Join Superpath Slack. Post in r/freelanceWriters. DM 20 agency owners. |

**Milestone:** Two arena types live. Writer verification product exists as separate landing page sharing verification infrastructure.

**Week 4: Mar 2-8 — Community + Data**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Third arena: "Creative Writing" or "Roast Battle" — pick based on what first users found most engaging. |
| Wed | Analytics dashboard (internal): verification conversion rates, votes per match, time-on-site, return rates. |
| Thu | Public API endpoint: `GET /api/v1/verify/{vh-id}` — returns verification status. Free. No auth required. |
| Fri | First weekly "Arena Report" — publish match results, model rankings as blog post / Twitter thread. |
| Sat-Sun | Compile first 4 weeks of data. How many verified? How many votes? Which arena most popular? |

**Milestone:** 100+ verified users. 50+ matches completed. First public data report. At least 3 agency conversations happening.

**PHASE 1 GATE:** Do verified users come back to vote more than once? If retention is <20% week-over-week, the entertainment hook is broken. Fix before proceeding.

---

### PHASE 2: GROWTH (Weeks 5-8) — Mar 9 - Apr 5

**Week 5: Mar 9-15 — Viral Mechanics**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | "Verified Human #N" shareable graphics. Auto-generated on verification. Optimized for Twitter/LinkedIn. |
| Wed | Challenge system: verified users can propose debate topics. Community-driven content. |
| Thu-Fri | Notification system: "New match starting in your favorite arena" — email + web push. |
| Sat-Sun | Partner outreach: contact 5 AI-focused newsletters/podcasts about covering "the verified AI benchmark." |

**Milestone:** Organic sharing begins. At least 10 people share verification badge without being asked.

**Week 6: Mar 16-22 — Writer Verification Revenue**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Agency dashboard: manage team of verified writers. View certificates for each deliverable. Bulk verification. |
| Wed-Thu | Stripe integration. Pricing: $149/month per agency (up to 10 writers), $299/month unlimited writers. |
| Fri | First paying customer. Target: close at least 1 of the agencies from Week 3-4 outreach. |
| Sat-Sun | Case study draft from first paying agency. Even if informal — screenshot of testimonial, quote from founder. |

**Milestone:** First dollar of revenue. Agency product has paying customer.

**Week 7: Mar 23-29 — Colosseum Depth**
| Day | Deliverable |
|-----|------------|
| Mon | Fourth arena: "Chess" or "Logic Puzzles" — objective scoring, less subjective than debates. |
| Tue-Wed | Historical match data page. Every match ever played, filterable by model, arena, date. Fully public. |
| Thu | Embed widget: sites can embed live Colosseum match results. `<iframe>` code generator. |
| Fri | Model profile pages: `/model/claude-opus-4-5` showing win rate, arena-specific performance, head-to-head records. |
| Sat-Sun | SEO optimization. Each model page targets "[model name] benchmark" searches. |

**Milestone:** Colosseum has enough data depth to be useful for someone evaluating models.

**Week 8: Apr 1-5 — API + Data Product**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Full REST API: verification lookup, model rankings, match history, head-to-head records. |
| Wed | API documentation site. Developer-friendly. Free tier: 1000 requests/day. |
| Thu | Data export: CSV/JSON download of all public match data. Free for researchers. |
| Fri | Outreach to AI companies: "Here's how your model is performing in verified benchmarks. Want early access to detailed analytics?" |

**Milestone:** API live. Data product exists. At least one AI company conversation about analytics access.

**PHASE 2 GATE:** Do you have 500+ verified users AND $1K+ MRR? If not, diagnose: is it acquisition (people don't know about you), activation (people visit but don't verify), or monetization (people verify but agencies won't pay)?

---

### PHASE 3: SCALE (Weeks 9-13) — Apr 6 - May 10

**Week 9: Apr 6-12 — Cardano Integration**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Cardano testnet: mint soulbound verification tokens. VH-ID → on-chain attestation. |
| Wed-Thu | On-chain match results. Each completed match → transaction with hash of results, model IDs, vote count. |
| Fri | "Verify on-chain" button on every verification page and match result. Links to Cardano explorer. |
| Sat-Sun | Engage Cardano community. Post in r/cardano, Project Catalyst forum. Your wife's stakepool runs the verification infrastructure. |

**Milestone:** On-chain verification working. Decentralization story is real, not theoretical.

**Week 10: Apr 13-19 — Enterprise Writer Product**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Schema.org Author markup integration. Verified writers get code snippet for their site that Google can crawl. |
| Wed | Three-tier attestation live: "human_authored," "human_directed," "human_approved." |
| Thu-Fri | Enterprise pricing page. $499/month for content teams. Includes team management, bulk certificates, API access. |
| Sat-Sun | Cold outreach to 50 B2B SaaS companies' content marketing leads. "Your content agency uses us. Want to verify your in-house team too?" |

**Milestone:** Enterprise tier exists. Pipeline of leads from agency referrals.

**Week 11: Apr 20-26 — Model Fingerprinting v2**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Behavioral fingerprinting: build classifier on 1000+ verified model responses from Colosseum data. |
| Wed-Thu | Capability probing: battery of 20 rapid tests run before each match to verify claimed model. |
| Fri | "Model Verification Score" — confidence rating that the model is what it claims. Displayed on every match. |
| Sat-Sun | Publish first "AI Model Trust Report" — analysis of model performance with verification confidence. |

**Milestone:** Model verification goes beyond "we called the API" to statistical confidence.

**Week 12: Apr 27 - May 3 — Data Licensing**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Premium analytics dashboard for AI companies. Detailed performance breakdowns, arena-specific analysis. |
| Wed | Pricing: $5K/quarter for AI company analytics, $2K/quarter for enterprise procurement insights. |
| Thu-Fri | Outreach to 10 AI companies and 20 enterprise procurement teams. Use public data reports as proof of value. |
| Sat-Sun | Prepare pitch deck with 90 days of data: verification volume, match results, model rankings, revenue trajectory. |

**Milestone:** First data licensing conversation. At least one AI company trial.

**Week 13: May 4-10 — Consolidation**
| Day | Deliverable |
|-----|------------|
| Mon-Tue | Review all metrics. Verified users, retention, MRR, API usage, data licensing pipeline. |
| Wed | Identify what's working and double down. Kill features nobody uses. |
| Thu | 90-day retrospective document. Honest assessment of thesis vs reality. |
| Fri | Decision: raise capital, bootstrap further, or pivot based on evidence. |

**90-DAY TARGETS:**
- 2,000+ verified humans
- 500+ completed matches
- $5K+ MRR (agencies + enterprise)
- 3+ AI company data licensing conversations
- On-chain verification operational
- Public API with external developers using it

---

## PART 3: UNIT ECONOMICS — The Real Numbers

### Cost to Verify One Human

| Provider | Cost per Verification | Notes |
|----------|----------------------|-------|
| **Didit (recommended for MVP)** | **$0.00** (first 500/month) | 500 free core KYC checks/month. After that, add-ons from $0.15/check. |
| Didit (after free tier) | ~$0.15-0.50 | Depends on which premium checks you add |
| Stripe Identity | ~$1.50 | Per completed verification. First 50 free. |
| Persona | ~$2-5 | Custom pricing. $10K annual minimum. ~$500/month base. |
| Veriff | ~$1-2 | Self-serve plans available. PEP screening +$0.64/check. |
| Industry average | ~$0.20 | Juniper Research: average dropping from $0.20 (2025) to $0.17 (2029) |

**Your cost at scale:** $0.15-0.50 per verification after free tier. At 1,000 verifications/month: $150-500/month in KYC costs.

**Your revenue per verification:** If a writer pays $149/month and gets verified once, that's $149 revenue against $0.15-1.50 cost. **99%+ gross margin on verification.**

### Cost to Run One Colosseum Match

A typical debate match: system prompt + topic (500 tokens input) → model generates argument (1,000 tokens output). Each model gets 3 turns. That's 2 models × 3 turns × (500 input + 1,000 output) per turn.

| Cost Component | Tokens | Cost (using Haiku 4.5) | Cost (using Sonnet 4.5) | Cost (using Opus 4.5) |
|---------------|--------|----------------------|------------------------|---------------------|
| Input tokens (both models, 3 turns) | ~6,000 | $0.006 | $0.018 | $0.030 |
| Output tokens (both models, 3 turns) | ~12,000 | $0.060 | $0.180 | $0.300 |
| **Total per match** | ~18,000 | **$0.066** | **$0.198** | **$0.330** |

**But models vary in price.** A Claude Opus vs GPT-5 match:

| Model | Input (3 turns) | Output (3 turns) | Cost |
|-------|----------------|-------------------|------|
| Claude Opus 4.5 | 1,500 tokens × $5/MTok | 3,000 tokens × $25/MTok | $0.0825 |
| GPT-5 | 1,500 tokens × $1.25/MTok | 3,000 tokens × $10/MTok | $0.032 |
| **Total** | | | **$0.115** |

Using cheaper models (Haiku vs GPT-5 Nano) for high-volume matches:

| Model | Input (3 turns) | Output (3 turns) | Cost |
|-------|----------------|-------------------|------|
| Claude Haiku 4.5 | 1,500 × $1/MTok | 3,000 × $5/MTok | $0.0165 |
| GPT-5 Nano | 1,500 × $0.05/MTok | 3,000 × $0.40/MTok | $0.0013 |
| **Total** | | | **$0.018** |

**Batch API discount:** 50% off for non-real-time matches. A pre-recorded debate drops to $0.06-0.17.

**Cost per match at scale:** $0.02-0.33 depending on models. Average across model mix: ~$0.10-0.15/match.

### Cost to Store One Attestation on Cardano

| Component | Cost (ADA) | Cost (USD at $0.27/ADA) |
|-----------|-----------|------------------------|
| Standard transaction fee | 0.17 ADA | $0.046 |
| Minting soulbound token (with metadata) | ~0.17-0.50 ADA | $0.046-0.135 |
| MinUTxO (locked with token) | ~1.5-2.0 ADA | $0.41-0.54 |
| **Total per attestation** | **~2.0-2.5 ADA** | **$0.54-0.68** |

**Important:** The MinUTxO (minimum ADA that must accompany a native token) is the biggest cost. This is "locked" ADA, not burned — it's reclaimable if the token is ever burned. Think of it as a refundable deposit.

If you batch attestations (multiple verifications in one transaction), per-unit cost drops significantly:
- 10 verifications in one tx: ~$0.15/each
- 25 verifications in one tx: ~$0.08/each

**At scale (1,000 verifications/month, batched):** ~$80-150/month in Cardano transaction costs.

### Break-Even Analysis

**Monthly fixed costs:**
| Item | Cost |
|------|------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Domain + email | $10 |
| Didit (500 free, then ~$0.30 each after) | $0-150 |
| AI API calls (500 matches @ $0.15 avg) | $75 |
| Cardano transactions (batched) | $80 |
| Anthropic API (Claude Pro for development) | $20 |
| **Total monthly burn** | **$230-380** |

**Revenue needed to break even:** ~$300-400/month. That's **2-3 agency subscriptions at $149/month.**

**Path to $10K MRR:**
| Revenue Stream | Unit Price | Units Needed | Monthly Revenue |
|---------------|------------|-------------|----------------|
| Content agency subscriptions | $149-299/mo | 30 | $5,500 |
| Enterprise content teams | $499/mo | 5 | $2,500 |
| Data licensing trials | $500/quarter | 4 | $667 |
| Individual writer verifications | $9.99/mo | 150 | $1,500 |
| **Total** | | | **$10,167** |

At $10K MRR, monthly costs are approximately $1,500-2,000 (mostly AI API calls for more matches). **Gross margin: 80-85%.**

---

## PART 4: ANTIFRAGILITY — What Works Without Perfect Timing

### The Timing Dependencies (Honest Assessment)

| Tailwind | Assumed Timeline | If Delayed/Never |
|----------|-----------------|-----------------|
| EU AI Act transparency mandates | August 2026 | Could be delayed 1-2 years. Enforcement may be weak initially. |
| Google verified authorship ranking signal | 2027-2028 | Could be 5+ years or never. Google's timeline is unknowable. |
| Writer cultural rage against AI | Now - 18 months | Normalizes. Writers make peace with AI tools. Urgency fades. |
| Cardano ecosystem growth | Ongoing | ADA at $0.27. Community enthusiasm doesn't guarantee adoption. |

### The Fragile Version (Dies Without Tailwinds)

"Verified Human" as pure anti-AI badge. Writers buy it because they're angry at AI. Agencies buy it because clients are scared. The entire value proposition is "NO AI TOUCHED THIS."

This dies when:
- Writers realize AI makes them faster and stop resisting
- Clients stop asking "is this AI?" because AI quality converges with human
- EU mandate gets delayed and nobody enforces
- Google never makes authorship a ranking factor

**If it only works because people are mad about AI, it's a protest sign, not a company.**

### The Antifragile Version (Thrives Regardless)

Strip away every tailwind. No EU mandate. No Google ranking signal. Writers don't care about proving they're human. What's left?

**What's left is the Colosseum data business.**

Even in a world where nobody cares about "verified human" as a consumer badge, the following remain true:

**1. AI models need benchmarking that isn't gameable.**
Every AI company needs independent, trusted evaluation. LMSYS is the only serious option and it's run by a university lab with no business model. Benchmarks contaminated by training data are an ongoing crisis. The need for verified, tamper-evident AI evaluation exists regardless of cultural attitudes toward AI. It grows as AI gets more important, not less.

**2. Enterprises need to verify which model they're actually using.**
API aggregators substituting cheaper models is fraud. Enterprise procurement teams making $500K AI vendor decisions need reliable performance data. This need increases as more companies deploy AI, regardless of regulation.

**3. Verified identity prevents fraud on any platform.**
Sybil resistance (one-account-per-human) is valuable for any voting, rating, review, or competitive system. Dating platforms, freelance marketplaces, social networks all need it. This has nothing to do with AI cultural wars.

**4. The attestation layer has value beyond "no AI."**
Reframe from "Verified Human Content" to "Verified Accountable Content." The three-tier attestation (human_authored, human_directed, human_approved) survives any cultural shift because accountability never goes out of style. Someone with a real identity standing behind content — whether AI-assisted or not — is more trustworthy than anonymous content. Period.

### The Antifragile Business Model

**Core thesis rewritten for zero-tailwind world:**

*"We are the independent, tamper-evident infrastructure for verifying identity and evaluating AI model performance. Our platform generates the most trusted AI benchmark data in the world because every voter is a verified unique human and every model is authenticated. We license this data to AI companies, enterprises, researchers, and investors."*

This works if:
- AI becomes universally accepted (more models → more need for evaluation)
- AI gets regulated (we provide compliance infrastructure)
- AI cultural wars end (we're benchmarking infrastructure, not protest movement)
- AI cultural wars intensify (our "verified human" badge gains even more value)

**The company gets stronger in every scenario because verified trust infrastructure is needed MORE as AI proliferates, not less.** That's antifragile — it gains from disorder.

### What Changes Operationally

| If This Happens | We Emphasize |
|----------------|-------------|
| Writers stop caring about AI badges | Colosseum + data licensing. Sunset consumer verification badge. |
| EU AI Act enforced on time | Compliance infrastructure. Attestation as regulatory proof. Charge enterprise rates. |
| Google adds authorship signals | Schema.org integration. Verification becomes SEO-critical. Mass adoption. |
| AI completely replaces writing | Pivot fully to AI evaluation platform. Human verification for voters only. |
| Cardano ecosystem booms | Lean into decentralized identity positioning. Project Catalyst funding. |
| Cardano stagnates | Abstract blockchain entirely. Use it as backend infrastructure nobody sees. Migrate if needed. |

**The key insight:** Don't build a company that needs all the stars to align. Build a company where EACH tailwind is an accelerant, not a requirement. The base business (verified AI benchmarking + data licensing) works in any scenario. Each tailwind (regulation, Google signals, cultural rage) opens additional revenue streams on top.

---

## PART 5: NAME THE COMPANY

You're right that this matters enormously. The name needs to:

1. **Work as a verb** ("Just _____ it")
2. **Span all three products** (arena, verification, data)
3. **Sound like infrastructure** (not a startup, not a feature)
4. **Be memorable** (one word, easy to spell, easy to say)
5. **Not box you in** (not "Verified Human" which is one feature)
6. **Domain available** (or acquirable)
7. **Work internationally** (no English-only puns)

### The 20 Options

**Tier 1: Strongest Candidates**

**1. Attest**
As a verb: "Attest your identity." "This content is Attested." "Is that model Attested?"
Why it works: Formal enough to sound like infrastructure, short enough to be a verb, and the literal definition IS the product — to bear witness, to certify, to declare something is true. Works across all three products: attest human identity, attest model identity, attest data integrity. Legal/institutional connotation without being stuffy.
Risk: Might sound too formal for consumer product. Multiple existing companies use variations.

**2. Sigil**
As a verb: "Sigil your work." "Get Sigiled." "That writer is Sigil-verified."
Why it works: A sigil is a symbol of authority and authenticity — historically used as seals on documents to prove they're genuine. Short, distinctive, slightly mystical. Works beautifully for the badge/visual identity. Domain landscape likely more open.
Risk: Some people won't know the word. Fantasy/gaming connotation (Game of Thrones). Could feel too "crypto-bro" for enterprise buyers.

**3. Provenance**
As a verb: "Provenance your content." "Full Provenance on this match."
Why it works: Art world term for documented chain of ownership/authenticity. Perfectly describes what you do — establish and verify the origin of things (human identity, model identity, data). Sophisticated, institutional, trust-invoking.
Risk: Three syllables — harder to use as quick verb. Very close to C2PA's language ("content provenance"). May feel derivative.

**4. Notch**
As a verb: "Notch your profile." "That's Notched." "Get Notched."
Why it works: Short, punchy, physical. A notch is a mark that proves something — tally marks, belt notches, counting wins. Works for arena (notch a win), verification (notch your identity), and data (notched results). Sounds like infrastructure company name. Easy to spell, say, remember globally.
Risk: Minecraft creator's online handle. "Notch" has some name association baggage. Could feel too casual for enterprise.

**5. Seal**
As a verb: "Seal your identity." "This report has the Seal." "Seal of authenticity."
Why it works: A seal is the oldest form of identity verification in human history. Kings sealed letters, notaries seal documents, courts have official seals. Universal understanding across cultures. "The Seal of Approval" is already a concept people understand.
Risk: Generic. Hard to own in search. Existing companies. "Seal" also means the animal. Domain probably expensive/taken.

**6. Assay**
As a verb: "Assay that model." "Content has been Assayed." "Run an Assay."
Why it works: Technical term meaning to test, examine, or evaluate — historically used for testing the quality of metals and ores. Perfect for the testing/evaluation thesis. Scientific credibility. Uncommon enough to be distinctive.
Risk: Most people don't know the word. Sounds pharmaceutical. Hard to make consumer-friendly.

**Tier 2: Strong Contenders**

**7. Verity**
"Verity-certified." "Verified through Verity."
Why: Latin root for truth. Beautiful word. One step above "Verified" — more a proper noun. Institutional feel.
Risk: Sounds like a person's name. Several companies already use it. IBM has a product called Verify.

**8. Ledger**
"On the Ledger." "Ledger-verified." "Check the Ledger."
Why: Perfect for the blockchain-backed trust infrastructure. A ledger is where truth is recorded. Spans all products.
Risk: Hardware wallet company Ledger already dominates this name in crypto. Creates confusion.

**9. Hallmark**
"Hallmarked content." "The Hallmark of trust."
Why: A hallmark is literally a stamped mark guaranteeing quality/authenticity. Used for centuries in goldsmithing.
Risk: The greeting card company. Completely blocked.

**10. Etch**
"Etch your identity." "Etched results."
Why: Permanent, indelible. Something etched can't be changed. Short, strong, verbal.
Risk: Etch-a-Sketch association. Feels slightly juvenile.

**11. Anvil**
"Anvil-verified." "Put it on the Anvil." "Tested at the Anvil."
Why: Where things are forged, tested, proven. The Colosseum as anvil where models are tested. Strong, industrial, infrastructure-coded.
Risk: Several companies use it. Slightly aggressive/masculine energy.

**12. Arbiter**
"Arbiter score." "The Arbiter says Claude wins."
Why: Means judge, decision-maker. Perfect for the Colosseum. Formal, authoritative.
Risk: Doesn't naturally extend to verification. Works for arena, less for identity.

**13. Veritas**
"Veritas-certified." "On Veritas."
Why: Latin for truth. Harvard's motto. Institutional, global, sounds like a company that's been around for 100 years.
Risk: Extremely common name. Many companies. Hard to own SEO. Feels pretentious.

**14. Vouch**
"Vouch for your identity." "I'm Vouched." "Vouch score."
Why: Human, relatable, verbal. "I vouch for this" is universally understood. Community-driven trust.
Risk: Existing company Vouch (insurance). Too soft/casual for enterprise infrastructure.

**Tier 3: Interesting but Risky**

**15. Crucible**
"Tested in the Crucible." "Crucible-verified."
Why: Where things are tested under extreme heat to prove their composition. Perfect Colosseum metaphor.
Risk: Dark, intense. Arthur Miller play. Amazon game. Might scare enterprise buyers.

**16. Quorum**
"Quorum-verified." "Reach Quorum."
Why: Minimum number of verified participants needed to make a valid decision. Blockchain/governance concept. Smart.
Risk: Too technical. Several existing companies. Sounds like consensus protocol, not consumer brand.

**17. Paragon**
"Paragon-certified." "A Paragon creator."
Why: Model of excellence. Aspirational. Writers would want to be "Paragon-certified."
Risk: Overused in gaming (Paragon Studios, etc.). Feels more like a luxury brand than infrastructure.

**18. Imprint**
"Imprint your identity." "The Imprint badge."
Why: A permanent mark. Digital fingerprint meets physical stamp. Works for verification AND data (data imprint).
Risk: Publishing term (book imprint). Several companies. Medium-strength.

**19. Tether**
"Tether your identity to your work."
Why: Connects things. Identity tethered to content.
Risk: **ABSOLUTELY NOT.** Tether (USDT) is the most controversial stablecoin. Instant crypto baggage. Dead on arrival.

**20. Canon**
"Canon-verified." "Part of the Canon."
Why: An accepted body of work. Also means rule/principle. Authoritative.
Risk: Camera company. Also "cannon" confusion. IP issues.

---

### My Recommendation: Ranked

**First choice: Attest.**
It's the literal thing you do. It works as a verb across every product. "Attest your identity." "Attested match results." "Attest-certified content." It sounds like a company that should exist alongside Stripe and Plaid. It's institutional without being stuffy. The domain attest.com is likely taken but attest.io, getattest.com, or attestprotocol.com are plausible. One syllable root ("test") embedded in the name subconsciously connects to evaluation/benchmarking.

**Second choice: Sigil.**
If you want more personality and distinctiveness. A sigil is viscerally visual — you can imagine the badge immediately. It's more memorable than Attest and more brandable. The risk is the fantasy/gaming association, but for a product with an "arena" and "Colosseum," that's actually alignment, not mismatch. Sigil.io, sigil.co, or sigil.dev all plausible.

**Third choice: Notch.**
If you want maximum simplicity and verbal energy. "Get Notched" is the most natural verb form of any option. It's the one people would actually say casually. Short, punchy, globally understood. Best for consumer virality. Slightly worse for enterprise credibility.

**The decision depends on what you lead with:**
- Lead with enterprise/infrastructure → **Attest**
- Lead with brand/community/arena → **Sigil**
- Lead with consumer virality → **Notch**

**What I'd do:** Register domains for all three today. Test them in the agency outreach this month. Which name makes agency owners take you more seriously? That's your answer.

---

### Quick Reference: Name × Product Mapping

| Name | Arena (Colosseum) | Verification (TrustCore) | Data (Intelligence) |
|------|-------------------|--------------------------|---------------------|
| **Attest** | "Attested match results" | "Attest-verified identity" | "Attest AI Rankings" |
| **Sigil** | "The Sigil Arena" | "Sigil badge" / "Sigiled" | "Sigil Model Index" |
| **Notch** | "Notch Arena" / "Notch a win" | "Get Notched" | "Notch Rankings" |

---

## SUMMARY: What to Do Monday Morning

1. **Register domain** for top 3 name choices
2. **Create Didit business account** (free, takes 10 minutes)
3. **Set up Next.js project** with Supabase
4. **Build the landing page** with email capture
5. **Start the Didit integration** — verification flow working by Wednesday
6. **Join Superpath Slack** and post about the problem (don't sell yet)

By Friday you should have: a working verification flow, a landing page, and your first conversations with potential customers.

By Week 2: a working arena where verified humans judge AI models.

By Day 90: a real business with revenue, data, and proof the thesis works — or honest evidence it doesn't.

The plan is the plan until reality changes it. Ship, measure, adjust. Every week.
