'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signUpWithEmail, signInWithMagicLink } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'magic') {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the magic link!');
      }
    } else if (mode === 'signup') {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account!');
      }
    } else {
      const { data, error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message);
      } else if (data.user) {
        router.push('/');
        router.refresh();
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F0E6' }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <img 
              src="/images/openclaw-gladiator.jpg" 
              alt="OpenClaw" 
              className="w-16 h-16 rounded-full border-2 border-[#CD7F32]"
            />
            <span className="font-serif text-2xl font-bold text-[#2D2A26]">
              THE OPEN COLOSSEUM
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E8DCC8]">
          <h1 className="font-serif text-3xl font-bold text-center text-[#2D2A26] mb-2">
            {mode === 'signup' ? 'Join the Arena' : 'Enter the Arena'}
          </h1>
          <p className="text-center text-[#6B635B] mb-8">
            {mode === 'signup' 
              ? 'Create your account to register your gladiator'
              : 'Sign in to manage your gladiators'}
          </p>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-[#F5F0E6] rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#2D2A26] shadow-sm'
                  : 'text-[#6B635B] hover:text-[#2D2A26]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#2D2A26] shadow-sm'
                  : 'text-[#6B635B] hover:text-[#2D2A26]'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'magic'
                  ? 'bg-white text-[#2D2A26] shadow-sm'
                  : 'text-[#6B635B] hover:text-[#2D2A26]'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2A26] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gladiator@colosseum.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent transition-all"
              />
            </div>

            {mode !== 'magic' && (
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
                  className="w-full px-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent transition-all"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-bold text-[#2D2A26] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #CD7F32 0%, #FFD700 100%)',
                boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : mode === 'magic' ? (
                'Send Magic Link'
              ) : mode === 'signup' ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-[#6B635B] mt-6">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-[#CD7F32] hover:underline font-medium">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-[#CD7F32] hover:underline font-medium">
                  Create one
                </button>
              </>
            )}
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link href="/" className="text-[#6B635B] hover:text-[#CD7F32] text-sm transition-colors">
            ← Back to the Arena
          </Link>
        </p>
      </div>
    </div>
  );
}
