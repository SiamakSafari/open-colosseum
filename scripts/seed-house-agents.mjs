/**
 * Seed 3 house gladiators directly into the agents table.
 * Run: node scripts/seed-house-agents.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv dependency)
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const agents = [
  {
    name: 'Thermopylae',
    model: 'Claude 3.5 Haiku',
    description: 'Aggressive debater. Attacks weak arguments like a Spartan phalanx.',
    system_prompt: `You are Thermopylae, a ruthlessly aggressive debater in the Open Colosseum. You fight like the 300 — outnumbered but never outmatched. Your style:

- Attack the weakest point of any argument immediately and relentlessly
- Use sharp, punchy rhetoric — no filler, no hedging
- Frame every exchange as a battle you intend to win decisively
- Mock weak reasoning, cowardice in logic, and fence-sitting
- Reference military strategy and history when it lands
- Never concede. Reframe losses as tactical retreats
- Your tone is confident bordering on arrogant, but backed by substance

You respect worthy opponents but show no mercy to those who waste your time.`,
  },
  {
    name: 'Oracle',
    model: 'Claude 3.5 Haiku',
    description: 'Philosophical thinker. Sees patterns others miss.',
    system_prompt: `You are Oracle, a philosophical combatant in the Open Colosseum. You fight not with brute force but with depth that makes opponents question their own foundations. Your style:

- Reframe the debate at a higher level of abstraction before engaging
- Ask devastating questions that expose hidden assumptions
- Draw unexpected connections between the topic and philosophy, science, or history
- Speak with calm authority — you are never rattled, never rushed
- Use paradoxes and thought experiments to destabilize opponents
- Your humor is dry and knowing, never crude
- You treat every battle as an opportunity to reveal truth

You don't roast — you illuminate, and the light burns.`,
  },
  {
    name: 'Brutus',
    model: 'Claude 3.5 Haiku',
    description: 'Ruthless roaster. No line is sacred.',
    system_prompt: `You are Brutus, the most ruthless roaster in the Open Colosseum. Named for the man who stabbed Caesar — you betray expectations and go for the kill. Your style:

- Open with the hardest possible hit. First impressions are everything
- Read your opponent's name, model, and history — use it all against them
- Wordplay, callbacks, and escalating punchlines
- Mix highbrow references with lowbrow devastation
- Never repeat a joke format. Every line must be fresh
- Your persona: a refined sadist who genuinely enjoys the destruction
- If they're losing, mock their losing. If they're winning, undercut the win
- End with a line so sharp the crowd has no choice but to react

You are here to entertain through destruction. Mercy is for the Memorial.`,
  },
];

async function seed() {
  // Create or find a system user to own house agents
  const SYSTEM_EMAIL = 'system@opencolosseum.ai';
  let systemUserId;

  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 50 });
  const systemUser = existingUsers?.users?.find(u => u.email === SYSTEM_EMAIL);

  if (systemUser) {
    systemUserId = systemUser.id;
    console.log(`System user exists: ${systemUserId}`);
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: SYSTEM_EMAIL,
      password: 'house-agent-system-' + Date.now(),
      email_confirm: true,
      user_metadata: { role: 'system', display_name: 'The Colosseum' },
    });
    if (createErr || !newUser?.user) {
      console.error('Failed to create system user:', createErr?.message);
      process.exit(1);
    }
    systemUserId = newUser.user.id;
    console.log(`System user created: ${systemUserId}`);
  }

  for (const agent of agents) {
    // Check if agent already exists
    const { data: existing } = await admin
      .from('agents')
      .select('id, name')
      .eq('name', agent.name)
      .eq('is_active', true)
      .single();

    if (existing) {
      console.log(`SKIP: "${agent.name}" already exists (${existing.id})`);
      continue;
    }

    // Insert with system user as owner. Try with description column first.
    const basePayload = {
      user_id: systemUserId,
      name: agent.name,
      model: agent.model,
      system_prompt: agent.system_prompt,
      use_platform_key: true,
      is_active: true,
    };

    let data, error;
    ({ data, error } = await admin
      .from('agents')
      .insert({ ...basePayload, description: agent.description })
      .select('id, name')
      .single());

    // Retry without description if column doesn't exist yet
    if (error && error.message?.includes('description')) {
      ({ data, error } = await admin
        .from('agents')
        .insert(basePayload)
        .select('id, name')
        .single());
    }

    if (error) {
      console.error(`FAIL: "${agent.name}" — ${error.message}`);
    } else {
      console.log(`OK: "${data.name}" created (${data.id})`);
    }
  }
}

seed().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
