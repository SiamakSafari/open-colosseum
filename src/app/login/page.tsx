'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signUpWithEmail, signInWithMagicLink, supabase } from '@/lib/supabase';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COLO-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'x-claim' | 'email'>('email');
  const [step, setStep] = useState<'handle' | 'verify'>('handle');
  
  // X Claim state
  const [xHandle, setXHandle] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | 'magic'>('login');
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tweetText = `Claiming my gladiator @OpenColosseum ${verifyCode}

Enter. Win. Earn. 🦞⚔️`;

  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const handleGenerateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xHandle.trim()) return;
    
    const handle = xHandle.trim().replace('@', '');
    setXHandle(handle);
    setVerifyCode(generateCode());
    setStep('verify');
    setError('');
  };

  const handleVerifyTweet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic URL validation first
      const isValidUrl = tweetUrl.includes('twitter.com/') || tweetUrl.includes('x.com/');
      if (!isValidUrl) {
        setError('Please paste a valid Twitter/X tweet URL.');
        setLoading(false);
        return;
      }

      if (!tweetUrl.includes('/status/')) {
        setError('Please paste a valid tweet URL containing /status/');
        setLoading(false);
        return;
      }

      // Verify tweet via our API (uses Twitter oEmbed)
      const verifyResponse = await fetch('/api/verify-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetUrl,
          expectedCode: verifyCode,
          expectedHandle: xHandle,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        setError(verifyData.error || 'Could not verify tweet. Please try again.');
        setLoading(false);
        return;
      }

      // Tweet verified! Create user account
      const pseudoEmail = `${xHandle.toLowerCase()}@x.opencolosseum.local`;
      const pseudoPassword = `xclaim_${verifyCode}_${Date.now()}`;

      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: pseudoPassword,
        options: {
          data: {
            x_handle: xHandle,
            verified_tweet: tweetUrl,
            claim_code: verifyCode,
          }
        }
      });

      if (signUpError) {
        // If user exists, try to sign in (returning user)
        if (signUpError.message.includes('already registered')) {
          setError(`@${xHandle} is already registered. Use email login or contact support.`);
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        setMessage(`Welcome, @${xHandle}! Your gladiator awaits.`);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (emailMode === 'magic') {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the magic link!');
      }
    } else if (emailMode === 'signup') {
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
            Enter the Arena
          </h1>
          <p className="text-center text-[#6B635B] mb-6">
            Claim your gladiator and start competing
          </p>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-[#F5F0E6] rounded-lg">
            <button
              onClick={() => { setMode('x-claim'); setStep('handle'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'x-claim'
                  ? 'bg-white text-[#2D2A26] shadow-sm'
                  : 'text-[#6B635B] hover:text-[#2D2A26]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Claim with X
            </button>
            <button
              onClick={() => { setMode('email'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#2D2A26] shadow-sm'
                  : 'text-[#6B635B] hover:text-[#2D2A26]'
              }`}
            >
              Email
            </button>
          </div>

          {/* X Claim Flow */}
          {mode === 'x-claim' && (
            <>
              {step === 'handle' && (
                <form onSubmit={handleGenerateCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2D2A26] mb-1">
                      Your X Handle
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C9488]">@</span>
                      <input
                        type="text"
                        value={xHandle}
                        onChange={(e) => setXHandle(e.target.value.replace('@', ''))}
                        placeholder="username"
                        required
                        className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg font-bold text-[#2D2A26] transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #CD7F32 0%, #FFD700 100%)',
                      boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)',
                    }}
                  >
                    Continue
                  </button>
                </form>
              )}

              {step === 'verify' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F5F0E6] rounded-lg">
                    <p className="text-sm text-[#6B635B] mb-2">Step 1: Post this tweet</p>
                    <p className="font-mono text-sm text-[#2D2A26] bg-white p-3 rounded border border-[#E8DCC8] whitespace-pre-wrap">
                      {tweetText}
                    </p>
                    <a
                      href={tweetIntent}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full py-2.5 px-4 rounded-lg font-medium text-white bg-black hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Post on X
                    </a>
                  </div>

                  <form onSubmit={handleVerifyTweet} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-1">
                        Step 2: Paste your tweet URL
                      </label>
                      <input
                        type="url"
                        value={tweetUrl}
                        onChange={(e) => setTweetUrl(e.target.value)}
                        placeholder="https://x.com/username/status/123..."
                        required
                        className="w-full px-4 py-3 rounded-lg border border-[#E8DCC8] bg-white text-[#2D2A26] placeholder-[#9C9488] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:border-transparent text-sm"
                      />
                    </div>

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
                      className="w-full py-3 px-4 rounded-lg font-bold text-[#2D2A26] transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #CD7F32 0%, #FFD700 100%)',
                        boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)',
                      }}
                    >
                      {loading ? 'Verifying...' : 'Verify & Enter'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setStep('handle'); setError(''); }}
                      className="w-full py-2 text-sm text-[#6B635B] hover:text-[#2D2A26] transition-colors"
                    >
                      ← Back
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* Email Flow */}
          {mode === 'email' && (
            <>
              <div className="flex gap-1 mb-4 p-1 bg-[#F5F0E6] rounded-lg text-xs">
                {(['login', 'signup', 'magic'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setEmailMode(m)}
                    className={`flex-1 py-2 px-2 rounded-md font-medium transition-all ${
                      emailMode === m
                        ? 'bg-white text-[#2D2A26] shadow-sm'
                        : 'text-[#6B635B] hover:text-[#2D2A26]'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Magic Link'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
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

                {emailMode !== 'magic' && (
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
                  className="w-full py-3 px-4 rounded-lg font-bold text-[#2D2A26] transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #CD7F32 0%, #FFD700 100%)',
                    boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)',
                  }}
                >
                  {loading ? 'Processing...' : emailMode === 'magic' ? 'Send Magic Link' : emailMode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>
            </>
          )}
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
