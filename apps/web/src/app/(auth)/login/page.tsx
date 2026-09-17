'use client';

import { FormEvent, useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        organizationId,
      }),
    });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message ?? 'Unable to sign in. Please check your credentials.',
        );
      }

      const { user, organization } = result.data;

      localStorage.setItem('nexus_user', JSON.stringify(user));
      localStorage.setItem(
        'nexus_organization',
        JSON.stringify(organization),
    );

      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left — Platform identity */}
        <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.10),transparent_35%)]" />

          <div className="relative flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>

                <div>
                  <div className="text-lg font-semibold tracking-[0.18em]">
                    NEXUS
                  </div>
                  <div className="text-[10px] font-medium tracking-[0.32em] text-slate-500">
                    OBSERVE
                  </div>
                </div>
              </div>

              <div className="mt-24 max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Observability Platform
                </div>

                <h1 className="text-5xl font-semibold leading-tight tracking-tight xl:text-6xl">
                  See everything.
                  <br />
                  <span className="text-slate-400">Resolve faster.</span>
                </h1>

                <p className="mt-7 max-w-lg text-base leading-7 text-slate-400">
                  Unified infrastructure, services, metrics, logs, traces and
                  incident intelligence for modern engineering teams.
                </p>
              </div>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xl font-semibold">24/7</div>
                <div className="mt-1 text-xs text-slate-500">Monitoring</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xl font-semibold">&lt;1s</div>
                <div className="mt-1 text-xs text-slate-500">Detection</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xl font-semibold">99.9%</div>
                <div className="mt-1 text-xs text-slate-500">Visibility</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right — Login */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {/* Mobile branding */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>

              <div>
                <div className="text-base font-semibold tracking-[0.18em]">
                  NEXUS
                </div>
                <div className="text-[9px] tracking-[0.3em] text-slate-500">
                  OBSERVE
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <LockKeyhole className="h-5 w-5 text-slate-300" />
              </div>

              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to access your observability workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs text-slate-500 transition hover:text-slate-300"
                    onClick={() =>
                      setError('Password recovery is not configured yet.')
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10"
                    placeholder="Enter your password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Organization */}
              <div>
                <label
                  htmlFor="organizationId"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Organization ID
                </label>

                <input
                  id="organizationId"
                  type="text"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 font-mono text-xs text-slate-300 outline-none transition focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to NEXUS
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure enterprise authentication
            </div>

            <p className="mt-8 text-center text-[11px] text-slate-700">
              NEXUS OBSERVE · Enterprise Observability Platform
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}