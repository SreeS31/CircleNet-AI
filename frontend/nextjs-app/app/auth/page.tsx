'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { ApiError, createUser, hasAuthSession, login } from '../lib/api';
import CountryPhoneInput from '../components/CountryPhoneInput';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('admin@circlenet.ai');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('Sign in with your CircleNet account.');
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [profile, setProfile] = useState({ username: '', firstName: '', surname: '', phoneNumber: '', email: '', location: '' });

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
      await login(identifier.trim(), password);
      setStatus('Signed in. Redirecting to dashboard...');
      router.replace('/dashboard');
    } catch {
      setStatus('Sign-in failed. Use the username, email, or mobile number saved for this user, then check the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('Creating your account...');
    try {
      await createUser({ ...profile, email: profile.email || undefined, password });
      await login(profile.phoneNumber, password);
      setStatus('Account created. Opening your network...');
      router.replace('/dashboard');
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'Account creation failed. Please check your details.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <p className="eyebrow">CIRCLENET INTELLIGENCE CLOUD</p>
        <h1>People, progress and purpose—beautifully connected.</h1>
        <p>One secure workspace for teams to understand relationships, deliver projects and make better decisions with live operational intelligence.</p>
        <div className="auth-pills"><span>Enterprise security</span><span>Live analytics</span><span>Connected teams</span></div>
      </section>
      <section className="auth-panel">
      <div className="card auth-card">
        <p className="eyebrow">{mode === 'signin' ? 'WELCOME BACK' : 'JOIN CIRCLENET'}</p>
        <h2>{mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}</h2>
        <p style={{ color: '#71809b', marginBottom: '1.5rem' }}>{mode === 'signin' ? 'Use your credentials to continue.' : 'Your unique mobile number keeps duplicate accounts out.'}</p>

        {mode === 'signin' ? <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Username, email, or mobile number</span>
            <input
              type="text"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="sreelatha, admin@circlenet.ai, or +15551234567"
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
        </form> : <form onSubmit={handleRegistration} className="registration-form">
          <div className="registration-row"><label><span>First name</span><input required value={profile.firstName} onChange={e => setProfile({...profile, firstName:e.target.value})} /></label><label><span>Surname</span><input required value={profile.surname} onChange={e => setProfile({...profile, surname:e.target.value})} /></label></div>
          <label><span>Username</span><input required value={profile.username} onChange={e => setProfile({...profile, username:e.target.value})} /></label>
          <label><span>Mobile number</span><CountryPhoneInput required value={profile.phoneNumber} onChange={phoneNumber => setProfile({...profile, phoneNumber})}/></label>
          <label><span>Email (optional)</span><input type="email" value={profile.email} onChange={e => setProfile({...profile, email:e.target.value})} /></label>
          <label><span>Location</span><input required value={profile.location} onChange={e => setProfile({...profile, location:e.target.value})} placeholder="Bengaluru" /></label>
          <label><span>Password</span><input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button>
        </form>}

        <p className="status-note" style={{ marginTop: '1rem' }}>{status}</p>
        <button type="button" className="text-button auth-switch" onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setStatus(mode === 'signin' ? 'Create a searchable profile using your unique mobile number.' : 'Sign in with your CircleNet account.'); }}>{mode === 'signin' ? 'New to CircleNet? Create an account' : 'Already have an account? Sign in'}</button>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="container" style={{ paddingTop: '3rem' }}>Loading sign-in…</main>}>
      <AuthForm />
    </Suspense>
  );
}
