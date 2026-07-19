import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: '3rem' }}>
      <div className="card" style={{ maxWidth: '32rem' }}>
        <h1 style={{ marginTop: 0 }}>Page not found</h1>
        <p style={{ color: '#64748b' }}>The page you requested could not be found.</p>
        <Link href="/" className="btn btn-primary">
          Back home
        </Link>
      </div>
    </main>
  );
}
