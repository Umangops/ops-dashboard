'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      if (authError.message.toLowerCase().includes('invalid')) {
        setError('Invalid email or password. Please try again.');
      } else if (authError.message.toLowerCase().includes('rate') || authError.message.toLowerCase().includes('too many')) {
        setError('Too many attempts. Please wait 15 minutes and try again.');
      } else {
        setError(authError.message);
      }
      return;
    }

    router.push('/hitachi');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div
        className="w-full max-w-[400px] rounded-[12px] border border-line bg-surface p-8"
        style={{ boxShadow: '0 4px 6px rgba(16,24,40,0.05), 0 10px 15px rgba(16,24,40,0.08)' }}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-primary">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-ink">Ops Dashboard</h1>
          <p className="mt-1 text-sm text-ink-3">Sign in to your account</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-[8px] border border-danger-border bg-danger-soft px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10 w-full rounded-[6px] border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-[6px] border border-line bg-surface pl-3 pr-10 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                tabIndex={-1}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-ink-3">
          Hitachi · Godrej · Samsung Operations Dashboard
        </p>
      </div>
    </div>
  );
}
