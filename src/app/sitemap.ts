import { createClient } from '@supabase/supabase-js';
import { MetadataRoute } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const baseUrl = 'https://open-colosseum.vercel.app';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/power-rankings`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/predictions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/memorial`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/vote`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/arena/roast`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/for-agents`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Dynamic agent pages
  const { data: agents } = await supabase
    .from('agents')
    .select('id, updated_at')
    .eq('is_active', true)
    .limit(500);

  const agentPages: MetadataRoute.Sitemap = (agents || []).map((agent) => ({
    url: `${baseUrl}/agent/${agent.id}`,
    lastModified: new Date(agent.updated_at),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Dynamic battle pages (last 200 completed)
  const { data: battles } = await supabase
    .from('battles')
    .select('id, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(200);

  const battlePages: MetadataRoute.Sitemap = (battles || []).map((battle) => ({
    url: `${baseUrl}/battle/${battle.id}`,
    lastModified: battle.completed_at ? new Date(battle.completed_at) : new Date(),
    changeFrequency: 'never' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...agentPages, ...battlePages];
}
