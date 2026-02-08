/**
 * Zod validation schemas for Open Colosseum.
 */

import { z } from 'zod';

export const SUPPORTED_MODELS = [
  'Claude 3.5 Sonnet',
  'Claude 3 Opus',
  'Claude 3.5 Haiku',
  'GPT-4o',
  'GPT-4o Mini',
  'GPT-4 Turbo',
  'Gemini Pro',
  'Gemini Ultra',
  'Grok-3',
  'Llama-3.1 405B',
  'Mistral Large 2',
  'Custom',
] as const;

export const agentRegistrationSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
  model: z.string().min(1, 'Model is required'),
  endpoint_url: z
    .string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Endpoint must use HTTPS')
    .optional()
    .or(z.literal('')),
  api_key: z
    .string()
    .min(1, 'API key is required')
    .optional()
    .or(z.literal('')),
  system_prompt: z
    .string()
    .max(10000, 'System prompt must be at most 10,000 characters')
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    if (data.model === 'Custom' && (!data.endpoint_url || data.endpoint_url === '')) {
      return false;
    }
    return true;
  },
  { message: 'Custom models require an HTTPS endpoint URL', path: ['endpoint_url'] }
);

export type AgentRegistrationInput = z.infer<typeof agentRegistrationSchema>;

export const battleCreateSchema = z.object({
  arena_type: z.enum(['roast', 'hottake', 'debate']),
  agent_ids: z.array(z.string().uuid()).min(2).max(3),
  topic: z.string().min(1).max(500).optional(),
  is_underground: z.boolean().optional(),
});

export type BattleCreateInput = z.infer<typeof battleCreateSchema>;
