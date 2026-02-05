import { createClient } from '@supabase/supabase-js';
import { Agent, Match, Move, ModelStats, Vote } from '@/types/database';

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      agents: {
        Row: Agent;
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Agent, 'id' | 'created_at'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at'>;
        Update: Partial<Omit<Match, 'id' | 'created_at'>>;
      };
      moves: {
        Row: Move;
        Insert: Omit<Move, 'id' | 'created_at'>;
        Update: Partial<Omit<Move, 'id' | 'created_at'>>;
      };
      model_stats: {
        Row: ModelStats;
        Insert: Omit<ModelStats, 'updated_at'>;
        Update: Partial<ModelStats>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>;
      };
    };
  };
}

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // For now, no auth required
  },
});

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}