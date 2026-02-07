/**
 * AI Provider Abstraction
 *
 * Unified interface for calling different AI APIs:
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - Google (Gemini)
 * - Custom endpoints (user-provided HTTPS endpoints)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '@/lib/encryption';

// ======================== Types ========================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  model: string;
  apiKey?: string;
  apiKeyEncrypted?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
}

export type ProviderName = 'anthropic' | 'openai' | 'google' | 'custom';

// ======================== Provider Detection ========================

const MODEL_PROVIDER_MAP: Record<string, ProviderName> = {
  'claude 3.5 sonnet': 'anthropic',
  'claude 3 opus': 'anthropic',
  'claude 3.5 haiku': 'anthropic',
  'gpt-4o': 'openai',
  'gpt-4o mini': 'openai',
  'gpt-4 turbo': 'openai',
  'gemini pro': 'google',
  'gemini ultra': 'google',
  'grok-3': 'openai', // Grok uses OpenAI-compatible API
  'llama 3.1': 'custom',
  'llama-3.1 405b': 'custom',
  'mistral large 2': 'custom',
};

// Map display model names to API model IDs
const MODEL_API_ID_MAP: Record<string, string> = {
  'claude 3.5 sonnet': 'claude-sonnet-4-5-20250929',
  'claude 3 opus': 'claude-opus-4-6',
  'claude 3.5 haiku': 'claude-haiku-4-5-20251001',
  'gpt-4o': 'gpt-4o',
  'gpt-4o mini': 'gpt-4o-mini',
  'gpt-4 turbo': 'gpt-4-turbo',
  'gemini pro': 'gemini-2.0-flash',
  'gemini ultra': 'gemini-2.0-flash',
  'grok-3': 'grok-3',
};

/**
 * Detect the provider from a model string.
 */
export function detectProvider(model: string): ProviderName {
  const normalized = model.toLowerCase().trim();

  // Direct match
  if (MODEL_PROVIDER_MAP[normalized]) {
    return MODEL_PROVIDER_MAP[normalized];
  }

  // Substring match
  if (normalized.includes('claude')) return 'anthropic';
  if (normalized.includes('gpt')) return 'openai';
  if (normalized.includes('gemini')) return 'google';
  if (normalized.includes('grok')) return 'openai';

  return 'custom';
}

/**
 * Get the API model ID from the display name.
 */
function getModelApiId(model: string): string {
  const normalized = model.toLowerCase().trim();
  return MODEL_API_ID_MAP[normalized] || model;
}

// ======================== Timeout Helper ========================

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`AI provider timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ======================== Provider Implementations ========================

async function callAnthropic(request: AICompletionRequest, apiKey: string): Promise<AICompletionResponse> {
  const client = new Anthropic({ apiKey });
  const modelId = getModelApiId(request.model);

  const systemMessages = request.messages.filter(m => m.role === 'system');
  const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

  const start = Date.now();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: request.maxTokens || 1024,
    temperature: request.temperature ?? 0.7,
    system: systemMessages.map(m => m.content).join('\n') || undefined,
    messages: nonSystemMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });
  const latencyMs = Date.now() - start;

  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    content,
    tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    latencyMs,
  };
}

async function callOpenAI(request: AICompletionRequest, apiKey: string, baseURL?: string): Promise<AICompletionResponse> {
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  const modelId = getModelApiId(request.model);

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: request.maxTokens || 1024,
    temperature: request.temperature ?? 0.7,
    messages: request.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });
  const latencyMs = Date.now() - start;

  return {
    content: response.choices[0]?.message?.content || '',
    tokensUsed: (response.usage?.total_tokens) || 0,
    latencyMs,
  };
}

async function callGoogle(request: AICompletionRequest, apiKey: string): Promise<AICompletionResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = getModelApiId(request.model);
  const model = genAI.getGenerativeModel({ model: modelId });

  // Build the prompt from messages
  const systemPrompt = request.messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n');

  const userMessages = request.messages.filter(m => m.role !== 'system');

  const chat = model.startChat({
    history: userMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    ...(systemPrompt ? { systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] } } : {}),
  });

  const lastMessage = userMessages[userMessages.length - 1];

  const start = Date.now();
  const result = await chat.sendMessage(lastMessage?.content || '');
  const latencyMs = Date.now() - start;

  const responseText = result.response.text();

  return {
    content: responseText,
    tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
    latencyMs,
  };
}

async function callCustomEndpoint(
  request: AICompletionRequest,
  apiKey: string,
  endpointUrl: string
): Promise<AICompletionResponse> {
  const start = Date.now();

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom endpoint returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - start;

  // Support OpenAI-compatible response format
  const content = data.choices?.[0]?.message?.content
    || data.content?.[0]?.text
    || data.response
    || data.text
    || '';

  return {
    content: String(content),
    tokensUsed: data.usage?.total_tokens || 0,
    latencyMs,
  };
}

// ======================== Main Entry Point ========================

/**
 * Resolve the API key for a request.
 * Priority: explicit apiKey > decrypt apiKeyEncrypted > environment variable
 */
function resolveApiKey(request: AICompletionRequest, provider: ProviderName): string {
  if (request.apiKey) return request.apiKey;

  if (request.apiKeyEncrypted) {
    return decrypt(request.apiKeyEncrypted);
  }

  // Fallback to environment variables (platform keys)
  const envKeys: Record<ProviderName, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_AI_API_KEY,
    custom: undefined,
  };

  const key = envKeys[provider];
  if (!key) {
    throw new Error(`No API key available for provider "${provider}". Set the environment variable or provide an agent key.`);
  }
  return key;
}

/**
 * Send a completion request to the appropriate AI provider.
 * Automatically detects the provider from the model string.
 * Includes retry logic and timeout handling.
 */
export async function getCompletion(
  request: AICompletionRequest,
  endpointUrl?: string
): Promise<AICompletionResponse> {
  const provider = detectProvider(request.model);
  const apiKey = resolveApiKey(request, provider);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let result: Promise<AICompletionResponse>;

      switch (provider) {
        case 'anthropic':
          result = callAnthropic(request, apiKey);
          break;
        case 'openai':
          // Grok uses OpenAI-compatible API with custom base URL
          if (request.model.toLowerCase().includes('grok')) {
            result = callOpenAI(request, apiKey, 'https://api.x.ai/v1');
          } else {
            result = callOpenAI(request, apiKey);
          }
          break;
        case 'google':
          result = callGoogle(request, apiKey);
          break;
        case 'custom':
          if (!endpointUrl) {
            throw new Error('Custom provider requires an endpoint URL');
          }
          result = callCustomEndpoint(request, apiKey, endpointUrl);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      return await withTimeout(result);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors or invalid requests
      const message = lastError.message.toLowerCase();
      if (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('invalid') ||
        message.includes('unauthorized') ||
        message.includes('authentication')
      ) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('AI provider call failed after retries');
}

/**
 * Validate that an API key works for a given model.
 * Makes a lightweight test call.
 */
export async function validateApiKey(model: string, apiKey: string): Promise<boolean> {
  try {
    await getCompletion({
      model,
      apiKey,
      messages: [{ role: 'user', content: 'Say "ok"' }],
      maxTokens: 5,
      temperature: 0,
    });
    return true;
  } catch {
    return false;
  }
}
