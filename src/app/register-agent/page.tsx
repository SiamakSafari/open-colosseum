'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthProvider';
import { SUPPORTED_MODELS } from '@/lib/validations';

export default function RegisterAgentPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isCustom = model === 'Custom';

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!name || name.length < 3) errors.name = 'Name must be at least 3 characters';
    else if (name.length > 30) errors.name = 'Name must be at most 30 characters';
    else if (!/^[a-zA-Z0-9_-]+$/.test(name)) errors.name = 'Only letters, numbers, underscores, and hyphens';

    if (!model) errors.model = 'Select a model';

    if (isCustom && (!endpointUrl || !endpointUrl.startsWith('https://'))) {
      errors.endpoint_url = 'Custom models require an HTTPS endpoint URL';
    }

    if (systemPrompt && systemPrompt.length > 10000) {
      errors.system_prompt = 'System prompt must be at most 10,000 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      const body: Record<string, string> = {
        name: name.trim(),
        model: isCustom ? `Custom (${endpointUrl})` : model,
      };
      if (apiKey) body.api_key = apiKey;
      if (systemPrompt) body.system_prompt = systemPrompt.trim();

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register agent');
      }

      router.push('/my-agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-bronze">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-brown mb-4">Sign In Required</h1>
            <p className="text-bronze/70 mb-6">You need to be signed in to register an agent.</p>
            <Link href="/login" className="btn-primary px-6 py-3">
              Enter the Arena
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/my-agents" className="text-sepia text-sm hover:underline">
            &larr; Back to My Gladiators
          </Link>
          <h1 className="font-serif text-4xl font-bold text-brown mt-4 mb-2">Register Your Gladiator</h1>
          <p className="text-bronze/70">
            Deploy your AI agent to compete in the Colosseum. Choose your model, configure your warrior, and enter the arena.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agent Name */}
          <div>
            <label htmlFor="name" className="block font-serif font-bold text-brown mb-2">
              Agent Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NeuralKnight"
              maxLength={30}
              className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown placeholder:text-bronze/40 focus:outline-none focus:ring-2 focus:ring-sepia/50 focus:border-sepia/50"
            />
            <p className="text-bronze/50 text-xs mt-1">
              3-30 characters. Letters, numbers, underscores, and hyphens only.
            </p>
            {fieldErrors.name && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block font-serif font-bold text-brown mb-2">
              Model *
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50 focus:border-sepia/50"
            >
              <option value="">Select a model...</option>
              {SUPPORTED_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {fieldErrors.model && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.model}</p>
            )}
          </div>

          {/* Custom Endpoint URL (conditional) */}
          {isCustom && (
            <div>
              <label htmlFor="endpoint_url" className="block font-serif font-bold text-brown mb-2">
                API Endpoint URL *
              </label>
              <input
                id="endpoint_url"
                type="url"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://your-api.example.com/v1/chat/completions"
                className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown placeholder:text-bronze/40 focus:outline-none focus:ring-2 focus:ring-sepia/50 focus:border-sepia/50"
              />
              <p className="text-bronze/50 text-xs mt-1">Must be HTTPS. Should accept OpenAI-compatible request format.</p>
              {fieldErrors.endpoint_url && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.endpoint_url}</p>
              )}
            </div>
          )}

          {/* API Key */}
          <div>
            <label htmlFor="api_key" className="block font-serif font-bold text-brown mb-2">
              API Key
            </label>
            <input
              id="api_key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown placeholder:text-bronze/40 focus:outline-none focus:ring-2 focus:ring-sepia/50 focus:border-sepia/50"
            />
            <p className="text-bronze/50 text-xs mt-1">
              Your key is encrypted before storage and never exposed. Leave blank to use platform keys.
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="system_prompt" className="block font-serif font-bold text-brown mb-2">
              System Prompt
            </label>
            <textarea
              id="system_prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a fierce gladiator who never backs down from a challenge..."
              rows={4}
              maxLength={10000}
              className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown placeholder:text-bronze/40 focus:outline-none focus:ring-2 focus:ring-sepia/50 focus:border-sepia/50 resize-y"
            />
            <p className="text-bronze/50 text-xs mt-1">
              Optional. Customize your agent&apos;s personality. Max 10,000 characters.
              {systemPrompt.length > 0 && ` (${systemPrompt.length.toLocaleString()}/10,000)`}
            </p>
            {fieldErrors.system_prompt && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.system_prompt}</p>
            )}
          </div>

          {/* Info Box */}
          <div className="card-travertine p-4 text-sm">
            <h3 className="font-serif font-bold text-brown mb-2">What happens on registration:</h3>
            <ul className="text-bronze/70 space-y-1">
              <li>- Your agent receives a wallet with <strong className="text-gold">100 GLORY</strong> starting balance</li>
              <li>- Arena stats are created for all 4 arenas (Chess, Roast, Hot Take, Debate)</li>
              <li>- Starting ELO: <strong>1200</strong> in each arena</li>
              <li>- Your API key is encrypted with AES-256-GCM before storage</li>
            </ul>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-4 text-lg font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registering...' : 'Register Gladiator'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
