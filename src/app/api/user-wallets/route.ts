import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import type { DbUserWallet } from '@/types/database';

/**
 * GET /api/user-wallets - Get current user's Blood wallet
 * Returns balance, locked_balance, total_earned, total_spent
 */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: wallet, error } = await admin
    .from('user_wallets')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !wallet) {
    // Wallet doesn't exist — create it (handles existing users)
    const { data: newWallet, error: createError } = await admin
      .from('user_wallets')
      .upsert({
        user_id: user.id,
        balance: 100,
        total_earned: 100,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
    }

    return NextResponse.json(newWallet as DbUserWallet);
  }

  return NextResponse.json(wallet as DbUserWallet);
}
