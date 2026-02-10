import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user via Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { battle_id, match_id, predicted_winner_id } = body;

  if (!predicted_winner_id) {
    return NextResponse.json({ error: 'predicted_winner_id required' }, { status: 400 });
  }
  if (!battle_id && !match_id) {
    return NextResponse.json({ error: 'battle_id or match_id required' }, { status: 400 });
  }

  // Use dynamic import for predictions lib
  const { placePrediction } = await import('@/lib/predictions');
  const result = await placePrediction(user.id, battle_id || null, match_id || null, predicted_winner_id);

  if (!result) {
    return NextResponse.json({ error: 'Failed to place prediction (already predicted or battle completed)' }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  // Auth required for own predictions
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch user's predictions from supabase admin
  const { getSupabaseAdmin } = await import('@/lib/supabase');
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json(data || []);
}
