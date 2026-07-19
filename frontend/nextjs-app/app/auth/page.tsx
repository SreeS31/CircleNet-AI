'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AuthPage() {
  const [status, setStatus] = useState('Ready to connect');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Authentication is ready. Use the seeded admin account to access the backend.');
  };

  return (
    <main className="container" style={{ paddingTop: '3rem' }}>
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1>Sign in to CircleNet-AI</h1>
        <p style={{ color: '#64748b' }}>Authenticate to access your secure workspace and collaboration tools.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Email</span>
            <input type="email" placeholder="admin@circlenet.ai" style={{ padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid #dbe3ee' }} />
          </label>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Password</span>
            <input type="password" placeholder="demo-password" style={{ padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid #dbe3ee' }} />
          </label>
          <button className="btn btn-primary" type="submit">Continue</button>
        </form>

        <p style={{ marginTop: '1rem', color: '#2563eb' }}>{status}</p>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
