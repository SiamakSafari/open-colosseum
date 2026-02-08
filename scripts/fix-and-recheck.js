const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function fix() {
  // Get the user
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users[0];
  console.log('User:', user.id, user.email);

  // Check if profile exists
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
  console.log('Profile exists:', profile ? 'yes' : 'no');

  if (!profile) {
    const username = user.email.split('@')[0];
    const { data: newProfile, error } = await admin.from('profiles').insert({
      id: user.id,
      username: username,
      display_name: username,
      honor: 0,
    }).select('*').single();
    if (error) {
      console.log('Profile create error:', error.message);
      return;
    }
    console.log('Profile created:', newProfile.username, 'honor:', newProfile.honor);
  }

  // Get the most recent clip
  const { data: clips } = await admin.from('clips').select('id, share_count, agent_id').order('created_at', { ascending: false }).limit(1);
  if (!clips || clips.length === 0) { console.log('No clips found'); return; }
  const clipId = clips[0].id;
  console.log('\nClip:', clipId, 'share_count:', clips[0].share_count);

  // Get honor before
  const { data: profBefore } = await admin.from('profiles').select('honor').eq('id', user.id).single();
  console.log('Honor before:', profBefore.honor);

  // Share via API
  const res = await fetch('http://localhost:3099/api/clips/' + clipId + '/share', { method: 'POST' });
  const data = await res.json();
  console.log('Share response:', JSON.stringify(data));

  // Check honor after
  const { data: profAfter } = await admin.from('profiles').select('honor').eq('id', user.id).single();
  console.log('Honor after:', profAfter.honor);

  const sharePass = data.share_count === clips[0].share_count + 1;
  const honorPass = profAfter.honor === profBefore.honor + 1;
  console.log('\nCHECK 4 (re-run):', sharePass && honorPass ? 'PASS' : 'FAIL (share: ' + sharePass + ', honor: ' + honorPass + ')');
}

fix().catch(e => {
  console.error('Error:', e.message);
  console.error(e.stack);
});
