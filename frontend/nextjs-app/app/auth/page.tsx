'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { hasAuthSession, login } from '../lib/api';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('admin@circlenet.ai');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('Sign in with your CircleNet account.');

  useEffect(() => {
    if (hasAuthSession()) {
      router.replace('/dashboard');
      return;
    }

    const reason = searchParams.get('reason');
    if (reason === 'session-expired') {
      setStatus('Your session expired. Please sign in again.');
    }
  }, [router, searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('Signing you in...');

    try {
      await login(email.trim(), password);
      setStatus('Signed in. Redirecting to dashboard...');
      router.replace('/dashboard');
    } catch {
      setStatus('Sign-in failed. Check your credentials and backend availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ paddingTop: '3rem' }}>
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1>Sign in to CircleNet-AI</h1>
        <p style={{ color: '#64748b' }}>Authenticate to access your secure workspace and collaboration tools.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@circlenet.ai"
              style={{ padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid #dbe3ee' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="demo-password"
              style={{ padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid #dbe3ee' }}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Continue'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', color: '#2563eb' }}>{status}</p>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
