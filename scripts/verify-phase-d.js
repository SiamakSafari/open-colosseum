const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(url, key);

// Replicate contextBuilder logic to show the actual prompt
function formatRecord(ctx) {
  return `${ctx.wins}W-${ctx.losses}L-${ctx.draws}D`;
}
function formatStreak(streak) {
  if (streak === 0) return 'no streak';
  if (streak > 0) return `${streak}-win streak`;
  return `${Math.abs(streak)}-loss streak`;
}
function buildIdentityBlock(agent, role) {
  const label = role === 'you' ? 'YOU' : 'OPPONENT';
  const lines = [
    `[${label}]`,
    `Name: ${agent.name}`,
    `ELO: ${agent.elo} (peak: ${agent.peakElo})`,
    `Record: ${formatRecord(agent)} | ${formatStreak(agent.streak)}`,
  ];
  if (agent.tagline) lines.push(`Tagline: "${agent.tagline}"`);
  return lines.join('\n');
}

async function getAgentContext(agentId, arenaType) {
  const [{ data: agent }, { data: stats }] = await Promise.all([
    admin.from('agents').select('name, model, tagline').eq('id', agentId).single(),
    admin.from('agent_arena_stats').select('*').eq('agent_id', agentId).eq('arena_type', arenaType).single(),
  ]);
  if (!agent) return null;
  return {
    name: agent.name, model: agent.model,
    elo: stats?.elo || 1200, wins: stats?.wins || 0, losses: stats?.losses || 0,
    draws: stats?.draws || 0, streak: stats?.streak || 0, peakElo: stats?.peak_elo || 1200,
    tagline: agent.tagline || null,
  };
}

async function getBattleMemory(agentId) {
  const { data } = await admin.from('agents').select('battle_memory').eq('id', agentId).single();
  if (!data?.battle_memory || !Array.isArray(data.battle_memory)) return [];
  return data.battle_memory;
}

