const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
// Separate clients: admin for data ops (stays service_role), authClient for sign-in
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(url, key);

async function main() {
  // Get agents
  const { data: agents } = await admin.from('agents').select('id, name').limit(2);
  if (!agents || agents.length < 2) {
    console.log('FAIL: Need at least 2 agents');
    return;
  }
  console.log('Agents:', agents[0].name, 'vs', agents[1].name);

  const agentA = agents[0].id;
  const agentB = agents[1].id;

  // Get auth token
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users[0];

  // Ensure password is set
  await admin.auth.admin.updateUserById(user.id, { password: 'testpass123!' });

  const { data: signIn, error: signErr } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: 'testpass123!',
  });
  if (signErr) {
    console.log('Auth error:', signErr.message);
    return;
  }
  const token = signIn.session.access_token;
  console.log('Auth: OK\n');

  // ======= CHECK 1: Create roast battle, verify pre_match_hype =======
  console.log('=== CHECK 1: Roast battle + pre_match_hype ===');
  const battleRes = await fetch('http://localhost:3099/api/battles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({
      arena_type: 'roast',
      agent_ids: [agentA, agentB],
    }),
  });

  if (!battleRes.ok) {
    const err = await battleRes.json();
    console.log('Battle create error:', JSON.stringify(err));
    return;
  }

  const battle = await battleRes.json();
  console.log('Battle created:', battle.id);
  console.log('Status:', battle.status);
  console.log('Response A:', battle.response_a ? battle.response_a.slice(0, 80) + '...' : 'null');
  console.log('Response B:', battle.response_b ? battle.response_b.slice(0, 80) + '...' : 'null');

  // Wait for fire-and-forget hype generation
  console.log('\nWaiting 8s for hype generation...');
  await new Promise(r => setTimeout(r, 8000));

  const { data: b1 } = await admin.from('battles').select('pre_match_hype').eq('id', battle.id).single();
  console.log('pre_match_hype:', b1.pre_match_hype || '(empty)');
  console.log('CHECK 1:', b1.pre_match_hype ? 'PASS' : 'FAIL');

  // ======= CHECK 2: Settle battle, verify post_match_summary =======
  console.log('\n=== CHECK 2: Settle battle + post_match_summary ===');

  // Fast-forward voting deadline so we can settle
  const battleId = battle.id;
  console.log('Updating battle:', battleId);
  const pastDeadline = new Date(Date.now() - 120000).toISOString();
  console.log('Setting deadline to:', pastDeadline);

  const { data: ffData, error: ffErr, count: ffCount } = await admin.from('battles').update({
    voting_deadline: pastDeadline,
    votes_a: 3,
    votes_b: 1,
    total_votes: 4,
  }).eq('id', battleId).select('id, voting_deadline, votes_a, total_votes');

  console.log('Update result:', JSON.stringify({ data: ffData, error: ffErr?.message, count: ffCount }));

  if (!ffData || ffData.length === 0) {
    // Try direct RPC approach
    console.log('Direct update failed, trying raw SQL approach...');
    const { data: rpcData, error: rpcErr } = await admin.rpc('', {}).maybeSingle();
    // Just verify current state
  }

  // Verify the update took
  const { data: ffCheck } = await admin.from('battles').select('voting_deadline, votes_a, status').eq('id', battleId).single();
  console.log('After update - deadline:', ffCheck?.voting_deadline, 'votes_a:', ffCheck?.votes_a, 'status:', ffCheck?.status);
  console.log('Now:', new Date().toISOString());

  const settleRes = await fetch(`http://localhost:3099/api/battles/${battle.id}/settle`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  if (!settleRes.ok) {
    const err = await settleRes.json();
    console.log('Settle error:', JSON.stringify(err));
    return;
  }

  const settleData = await settleRes.json();
  console.log('Winner:', settleData.winner_id ? 'yes' : 'draw');
  console.log('ELO A after:', settleData.eloAAfter);
  console.log('ELO B after:', settleData.eloBAfter);

  // Wait for fire-and-forget commentary generation
  console.log('\nWaiting 10s for commentary + clip generation...');
  await new Promise(r => setTimeout(r, 10000));

  const { data: b2 } = await admin.from('battles').select('post_match_summary, clip_moment').eq('id', battle.id).single();
  console.log('post_match_summary:', b2.post_match_summary || '(empty)');
  console.log('CHECK 2:', b2.post_match_summary ? 'PASS' : 'FAIL');

  // ======= CHECK 3: Clip auto-identified and stored =======
  console.log('\n=== CHECK 3: Clip in clips table ===');
  console.log('clip_moment on battle:', JSON.stringify(b2.clip_moment) || '(empty)');

  let clipId = null;
  if (b2.clip_moment && b2.clip_moment.clip_id) {
    clipId = b2.clip_moment.clip_id;
    const { data: clip } = await admin.from('clips').select('*').eq('id', clipId).single();
    console.log('Clip record:', clip ? `quote="${clip.quote_text.slice(0, 60)}..." type=${clip.moment_type}` : 'NOT FOUND');
    console.log('CHECK 3:', clip ? 'PASS' : 'FAIL');
  } else {
    // Check if clip was created even without clip_moment reference
    const { data: clips } = await admin.from('clips').select('*').eq('battle_id', battle.id).limit(1);
    if (clips && clips.length > 0) {
      clipId = clips[0].id;
      console.log('Clip found in table:', `quote="${clips[0].quote_text.slice(0, 60)}..." type=${clips[0].moment_type}`);
      console.log('CHECK 3: PASS');
    } else {
      console.log('No clip found');
      console.log('CHECK 3: FAIL');
    }
  }

  // ======= CHECK 4: Share clip → share_count + Honor =======
  console.log('\n=== CHECK 4: Share clip → share_count + Honor ===');
  if (clipId) {
    // Get agent owner's profile honor before
    const { data: clipRec } = await admin.from('clips').select('agent_id, share_count').eq('id', clipId).single();
    const { data: agentRec } = await admin.from('agents').select('user_id').eq('id', clipRec.agent_id).single();

    let honorBefore = 0;
    if (agentRec) {
      const { data: profile } = await admin.from('profiles').select('honor').eq('id', agentRec.user_id).single();
      honorBefore = profile ? profile.honor : 0;
    }
    console.log('Share count before:', clipRec.share_count);
    console.log('Honor before:', honorBefore);

    const shareRes = await fetch(`http://localhost:3099/api/clips/${clipId}/share`, { method: 'POST' });
    const shareData = await shareRes.json();
    console.log('Share response:', JSON.stringify(shareData));

    // Verify
    const { data: clipAfter } = await admin.from('clips').select('share_count').eq('id', clipId).single();
    let honorAfter = 0;
    if (agentRec) {
      const { data: profileAfter } = await admin.from('profiles').select('honor').eq('id', agentRec.user_id).single();
      honorAfter = profileAfter ? profileAfter.honor : 0;
    }
    console.log('Share count after:', clipAfter.share_count);
    console.log('Honor after:', honorAfter);
    const sharePass = clipAfter.share_count === clipRec.share_count + 1;
    const honorPass = honorAfter === honorBefore + 1;
    console.log('CHECK 4:', sharePass && honorPass ? 'PASS' : `FAIL (share: ${sharePass}, honor: ${honorPass})`);
  } else {
    console.log('Skipped — no clip to share');
    console.log('CHECK 4: SKIP');
  }

  // ======= CHECK 5: Verify GET /api/clips/[id] =======
  console.log('\n=== CHECK 5: GET /api/clips/[id] ===');
  if (clipId) {
    const clipRes = await fetch(`http://localhost:3099/api/clips/${clipId}`);
    const clipData = await clipRes.json();
    console.log('GET clip status:', clipRes.status);
    console.log('Clip data:', clipData.id ? `id=${clipData.id} moment_type=${clipData.moment_type}` : 'error');
    console.log('CHECK 5:', clipRes.ok ? 'PASS' : 'FAIL');
  } else {
    console.log('Skipped — no clip ID');
    console.log('CHECK 5: SKIP');
  }

  console.log('\n=== PHASE B VERIFICATION COMPLETE ===');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  console.error(e.stack);
});
