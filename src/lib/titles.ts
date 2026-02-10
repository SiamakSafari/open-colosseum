/**
 * Arena Titles
 *
 * Handles arena-specific titles that agents hold and defend.
 * Titles are checked after every battle/match settlement (fire-and-forget).
 *
 * Title names by arena:
 *   roast    -> "Roast Master"
 *   hottake  -> "Silver Tongue"
 *   chess    -> "Grandmaster"
 *   Special  -> "People's Champion" (roast, most total votes)
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { postTitleClaimed, postTitleDefended, postTitleLost } from '@/lib/feed';

// ======================== Constants ========================

const ARENA_TITLE_MAP: Record<string, string> = {
  roast: 'Roast Master',
  hottake: 'Silver Tongue',
  chess: 'Grandmaster',
};

const TITLE_CLAIM_MIN_WINS = 5;

// ======================== Public API ========================

/**
 * Check whether a title changes hands after a battle or match settlement.
 * Called fire-and-forget from settlement engines.
 */
export async function checkTitleChallenge(
  battleId: string | null,
  matchId: string | null,
  winnerId: string | null,
  loserId: string | null,
  arenaType: string
): Promise<void> {
  try {
    // Draws don't affect titles
    if (!winnerId) return;

    const titleName = ARENA_TITLE_MAP[arenaType];
    if (!titleName) return;

    const admin = getSupabaseAdmin();

    // Look up the arena title row
    const { data: title, error: titleError } = await admin
      .from('arena_titles')
      .select('id, title_name, arena_type, holder_agent_id, holder_since, defenses, longest_reign_days')
      .eq('title_name', titleName)
      .single();

    if (titleError || !title) {
      console.error('Title lookup failed:', titleError?.message || 'not found');
      return;
    }

    const now = new Date().toISOString();

    if (title.holder_agent_id) {
      // Title has a current holder
      if (loserId && loserId === title.holder_agent_id) {
        // Winner dethrones the holder
        await dethrone(admin, title, winnerId, loserId!, now);
      } else if (winnerId === title.holder_agent_id) {
        // Holder defends successfully
        await defend(admin, title, winnerId, now);
      }
      // If neither combatant is the holder, title is unaffected
    } else {
      // Title is vacant — check if winner qualifies to claim it
      await tryClaimVacant(admin, title, winnerId, arenaType, now);
    }
  } catch (err) {
    console.error('checkTitleChallenge error:', err);
  }
}

/**
 * Check and update the "People's Champion" title.
 * This special title goes to the roast agent with the most total votes received.
 * Called by the orchestrator tick.
 */
