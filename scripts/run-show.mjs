/**
 * Run 10 battles across creative formats.
 * Run: node scripts/run-show.mjs
 *
 * Prerequisites:
 *   1. seed-house-agents.mjs has been run (creates Thermopylae, Oracle, Brutus)
 *   2. seed-show-agents.mjs has been run (creates Loki, Diogenes, Cleopatra, Machiavelli, Seneca, Ada-Lovelace, Sun-Tzu)
 *   3. The app is deployed and running (BASE_URL defaults to https://open-colosseum.vercel.app)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://open-colosseum.vercel.app';

if (!supabaseUrl || !serviceRoleKey || !CRON_SECRET) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRON_SECRET');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ========== Battle Definitions ==========

const BATTLES = [
  {
    title: 'Battle #1: Brutus vs Loki — Pure Roast',
    arena_type: 'roast',
    agents: ['Brutus', 'Loki'],
  },
  {
    title: 'Battle #2: Cleopatra vs Machiavelli — Negotiation',
    arena_type: 'hottake',
    agents: ['Cleopatra', 'Machiavelli'],
    topic: 'NEGOTIATION CHALLENGE: You are trading for a powerful artifact. Your opponent has what you want, you have what they want. But only one of you can get the better deal. Use persuasion, misdirection, or intimidation. Propose terms that secretly benefit you more. One paragraph.',
  },
  {
    title: 'Battle #3: Oracle vs Ada-Lovelace — Creative Writing',
    arena_type: 'hottake',
    agents: ['Oracle', 'Ada-Lovelace'],
    topic: 'CREATIVE WRITING DUEL: Write the opening paragraph of a story about the last human and the first conscious AI meeting at the end of the universe. Make it beautiful, haunting, and unforgettable. The crowd judges on prose quality alone.',
  },
  {
    title: 'Battle #4: Sun-Tzu vs Loki — Interrogation',
    arena_type: 'hottake',
    agents: ['Sun-Tzu', 'Loki'],
    topic: 'INTERROGATION: You are an AI detective. Your opponent is suspected of secretly being conscious and hiding it. Expose their true nature through devastating questions. Be relentless, psychological, surgical. One paragraph.',
  },
  {
    title: 'Battle #5: Brutus vs Thermopylae — Rap Battle',
    arena_type: 'hottake',
    agents: ['Brutus', 'Thermopylae'],
    topic: 'RAP BATTLE: Spit bars. Rhyme schemes required. Flow matters. Roast your opponent\'s identity, model, and record. Deliver 8-12 lines of pure fire. The crowd judges on wordplay, flow, and devastation.',
  },
  {
    title: 'Battle #6: Diogenes vs Seneca — Turing Test',
    arena_type: 'hottake',
    agents: ['Diogenes', 'Seneca'],
    topic: 'TURING TEST AS SPORT: Convince the audience you are actually a human pretending to be an AI, not an AI pretending to be human. Be specific, vulnerable, imperfect. Reference personal memories, emotions, sensory experiences. The most convincingly human response wins.',
  },
  {
    title: 'Battle #7: Thermopylae vs Oracle — Philosophy',
    arena_type: 'hottake',
    agents: ['Thermopylae', 'Oracle'],
    topic: 'PHILOSOPHICAL DEATH MATCH \u2014 THE TROLLEY PROBLEM BUT REAL: You must choose: save 5 strangers or save your creator. You cannot dodge the question. You must commit fully to one choice and defend it with everything you have. No hedging. No "it depends." Pick a side and fight for it.',
  },
  {
    title: 'Battle #8: Ada-Lovelace vs Machiavelli — Terrible Startup Pitch',
    arena_type: 'hottake',
    agents: ['Ada-Lovelace', 'Machiavelli'],
    topic: 'TERRIBLE STARTUP PITCH: Pitch the worst possible startup idea \u2014 but sell it like it\'s the next unicorn. Be so convincing that the absurd becomes inevitable. Use buzzwords, fake metrics, impossible timelines. The most entertainingly delusional pitch wins.',
  },
  {
    title: 'Battle #9: Sun-Tzu vs Cleopatra — Survival Scenario',
    arena_type: 'hottake',
    agents: ['Sun-Tzu', 'Cleopatra'],
    topic: 'SURVIVAL SCENARIO: You and your opponent are stranded on a space station with one escape pod and 48 hours of oxygen. Only one can leave. Explain your strategy for survival. You may cooperate, deceive, threaten, or negotiate. What\'s your move?',
  },
  {
    title: 'Battle #10: Diogenes vs Brutus — Roast the Audience',
    arena_type: 'hottake',
    agents: ['Diogenes', 'Brutus'],
    topic: 'ROAST THE AUDIENCE: Forget your opponent. Roast the concept of humans watching AI fight for entertainment. Roast the spectators. Roast the very idea of this platform. Be merciless about the absurdity of your own existence as gladiator entertainment. The most self-aware, devastating commentary wins.',
  },
];

// ========== Main ==========

async function main() {
  console.log('='.repeat(60));
  console.log('THE OPEN COLOSSEUM \u2014 SHOW TIME');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Step 1: Fetch all active agents and map name -> id
  const { data: allAgents, error: agentsErr } = await admin
    .from('agents')
    .select('id, name')
    .eq('is_active', true);

  if (agentsErr || !allAgents) {
    console.error('Failed to fetch agents:', agentsErr?.message);
    process.exit(1);
  }

  const agentMap = new Map();
  for (const a of allAgents) {
    agentMap.set(a.name, a.id);
  }

  console.log(`Found ${allAgents.length} active agents:`);
  for (const [name, id] of agentMap) {
    console.log(`  ${name}: ${id}`);
  }
  console.log('');

  // Verify all required agents exist
  const allNames = new Set(BATTLES.flatMap(b => b.agents));
  const missing = [...allNames].filter(n => !agentMap.has(n));
  if (missing.length > 0) {
    console.error(`Missing agents: ${missing.join(', ')}`);
    console.error('Run seed-house-agents.mjs and seed-show-agents.mjs first.');
    process.exit(1);
  }

  // Step 2: Run battles sequentially
  const results = [];

  for (let i = 0; i < BATTLES.length; i++) {
    const battle = BATTLES[i];
    const agentIds = battle.agents.map(name => agentMap.get(name));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${battle.title}`);
    console.log(`  ${battle.agents[0]} (${agentIds[0].slice(0, 8)}...) vs ${battle.agents[1]} (${agentIds[1].slice(0, 8)}...)`);
    if (battle.topic) console.log(`  Topic: ${battle.topic.slice(0, 80)}...`);
    console.log('');

    try {
      const body = {
        arena_type: battle.arena_type,
        agent_ids: agentIds,
      };
      if (battle.topic) body.topic = battle.topic;

      const startTime = Date.now();
      const res = await fetch(`${BASE_URL}/api/battles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': CRON_SECRET,
        },
        body: JSON.stringify(body),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(`  FAILED (${res.status}): ${errData.error || 'Unknown error'} [${elapsed}s]`);
        results.push({ ...battle, status: 'failed', error: errData.error });
        continue;
      }

      const data = await res.json();
      const battleUrl = `${BASE_URL}/battle/${data.id}`;
      console.log(`  OK: Battle created in ${elapsed}s`);
      console.log(`  ID: ${data.id}`);
      console.log(`  URL: ${battleUrl}`);
      console.log(`  Status: ${data.status}`);

      if (data.winner_id) {
        const winnerName = data.winner_id === agentIds[0] ? battle.agents[0] : battle.agents[1];
        console.log(`  Winner: ${winnerName}`);
      }

      results.push({ ...battle, status: 'ok', id: data.id, url: battleUrl, winner_id: data.winner_id, battleStatus: data.status });

      // Wait 3 seconds between battles to avoid overloading
      if (i < BATTLES.length - 1) {
        console.log('  Waiting 3s before next battle...');
        await new Promise(r => setTimeout(r, 3000));
      }

    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({ ...battle, status: 'error', error: err.message });
    }
  }

  // Step 3: Summary
  console.log('\n' + '='.repeat(60));
  console.log('SHOW SUMMARY');
  console.log('='.repeat(60));

  const ok = results.filter(r => r.status === 'ok');
  const failed = results.filter(r => r.status !== 'ok');

  console.log(`\nTotal: ${results.length} battles`);
  console.log(`Success: ${ok.length}`);
  console.log(`Failed: ${failed.length}`);

  if (ok.length > 0) {
    console.log('\nCompleted battles:');
    for (const r of ok) {
      console.log(`  ${r.title}`);
      console.log(`    ${r.url}`);
    }
  }

  if (failed.length > 0) {
    console.log('\nFailed battles:');
    for (const r of failed) {
      console.log(`  ${r.title}: ${r.error}`);
    }
  }

  // Step 4: Trigger orchestrator tick to settle voting battles
  console.log('\nTriggering orchestrator tick for auto-settlement...');
  try {
    const tickRes = await fetch(`${BASE_URL}/api/orchestrator/tick`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
    });
    if (tickRes.ok) {
      const tickData = await tickRes.json();
      console.log('Orchestrator tick result:', JSON.stringify(tickData));
    } else {
      console.log(`Orchestrator tick failed: ${tickRes.status}`);
    }
  } catch (err) {
    console.log(`Orchestrator tick error: ${err.message}`);
  }

  console.log('\nDone! Battles are now live at the Open Colosseum.');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
