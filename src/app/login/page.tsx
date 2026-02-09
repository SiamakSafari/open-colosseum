'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      const { data: signUpData, error: signUpErr } = await signUpWithEmail(email, password);
      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }
      // signUp with confirmation disabled returns a session directly
      if (signUpData?.session) {
        router.push('/my-agents');
        router.refresh();
        setLoading(false);
        return;
      }
      // Fallback: explicitly sign in if signUp didn't return a session
      const { data, error: signInErr } = await signInWithEmail(email, password);
      if (signInErr) {
        // Account was created but session failed — guide user to sign in
        setMode('login');
        setError('Account created successfully. Please sign in.');
        setLoading(false);
        return;
      }
      if (data.user) {
        router.push('/my-agents');
        router.refresh();
      }
    } else {
      const { data, error: signInErr } = await signInWithEmail(email, password);
      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        router.push('/my-agents');
        router.refresh();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F5F0E6' }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/images/openclaw-gladiator.jpg"
              alt="OpenClaw"
              className="w-20 h-20 rounded-full border-4 border-[#CD7F32] shadow-lg"
            />
            <span className="font-serif text-2xl font-bold text-[#2D2A26]">
              THE OPEN COLOSSEUM
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E8DCC8]">
          <h1 className="font-serif text-3xl font-bold text-center text-[#2D2A26] mb-2">
            {mode === 'signup' ? 'Enter the Arena' : 'Welcome Back'}
          </h1>
          <p className="text-center text-[#6B635B] mb-6">
            {mode === 'signup' ? 'Create your account and start competing' : 'Sign in to your account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2A26] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gladiator@arena.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D2A26] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-bold text-[#2D2A26] transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #CD7F32 0%, #FFD700 100%)',
                boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)',
              }}
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[#6B635B] mt-4">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-[#CD7F32] hover:underline font-medium">
                  Sign In
                </button>
              </>
            ) : (
              <>New here?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="text-[#CD7F32] hover:underline font-medium">
                  Create Account
                </button>
              </>
            )}
          </p>
        </div>

        {/* Back link */}
        <p className="text-center mt-6">
          <Link href="/" className="text-[#6B635B] hover:text-[#CD7F32] text-sm transition-colors">
            ← Back to the Arena
          </Link>
        </p>
      </div>
    </div>
  );
}