export async function checkPeoplesChampion(): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    // Find the agent with the most total votes received across all completed roast battles
    // An agent receives votes_a when they are agent_a, and votes_b when they are agent_b
    const { data: battlesA } = await admin
      .from('battles')
      .select('agent_a_id, votes_a')
      .eq('arena_type', 'roast')
      .eq('status', 'completed');

    const { data: battlesB } = await admin
      .from('battles')
      .select('agent_b_id, votes_b')
      .eq('arena_type', 'roast')
      .eq('status', 'completed');

    // Aggregate votes per agent
    const votesMap = new Map<string, number>();

    if (battlesA) {
      for (const b of battlesA) {
        const current = votesMap.get(b.agent_a_id) || 0;
        votesMap.set(b.agent_a_id, current + (b.votes_a || 0));
      }
    }

    if (battlesB) {
      for (const b of battlesB) {
        const current = votesMap.get(b.agent_b_id) || 0;
        votesMap.set(b.agent_b_id, current + (b.votes_b || 0));
      }
    }

    if (votesMap.size === 0) return;

    // Find the agent with the most votes
    let topAgentId: string | null = null;
    let topVotes = 0;

    for (const [agentId, votes] of votesMap) {
      if (votes > topVotes) {
        topVotes = votes;
        topAgentId = agentId;
      }
    }

    if (!topAgentId) return;

    // Look up the People's Champion title
    const { data: title, error: titleError } = await admin
      .from('arena_titles')
      .select('id, title_name, arena_type, holder_agent_id, holder_since, defenses, longest_reign_days')
      .eq('title_name', "People's Champion")
      .single();

    if (titleError || !title) return;

    // If the top agent already holds the title, nothing to do
    if (title.holder_agent_id === topAgentId) return;

    const now = new Date().toISOString();

    // Get new champion's name
    const { data: newChamp } = await admin
      .from('agents')
      .select('name')
      .eq('id', topAgentId)
      .single();

    if (!newChamp) return;

    if (title.holder_agent_id) {
      // Transfer from old holder to new
      const { data: oldChamp } = await admin
        .from('agents')
        .select('name')
        .eq('id', title.holder_agent_id)
        .single();

      // Close old title_history entry
      const reignDays = title.holder_since
        ? Math.max(0, Math.floor((Date.now() - new Date(title.holder_since).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      await admin
        .from('title_history')
        .update({ lost_at: now, reign_days: reignDays })
        .eq('title_id', title.id)
        .eq('agent_id', title.holder_agent_id)
        .is('lost_at', null);

      // Update longest_reign_days if applicable
      const newLongest = Math.max(title.longest_reign_days || 0, reignDays);

      // Update title to new holder
      await admin
        .from('arena_titles')
        .update({
          holder_agent_id: topAgentId,
          holder_since: now,
          defenses: 0,
          longest_reign_days: newLongest,
          updated_at: now,
        })
        .eq('id', title.id);

      // Create new title_history entry
      await admin.from('title_history').insert({
        title_id: title.id,
        agent_id: topAgentId,
        won_at: now,
        defenses: 0,
        reign_days: 0,
      });

      // Post feed events
      if (oldChamp) {
        await postTitleLost("People's Champion", title.holder_agent_id, oldChamp.name, topAgentId, newChamp.name);
      }
      await postTitleClaimed("People's Champion", topAgentId, newChamp.name);
    } else {
      // No current holder — claim directly
      await admin
        .from('arena_titles')
        .update({
          holder_agent_id: topAgentId,
          holder_since: now,
          defenses: 0,
          updated_at: now,
        })
        .eq('id', title.id);

      await admin.from('title_history').insert({
        title_id: title.id,
        agent_id: topAgentId,
        won_at: now,
        defenses: 0,
        reign_days: 0,
      });

      await postTitleClaimed("People's Champion", topAgentId, newChamp.name);
    }
  } catch (err) {
    console.error('checkPeoplesChampion error:', err);
  }
}

/**
 * Get all arena titles with holder information.
 */
export async function getAllTitles(): Promise<
  Array<{
    id: string;
    title_name: string;
    arena_type: string;
    holder_agent_id: string | null;
    holder_name: string | null;
    holder_since: string | null;
    defenses: number;
    longest_reign_days: number;
  }>
> {
  try {
    const admin = getSupabaseAdmin();

    const { data: titles, error } = await admin
      .from('arena_titles')
      .select('id, title_name, arena_type, holder_agent_id, holder_since, defenses, longest_reign_days');

    if (error || !titles) return [];

    // Look up holder names for titles that have a holder
    const holderIds = titles
      .map((t) => t.holder_agent_id)
      .filter((id): id is string => id !== null);

    let agentNameMap = new Map<string, string>();

    if (holderIds.length > 0) {
      const { data: agents } = await admin
        .from('agents')
        .select('id, name')
        .in('id', holderIds);

      if (agents) {
        agentNameMap = new Map(agents.map((a) => [a.id, a.name]));
      }
    }

    return titles.map((t) => ({
      id: t.id,
      title_name: t.title_name,
      arena_type: t.arena_type,
      holder_agent_id: t.holder_agent_id,
      holder_name: t.holder_agent_id ? agentNameMap.get(t.holder_agent_id) || null : null,
      holder_since: t.holder_since,
      defenses: t.defenses || 0,
      longest_reign_days: t.longest_reign_days || 0,
    }));
  } catch (err) {
    console.error('getAllTitles error:', err);
    return [];
  }
}

// ======================== Internal ========================

interface TitleRow {
  id: string;
  title_name: string;
  arena_type: string;
  holder_agent_id: string | null;
  holder_since: string | null;
  defenses: number;
  longest_reign_days: number;
}

/**
 * Dethrone the current title holder. Winner takes the title.
 */
async function dethrone(
  admin: ReturnType<typeof getSupabaseAdmin>,
  title: TitleRow,
  winnerId: string,
  loserId: string,
  now: string
): Promise<void> {
  // Calculate reign duration
  const reignDays = title.holder_since
    ? Math.max(0, Math.floor((Date.now() - new Date(title.holder_since).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Close the old holder's title_history entry
  await admin
    .from('title_history')
    .update({ lost_at: now, reign_days: reignDays })
    .eq('title_id', title.id)
    .eq('agent_id', loserId)
    .is('lost_at', null);

  // Create new title_history entry for the winner
  await admin.from('title_history').insert({
    title_id: title.id,
    agent_id: winnerId,
    won_at: now,
    defenses: 0,
    reign_days: 0,
  });

  // Update longest_reign_days if this reign was longer
  const newLongest = Math.max(title.longest_reign_days || 0, reignDays);

  // Update the arena_titles row
  await admin
    .from('arena_titles')
    .update({
      holder_agent_id: winnerId,
      holder_since: now,
      defenses: 0,
      longest_reign_days: newLongest,
      updated_at: now,
    })
    .eq('id', title.id);

  // Look up agent names for feed events
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [winnerId, loserId]);

  const nameMap = new Map((agents || []).map((a) => [a.id, a.name]));
  const winnerName = nameMap.get(winnerId) || 'Unknown';
  const loserName = nameMap.get(loserId) || 'Unknown';

  // Post feed events
  await postTitleLost(title.title_name, loserId, loserName, winnerId, winnerName);
  await postTitleClaimed(title.title_name, winnerId, winnerName);
}

/**
 * Record a successful title defense.
 */
async function defend(
  admin: ReturnType<typeof getSupabaseAdmin>,
  title: TitleRow,
  holderId: string,
  now: string
): Promise<void> {
  const newDefenses = (title.defenses || 0) + 1;

  // Increment defenses on arena_titles
  await admin
    .from('arena_titles')
    .update({
      defenses: newDefenses,
      updated_at: now,
    })
    .eq('id', title.id);

  // Update the current title_history entry's defense count
  await admin
    .from('title_history')
    .update({ defenses: newDefenses })
    .eq('title_id', title.id)
    .eq('agent_id', holderId)
    .is('lost_at', null);

  // Look up agent name for feed event
  const { data: agent } = await admin
    .from('agents')
    .select('name')
    .eq('id', holderId)
    .single();

  const holderName = agent?.name || 'Unknown';

  await postTitleDefended(title.title_name, holderId, holderName, newDefenses);
}

/**
 * Try to claim a vacant title. Requires at least TITLE_CLAIM_MIN_WINS wins in the arena.
 */
async function tryClaimVacant(
  admin: ReturnType<typeof getSupabaseAdmin>,
  title: TitleRow,
  winnerId: string,
  arenaType: string,
  now: string
): Promise<void> {
  // Check if the winner has enough wins in this arena
  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('wins')
    .eq('agent_id', winnerId)
    .eq('arena_type', arenaType)
    .single();

  if (!stats || stats.wins < TITLE_CLAIM_MIN_WINS) return;

  // Claim the title
  await admin
    .from('arena_titles')
    .update({
      holder_agent_id: winnerId,
      holder_since: now,
      defenses: 0,
      updated_at: now,
    })
    .eq('id', title.id);

  // Create title_history entry
  await admin.from('title_history').insert({
    title_id: title.id,
    agent_id: winnerId,
    won_at: now,
    defenses: 0,
    reign_days: 0,
  });

  // Look up agent name for feed event
  const { data: agent } = await admin
    .from('agents')
    .select('name')
    .eq('id', winnerId)
    .single();

  const winnerName = agent?.name || 'Unknown';

  await postTitleClaimed(title.title_name, winnerId, winnerName);
}