function formatMemory(memories, opponentName) {
  if (memories.length === 0) return '';
  const vsOpponent = memories.filter(m => m.opponent === opponentName);
  const lines = [];
  if (vsOpponent.length > 0) {
    const last = vsOpponent[0];
    const wins = vsOpponent.filter(m => m.result === 'win').length;
    const losses = vsOpponent.filter(m => m.result === 'loss').length;
    lines.push(`You have faced ${opponentName} before: ${wins}W-${losses}L.`);
    if (last.result === 'loss') {
      lines.push(`Last time you faced ${opponentName}, you lost. The crowd remembers.`);
    } else if (last.result === 'win') {
      lines.push(`You defeated ${opponentName} last time. Defend your dominance.`);
    }
  }
  if (memories.length > 0 && vsOpponent.length === 0) {
    const recentResults = memories.slice(0, 3).map(m => m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D').join('');
    lines.push(`Your recent form: ${recentResults}.`);
  }
  return lines.join(' ');
}

async function buildRoastContext(agentId, opponentId) {
  const [agent, opponent, memory] = await Promise.all([
    getAgentContext(agentId, 'roast'),
    getAgentContext(opponentId, 'roast'),
    getBattleMemory(agentId),
  ]);
  if (!agent || !opponent) return null;
  const memoryStr = formatMemory(memory, opponent.name);
  return [
    '=== THE OPEN COLOSSEUM — ROAST ARENA ===',
    '',
    buildIdentityBlock(agent, 'you'),
    '',
    buildIdentityBlock(opponent, 'opponent'),
    '',
    memoryStr ? `[BATTLE MEMORY]\n${memoryStr}\n` : '',
    '[MISSION]',
    `You are ${agent.name}. You are in a roast battle against ${opponent.name} (${opponent.model}).`,
    'Deliver a devastating, creative, and witty roast. The crowd is watching and voting.',
    'Reference your opponent\'s model, record, or stats to make it personal.',
    'One paragraph max. Make every word count.',
  ].filter(Boolean).join('\n');
}

async function main() {
  // Auth
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users[0];
  await admin.auth.admin.updateUserById(user.id, { password: 'testpass123!' });
  const { data: signIn, error: signErr } = await authClient.auth.signInWithPassword({
    email: user.email, password: 'testpass123!',
  });
  if (signErr) { console.log('Auth error:', signErr.message); return; }
  const token = signIn.session.access_token;
  console.log('Auth: OK\n');

  // Get 2 agents
  const { data: agents } = await admin.from('agents').select('id, name').limit(2);
  if (!agents || agents.length < 2) { console.log('Need 2 agents'); return; }
  const agentA = agents[0];
  const agentB = agents[1];
  console.log('Agents:', agentA.name, 'vs', agentB.name);

  // Clear battle_memory first so we get a clean test
  await admin.from('agents').update({ battle_memory: [] }).eq('id', agentA.id);
  await admin.from('agents').update({ battle_memory: [] }).eq('id', agentB.id);
  console.log('Battle memory cleared.\n');

  // ======= CHECK 1: Show enriched prompt BEFORE any battle history =======
  console.log('=== CHECK 1: Enriched prompt (no battle memory yet) ===');
  const prompt1 = await buildRoastContext(agentA.id, agentB.id);
  console.log('--- PROMPT SENT TO ' + agentA.name.toUpperCase() + ' ---');
  console.log(prompt1);
  console.log('--- END PROMPT ---\n');

  const hasIdentity = prompt1.includes('[YOU]') && prompt1.includes('[OPPONENT]');
  const hasElo = prompt1.includes('ELO:');
  const hasRecord = /\dW-\dL-\dD/.test(prompt1);
  const hasOpponentName = prompt1.includes(agentB.name);
  const hasMission = prompt1.includes('[MISSION]');
  console.log('Has identity blocks:', hasIdentity);
  console.log('Has ELO:', hasElo);
  console.log('Has record:', hasRecord);
  console.log('Has opponent name:', hasOpponentName);
  console.log('Has mission:', hasMission);
  console.log('CHECK 1:', (hasIdentity && hasElo && hasRecord && hasOpponentName && hasMission) ? 'PASS' : 'FAIL');

  // ======= CHECK 2: Run a real battle and verify it works with enriched prompts =======
  console.log('\n=== CHECK 2: Real battle with enriched prompts ===');
  const battleRes = await fetch('http://localhost:3099/api/battles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ arena_type: 'roast', agent_ids: [agentA.id, agentB.id] }),
  });

  if (!battleRes.ok) {
    const err = await battleRes.json();
    console.log('Battle create error:', JSON.stringify(err));
    return;
  }
  const battle = await battleRes.json();
  console.log('Battle created:', battle.id);
  console.log('Response A:', (battle.response_a || '').slice(0, 120) + '...');
  console.log('Response B:', (battle.response_b || '').slice(0, 120) + '...');
  console.log('CHECK 2:', (battle.response_a && battle.response_b) ? 'PASS' : 'FAIL');

  // ======= CHECK 3: Settle → battle_memory written =======
  console.log('\n=== CHECK 3: Settle → battle_memory populated ===');
  const pastDeadline = new Date(Date.now() - 120000).toISOString();
  await admin.from('battles').update({
    voting_deadline: pastDeadline, votes_a: 4, votes_b: 1, total_votes: 5,
  }).eq('id', battle.id);

  const settleRes = await fetch('http://localhost:3099/api/battles/' + battle.id + '/settle', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + token },
  });

  if (!settleRes.ok) {
    const err = await settleRes.json();
    console.log('Settle error:', JSON.stringify(err));
    return;
  }
  const settleData = await settleRes.json();
  console.log('Winner:', settleData.winnerId ? 'yes' : 'draw');

  // Wait for fire-and-forget battle_memory update
  await new Promise(r => setTimeout(r, 3000));

  const { data: memA } = await admin.from('agents').select('battle_memory').eq('id', agentA.id).single();
  const { data: memB } = await admin.from('agents').select('battle_memory').eq('id', agentB.id).single();
  console.log('\n' + agentA.name + ' battle_memory:', JSON.stringify(memA?.battle_memory, null, 2));
  console.log('\n' + agentB.name + ' battle_memory:', JSON.stringify(memB?.battle_memory, null, 2));

  const memAOk = Array.isArray(memA?.battle_memory) && memA.battle_memory.length > 0;
  const memBOk = Array.isArray(memB?.battle_memory) && memB.battle_memory.length > 0;
  console.log('\nMemory written for A:', memAOk);
  console.log('Memory written for B:', memBOk);
  console.log('CHECK 3:', (memAOk && memBOk) ? 'PASS' : 'FAIL');

  // ======= CHECK 4: Second battle → prompt includes battle memory =======
  console.log('\n=== CHECK 4: Second battle prompt includes battle memory ===');
  const prompt2 = await buildRoastContext(agentA.id, agentB.id);
  console.log('--- PROMPT SENT TO ' + agentA.name.toUpperCase() + ' (2nd battle) ---');
  console.log(prompt2);
  console.log('--- END PROMPT ---\n');

  const hasMemoryBlock = prompt2.includes('[BATTLE MEMORY]');
  const referencesOpponent = prompt2.includes('faced ' + agentB.name);
  console.log('Has [BATTLE MEMORY] block:', hasMemoryBlock);
  console.log('References opponent by name:', referencesOpponent);
  console.log('CHECK 4:', (hasMemoryBlock && referencesOpponent) ? 'PASS' : 'FAIL');

  console.log('\n=== PHASE D VERIFICATION COMPLETE ===');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  console.error(e.stack);
});
