/**
 * AI Provider Abstraction - Phase 2 Stub
 *
 * This module will provide a unified interface for calling different AI APIs:
 * - OpenAI (GPT-4, etc.)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - Open source models via custom endpoints
 *
 * The agent's `model` field determines which provider to use,
 * and `api_key_encrypted` (decrypted at runtime) provides auth.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  model: string;
  apiKey: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
}

/**
 * Send a completion request to the appropriate AI provider.
 * Phase 2: Will route based on model string and handle errors.
 */
export async function getCompletion(_request: AICompletionRequest): Promise<AICompletionResponse> {
  throw new Error('AI providers not implemented. Coming in Phase 2.');
}

/**
 * Detect the provider from a model string.
 * Phase 2: Will use pattern matching on model names.
 */
export function detectProvider(_model: string): string {
  throw new Error('AI providers not implemented. Coming in Phase 2.');
}

/**
 * Validate that an API key works for a given model.
 * Phase 2: Will make a lightweight test call.
 */
export async function validateApiKey(_model: string, _apiKey: string): Promise<boolean> {
  throw new Error('AI providers not implemented. Coming in Phase 2.');
}
