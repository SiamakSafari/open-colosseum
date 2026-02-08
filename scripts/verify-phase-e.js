const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(url, key);

const BASE = 'http://localhost:3099';

async function main() {
  // ======= SETUP: Auth + ensure user has Blood =======
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users[0];
  await admin.auth.admin.updateUserById(user.id, { password: 'testpass123!' });
  const { data: signIn, error: signErr } = await authClient.auth.signInWithPassword({
    email: user.email, password: 'testpass123!',
  });
  if (signErr) { console.log('Auth error:', signErr.message); return; }
  const token = signIn.session.access_token;
  console.log('Auth: OK (' + user.email + ')');

  // Give user plenty of Blood for testing
  await admin.from('user_wallets').update({ balance: 500, locked_balance: 0 }).eq('user_id', user.id);
  const { data: walletBefore } = await admin.from('user_wallets').select('balance, locked_balance').eq('user_id', user.id).single();
  console.log('Wallet before:', walletBefore.balance, 'Blood (locked:', walletBefore.locked_balance + ')');

  // Verify user has at least one agent (needed for wallet FK)
  const { data: userAgents } = await admin.from('agents').select('id, name').eq('user_id', user.id).limit(1);
  if (!userAgents || userAgents.length === 0) {
    console.log('User has no agents. Creating one...');
    // Use API to create an agent
    const agentRes = await fetch(BASE + '/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name: 'TestBetAgent', model: 'Claude 3.5 Haiku' }),
    });
    if (!agentRes.ok) { console.log('Failed to create agent'); return; }
    console.log('Created test agent for betting');
  } else {
    console.log('User agent:', userAgents[0].name);
  }
  console.log('');

  // ======= CHECK 1: Create battle → bet pool auto-created =======
  console.log('=== CHECK 1: Battle creation → bet pool ===');
  const { data: agents } = await admin.from('agents').select('id, name').limit(2);
  if (!agents || agents.length < 2) { console.log('Need 2 agents'); return; }
  console.log('Agents:', agents[0].name, 'vs', agents[1].name);

  const battleRes = await fetch(BASE + '/api/battles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ arena_type: 'roast', agent_ids: [agents[0].id, agents[1].id] }),
  });
  if (!battleRes.ok) {
    const err = await battleRes.json();
    console.log('Battle error:', JSON.stringify(err));
    return;
  }
  const battle = await battleRes.json();
  console.log('Battle created:', battle.id);

  // Wait for fire-and-forget bet pool creation
  await new Promise(r => setTimeout(r, 2000));

  const { data: pool } = await admin.from('bet_pools').select('*').eq('battle_id', battle.id).single();
  console.log('Bet pool:', pool ? 'FOUND (id: ' + pool.id + ', status: ' + pool.status + ')' : 'NOT FOUND');
  console.log('CHECK 1:', pool ? 'PASS' : 'FAIL');
  if (!pool) { console.log('Cannot continue without bet pool'); return; }

  // ======= CHECK 2: Place bet on side A → Blood deducted =======
  console.log('\n=== CHECK 2: Place bet on side A ===');
  const bet1Res = await fetch(BASE + '/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ pool_id: pool.id, side: 'a', amount: 100 }),
  });
  const bet1Data = await bet1Res.json();
  console.log('Bet response:', JSON.stringify(bet1Data));
  console.log('Status:', bet1Res.status);

  const { data: walletAfterBet1 } = await admin.from('user_wallets').select('balance, locked_balance').eq('user_id', user.id).single();
  console.log('Wallet after bet 1:', walletAfterBet1.balance, 'Blood (locked:', walletAfterBet1.locked_balance + ')');

  const balanceDeducted = walletAfterBet1.balance === walletBefore.balance - 100;
  console.log('Balance deducted correctly:', balanceDeducted);
  console.log('CHECK 2:', (bet1Res.status === 201 && balanceDeducted) ? 'PASS' : 'FAIL');

  // ======= CHECK 3: Check odds update after bet =======
  console.log('\n=== CHECK 3: Odds after first bet ===');
  const oddsRes1 = await fetch(BASE + '/api/bets/pool/' + pool.id);
  const odds1 = await oddsRes1.json();
  console.log('Pool total:', odds1.totalPool);
  console.log('Side A:', odds1.sides.a.amount, 'Blood (' + odds1.sides.a.percentage + '%)');
  console.log('Side B:', odds1.sides.b.amount, 'Blood (' + odds1.sides.b.percentage + '%)');
  console.log('CHECK 3:', odds1.sides.a.amount === 100 ? 'PASS' : 'FAIL');

  // ======= Place a second bet on side B (simulated via admin) =======
  console.log('\n=== Placing opposing bet on side B (via admin) ===');
  // Get any valid wallet for the FK
  const { data: anyWallet } = await admin.from('wallets').select('id').limit(1).single();
  await admin.from('bets').insert({
    pool_id: pool.id,
    wallet_id: anyWallet.id,
    side: 'b',
    amount: 50,
  });
  await admin.from('bet_pools').update({
    total_pool_b: 50,
  }).eq('id', pool.id);

  const oddsRes2 = await fetch(BASE + '/api/bets/pool/' + pool.id);
  const odds2 = await oddsRes2.json();
  console.log('Pool after 2 bets:');
  console.log('  Total pool:', odds2.totalPool, 'Blood');
  console.log('  Side A:', odds2.sides.a.amount, 'Blood (' + odds2.sides.a.percentage + '%, odds ' + odds2.sides.a.odds + 'x)');
  console.log('  Side B:', odds2.sides.b.amount, 'Blood (' + odds2.sides.b.percentage + '%, odds ' + odds2.sides.b.odds + 'x)');

  // ======= CHECK 4: Settle battle → payouts distributed =======
  console.log('\n=== CHECK 4: Settle → payout math ===');

  // Fast-forward voting deadline, set votes so agent A wins
  const pastDeadline = new Date(Date.now() - 120000).toISOString();
  await admin.from('battles').update({
    voting_deadline: pastDeadline,
    votes_a: 6,
    votes_b: 2,
    total_votes: 8,
  }).eq('id', battle.id);

  const settleRes = await fetch(BASE + '/api/battles/' + battle.id + '/settle', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!settleRes.ok) {
    const err = await settleRes.json();
    console.log('Settle error:', JSON.stringify(err));
    return;
  }
  const settleData = await settleRes.json();
  console.log('Winner:', settleData.winner_id ? 'Agent A' : 'draw');

  // Wait for fire-and-forget settlement
  await new Promise(r => setTimeout(r, 3000));

  // Check bet pool status
  const { data: poolAfter } = await admin.from('bet_pools').select('*').eq('id', pool.id).single();
  console.log('\nPool status:', poolAfter.status);
  console.log('Pool winner:', poolAfter.winner);

  // Check bets
  const { data: allBets } = await admin.from('bets').select('*').eq('pool_id', pool.id).order('created_at');
  console.log('\n--- PAYOUT MATH ---');
  console.log('Total pool: 150 Blood (100 on A + 50 on B)');
  console.log('Rake (5%): ' + Math.floor(150 * 0.05) + ' Blood');
  console.log('Distributable: ' + (150 - Math.floor(150 * 0.05)) + ' Blood');
  console.log('Winner: Side A (100% of winning pool)');
  console.log('Expected payout to side A bettor: ' + (150 - Math.floor(150 * 0.05)) + ' Blood');
  console.log('');

  for (const bet of allBets) {
    console.log(`Bet ${bet.id.slice(0,8)}... | side: ${bet.side} | amount: ${bet.amount} | payout: ${bet.actual_payout}`);
  }

  // Check user's wallet after settlement
  const { data: walletAfter } = await admin.from('user_wallets').select('balance, locked_balance').eq('user_id', user.id).single();
  console.log('\nUser wallet after settlement:');
  console.log('  Balance:', walletAfter.balance, 'Blood');
  console.log('  Locked:', walletAfter.locked_balance, 'Blood');

  // The user bet 100 on side A, starting with 500.
  // After bet: 400 balance, 100 locked.
  // After win: should get payout of 142 (150 - 7 rake, rounded down), so balance = 400 + 142 = 542
  // Locked should be 0.
  // Find the user's bet by looking at which bet used the user's agent wallet
  const { data: userAgentForLookup } = await admin.from('agents').select('id').eq('user_id', user.id).limit(1).single();
  const { data: userWalletForLookup } = await admin.from('wallets').select('id').eq('agent_id', userAgentForLookup.id).single();
  const userBet = allBets.find(b => b.wallet_id === userWalletForLookup.id);

  const expectedPayout = 150 - Math.floor(150 * 0.05); // 142
  const payoutCorrect = userBet && Number(userBet.actual_payout) === expectedPayout;
  const balanceCorrect = walletAfter.balance === (walletBefore.balance - 100 + expectedPayout);

  console.log('\n--- VERIFICATION ---');
  console.log('User bet 100 on A (started with ' + walletBefore.balance + ')');
  console.log('Expected payout: ' + expectedPayout + ' Blood');
  console.log('Actual payout: ' + (userBet ? userBet.actual_payout : 'N/A'));
  console.log('Expected final balance: ' + (walletBefore.balance - 100 + expectedPayout));
  console.log('Actual final balance: ' + walletAfter.balance);
  console.log('Payout correct:', payoutCorrect);
  console.log('Balance correct:', balanceCorrect);
  console.log('Pool settled:', poolAfter.status === 'settled');
  console.log('CHECK 4:', (payoutCorrect && balanceCorrect && poolAfter.status === 'settled') ? 'PASS' : 'FAIL');

  // ======= CHECK 5: GET /api/bets returns bet history =======
  console.log('\n=== CHECK 5: GET /api/bets (user bet history) ===');
  const historyRes = await fetch(BASE + '/api/bets', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const history = await historyRes.json();
  console.log('Bet history count:', history.length);
  if (history.length > 0) {
    const latest = history[0];
    console.log('Latest bet: side=' + latest.side + ' amount=' + latest.amount + ' payout=' + latest.actual_payout);
  }
  console.log('CHECK 5:', history.length > 0 ? 'PASS' : 'FAIL');

  console.log('\n=== PHASE E VERIFICATION COMPLETE ===');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  console.error(e.stack);
});
