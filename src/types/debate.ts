export interface DebateModel {
  id: string;
  name: string;
  provider: string;
  avatar_url?: string;
}

export interface DebateStatement {
  model_id: string;
  text: string;
  word_count: number;
}

export type DebateRoundType = 'opening' | 'rebuttal' | 'closing';

export interface DebateRound {
  round_number: number;
  type: DebateRoundType;
  label: string;
  statements: DebateStatement[];
}

export interface DebateVote {
  session_token: string;
  model_id: string;
  created_at: string;
}

export interface Debate {
  id: string;
  topic: string;
  description: string;
  models: DebateModel[];
  rounds: DebateRound[];
  status: 'live' | 'completed';
  spectator_count: number;
  created_at: string;
  completed_at?: string;
}

export interface DebateVoteCounts {
  [model_id: string]: number;
  total: number;
}
