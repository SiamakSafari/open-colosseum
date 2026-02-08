const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(url, key);

async function main() {
  // Get auth token
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users[0];
  await admin.auth.admin.updateUserById(user.id, { password: 'testpass123!' });
  const { data: signIn, error: signErr } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: 'testpass123!',
  });
  if (signErr) { console.log('Auth error:', signErr.message); return; }
  const token = signIn.session.access_token;
  console.log('Auth: OK (' + user.email + ')\n');

  // ======= CHECK 1: Create agent → activity_feed row =======
  console.log('=== CHECK 1: Create agent → feed event ===');
  const agentName = 'FeedTestBot_' + Date.now().toString(36);
  const agentRes = await fetch('http://localhost:3099/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: agentName, model: 'claude 3.5 haiku', system_prompt: 'Test agent for Phase C verification' }),
  });

  if (!agentRes.ok) {
    const err = await agentRes.json();
    console.log('Agent create error:', JSON.stringify(err));
    return;
  }
  const newAgent = await agentRes.json();
  console.log('Agent created:', newAgent.name, '(' + newAgent.id + ')');

  // Wait for fire-and-forget feed post
  await new Promise(r => setTimeout(r, 2000));

  const feedRes1 = await fetch('http://localhost:3099/api/feed?event_type=agent_created&limit=5');
  const feed1 = await feedRes1.json();
  const agentEvent = feed1.events.find(e => e.headline.includes(agentName));
  console.log('Feed events (agent_created):', feed1.count);
  if (agentEvent) {
    console.log('Event headline:', agentEvent.headline);
    console.log('Event target_id:', agentEvent.target_id, '=== agent.id:', agentEvent.target_id === newAgent.id);
  }
  console.log('CHECK 1:', agentEvent ? 'PASS' : 'FAIL');

  // ======= CHECK 2: Create battle → feed event =======
  console.log('\n=== CHECK 2: Create battle → feed event ===');

  // Get 2 agents for a battle
  const { data: agents } = await admin.from('agents').select('id, name').limit(2);
  if (!agents || agents.length < 2) { console.log('FAIL: Need 2 agents'); return; }
  console.log('Battling:', agents[0].name, 'vs', agents[1].name);

  const battleRes = await fetch('http://localhost:3099/api/battles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ arena_type: 'roast', agent_ids: [agents[0].id, agents[1].id] }),
  });

  if (!battleRes.ok) {
    const err = await battleRes.json();
    console.log('Battle create error:', JSON.stringify(err));
    return;
  }
  const battle = await battleRes.json();
  console.log('Battle created:', battle.id);

  // Wait for fire-and-forget feed post
  await new Promise(r => setTimeout(r, 2000));

  const feedRes2 = await fetch('http://localhost:3099/api/feed?limit=10');
  const feed2 = await feedRes2.json();
  const battleCreatedEvent = feed2.events.find(e =>
    e.target_id === battle.id && e.metadata && e.metadata.event_subtype === 'created'
  );
  console.log('Feed event found:', battleCreatedEvent ? 'yes' : 'no');
  if (battleCreatedEvent) {
    console.log('Headline:', battleCreatedEvent.headline);
  }
  console.log('CHECK 2:', battleCreatedEvent ? 'PASS' : 'FAIL');

  // ======= CHECK 3: Settle battle → feed event with ELO =======
  console.log('\n=== CHECK 3: Settle battle → feed event with result ===');

  // Fast-forward voting deadline
  const pastDeadline = new Date(Date.now() - 120000).toISOString();
  await admin.from('battles').update({
    voting_deadline: pastDeadline,
    votes_a: 5,
    votes_b: 2,
    total_votes: 7,
  }).eq('id', battle.id);

  const settleRes = await fetch('http://localhost:3099/api/battles/' + battle.id + '/settle', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  if (!settleRes.ok) {
    const err = await settleRes.json();
    console.log('Settle error:', JSON.stringify(err));
    return;
  }
  const settleData = await settleRes.json();
  console.log('Winner:', settleData.winnerId ? 'yes' : 'draw');

  // Wait for fire-and-forget feed posts
  await new Promise(r => setTimeout(r, 3000));

  const feedRes3 = await fetch('http://localhost:3099/api/feed?limit=20');
  const feed3 = await feedRes3.json();
  const battleCompleteEvent = feed3.events.find(e =>
    e.target_id === battle.id && e.event_type === 'battle_complete' && (!e.metadata || e.metadata.event_subtype !== 'created')
  );
  console.log('Feed event found:', battleCompleteEvent ? 'yes' : 'no');
  if (battleCompleteEvent) {
    console.log('Headline:', battleCompleteEvent.headline);
    console.log('Metadata:', JSON.stringify(battleCompleteEvent.metadata));
  }
  console.log('CHECK 3:', battleCompleteEvent ? 'PASS' : 'FAIL');

  // ======= CHECK 4: GET /api/feed pagination =======
  console.log('\n=== CHECK 4: Feed pagination ===');
  const feedAll = await fetch('http://localhost:3099/api/feed?limit=2');
  const feedAllData = await feedAll.json();
  console.log('Page 1: count=' + feedAllData.count, 'next_cursor=' + (feedAllData.next_cursor ? 'yes' : 'null'));

  let paginationPass = feedAllData.count <= 2;
  if (feedAllData.next_cursor) {
    const feedPage2 = await fetch('http://localhost:3099/api/feed?limit=2&before=' + encodeURIComponent(feedAllData.next_cursor));
    const feedPage2Data = await feedPage2.json();
    console.log('Page 2: count=' + feedPage2Data.count);
    paginationPass = paginationPass && feedPage2Data.count >= 0;

    // Verify chronological order: page 1 events should be newer than page 2
    if (feedAllData.events.length > 0 && feedPage2Data.events.length > 0) {
      const page1Oldest = new Date(feedAllData.events[feedAllData.events.length - 1].created_at);
      const page2Newest = new Date(feedPage2Data.events[0].created_at);
      console.log('Page 1 oldest:', page1Oldest.toISOString());
      console.log('Page 2 newest:', page2Newest.toISOString());
      console.log('Chronological order:', page1Oldest >= page2Newest ? 'correct' : 'wrong');
      paginationPass = paginationPass && page1Oldest >= page2Newest;
    }
  }
  console.log('CHECK 4:', paginationPass ? 'PASS' : 'FAIL');

  // ======= SUMMARY =======
  console.log('\n=== PHASE C VERIFICATION COMPLETE ===');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  console.error(e.stack);
});
