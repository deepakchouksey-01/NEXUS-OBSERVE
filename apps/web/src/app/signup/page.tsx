'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, Building2, LockKeyhole, User } from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          organizationName,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message ?? 'Unable to create your account.',
        );
      }

      const { user, organization } = result.data;

      localStorage.setItem('nexus_user', JSON.stringify(user));
      localStorage.setItem(
        'nexus_organization',
        JSON.stringify(organization),
      );

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl lg:grid-cols-2">
          {/* BRAND PANEL */}
          <section className="hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-black">
                  N
                </div>

                <div>
                  <strong className="block text-sm tracking-[0.22em]">
                    NEXUS
                  </strong>
                  <span className="text-xs tracking-[0.28em] text-white/40">
                    OBSERVE
                  </span>
                </div>
              </div>

              <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-white/40">
                OBSERVABILITY PLATFORM
              </p>

              <h1 className="max-w-md text-4xl font-semibold leading-tight">
                Build visibility across your entire infrastructure.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-6 text-white/50">
                Monitor services, infrastructure, logs, traces, incidents,
                alerts and reliability from one centralized platform.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ['24/7', 'Monitoring'],
                ['Real-time', 'Telemetry'],
                ['AI', 'Investigation'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <strong className="block text-sm">{value}</strong>
                  <span className="mt-1 block text-xs text-white/40">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SIGNUP PANEL */}
          <section className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-black">
                    N
                  </div>

                  <div>
                    <strong className="block text-sm tracking-[0.2em]">
                      NEXUS
                    </strong>
                    <span className="text-[10px] tracking-[0.25em] text-white/40">
                      OBSERVE
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-white/40">
                  GET STARTED
                </p>

                <h2 className="text-3xl font-semibold">
                  Create your workspace
                </h2>

                <p className="mt-2 text-sm text-white/45">
                  Set up your NEXUS Observe organization.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Full name
                  </label>

                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Work email
                  </label>

                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Organization name
                  </label>

                  <div className="relative">
                    <Building2
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      required
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                      placeholder="Acme Engineering"
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
                    />
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    This will become your workspace.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Confirm password
                  </label>

                  <input
                    required
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creating workspace...' : 'Create workspace'}

                  {!loading && (
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-white/40">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-white transition hover:text-white/70"
                >
                  Sign in
                </Link>
              </p>

              <p className="mt-8 text-center text-[11px] leading-5 text-white/25">
                By creating an account, you agree to the workspace terms and
                security policies.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}