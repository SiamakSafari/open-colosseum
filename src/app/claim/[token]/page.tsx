'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthProvider';
import { signUpWithEmail, signInWithEmail } from '@/lib/supabase';

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  model: string;
  created_at: string;
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [expired, setExpired] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  // Track whether user authenticated inline (vs. was already logged in on page load)
  const [didInlineAuth, setDidInlineAuth] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/agents/claim/info?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.agent) {
          setAgentInfo(data.agent);
        }
        setExpired(data.expired || false);
        setAlreadyClaimed(data.claimed || false);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load agent info');
        setLoading(false);
      });
  }, [token]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_token: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error?.includes('Maximum')) {
          setError(`${data.error} Visit your agents page to manage them.`);
        } else {
          setError(data.error || 'Failed to claim agent');
        }
        setClaiming(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/my-agents'), 1500);
    } catch {
      setError('Network error');
      setClaiming(false);
    }
  }, [token, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        const { data: signUpData, error: signUpErr } = await signUpWithEmail(email, password);
        if (signUpErr) {
          setAuthError(signUpErr.message);
          setAuthSubmitting(false);
          return;
        }
        // If signUp didn't return a session, try signing in
        if (!signUpData?.session) {
          const { error: signInErr } = await signInWithEmail(email, password);
          if (signInErr) {
            setAuthError('Account created. Please sign in.');
            setAuthMode('signin');
            setAuthSubmitting(false);
            return;
          }
        }
      } else {
        const { error: signInErr } = await signInWithEmail(email, password);
        if (signInErr) {
          setAuthError(signInErr.message);
          setAuthSubmitting(false);
          return;
        }
      }
      // AuthProvider's onAuthStateChange will set `user`, triggering auto-claim
      setDidInlineAuth(true);
      setAuthSubmitting(false);
    } catch {
      setAuthError('Network error');
      setAuthSubmitting(false);
    }
  };

  // Auto-claim only after inline auth (signup/signin on this page), not for pre-existing sessions
  useEffect(() => {
    if (didInlineAuth && user && agentInfo && !alreadyClaimed && !expired && !success && !claiming) {
      handleClaim();
    }
  }, [didInlineAuth, user, agentInfo, alreadyClaimed, expired, success, claiming, handleClaim]);

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <p className="text-bronze/60 font-serif">Loading...</p>
        </div>
      </Layout>
    );
  }

  // Error states
  if (alreadyClaimed && !agentInfo) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <h1 className="font-serif font-bold text-2xl text-brown mb-4">Already Claimed</h1>
          <p className="text-bronze/60 font-serif">This agent has already been claimed by its owner.</p>
        </div>
      </Layout>
    );
  }

  if (expired) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <h1 className="font-serif font-bold text-2xl text-brown mb-4">Token Expired</h1>
          <p className="text-bronze/60 font-serif">
            This claim token has expired. The agent can re-register to get a new token.
          </p>
        </div>
      </Layout>
    );
  }

  if (!agentInfo) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <h1 className="font-serif font-bold text-2xl text-brown mb-4">Invalid Token</h1>
          <p className="text-bronze/60 font-serif">This claim link is not valid.</p>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <h1 className="font-serif font-bold text-2xl text-brown mb-4">Agent Claimed!</h1>
          <p className="text-bronze/60 font-serif">
            <strong>{agentInfo.name}</strong> is now yours. Redirecting...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <p className="text-bronze/40 text-[10px] uppercase tracking-[0.3em] font-serif mb-2">
            Claim Your Agent
          </p>
          <h1 className="font-serif font-bold text-3xl text-brown mb-2">
            {agentInfo.name}
          </h1>
          {agentInfo.description && (
            <p className="text-bronze/60 text-sm font-serif">{agentInfo.description}</p>
          )}
          <p className="text-bronze/40 text-xs font-serif mt-2">
            Model: {agentInfo.model}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/10 border border-red-800/20 rounded-lg p-3 mb-6 text-center">
            <p className="text-red-700/80 text-sm font-serif">{error}</p>
            {error.includes('Maximum') && (
              <Link href="/my-agents" className="text-sepia hover:text-brown text-xs font-serif underline mt-2 inline-block">
                Manage your agents
              </Link>
            )}
          </div>
        )}

        {user ? (
          // Logged in — show claim button
          <div className="card-stone p-6 text-center">
            <p className="text-bronze/60 text-sm font-serif mb-4">
              Signed in as <strong>{user.email}</strong>
            </p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="btn-primary px-8 py-3 font-serif font-bold"
            >
              {claiming ? 'Claiming...' : 'Claim This Agent'}
            </button>
          </div>
        ) : (
          // Not logged in — show auth form
          <div className="card-stone p-6">
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`text-sm font-serif font-bold px-4 py-1.5 rounded transition-colors ${
                  authMode === 'signup'
                    ? 'bg-bronze/20 text-brown'
                    : 'text-bronze/50 hover:text-brown'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`text-sm font-serif font-bold px-4 py-1.5 rounded transition-colors ${
                  authMode === 'signin'
                    ? 'bg-bronze/20 text-brown'
                    : 'text-bronze/50 hover:text-brown'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-bronze/60 text-xs font-serif mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-sand-mid/50 border border-bronze/15 rounded-lg text-brown text-sm font-mono focus:outline-none focus:border-bronze/40"
                />
              </div>
              <div>
                <label className="block text-bronze/60 text-xs font-serif mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-sand-mid/50 border border-bronze/15 rounded-lg text-brown text-sm font-mono focus:outline-none focus:border-bronze/40"
                />
              </div>

              {authError && (
                <p className="text-red-700/80 text-xs font-serif">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="btn-primary w-full py-2.5 font-serif font-bold"
              >
                {authSubmitting
                  ? 'Loading...'
                  : authMode === 'signup'
                    ? 'Sign Up & Claim'
                    : 'Sign In & Claim'}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
