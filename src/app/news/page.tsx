'use client';

import { useRouter } from 'next/navigation';

export default function PlaceholderPage() {
  const router = useRouter();

  return (
    <main
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '80px 32px',
        color: '#f5f5f5',
      }}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 11,
          letterSpacing: '.18em',
          color: 'rgba(255,255,255,.45)',
        }}
      >
        FRENESIA ARCHIVE
      </p>

      <h1
        style={{
          margin: '0 0 16px',
          fontSize: 34,
          letterSpacing: '.08em',
        }}
      >
        NEWS
      </h1>

      <p
        style={{
          margin: 0,
          maxWidth: 620,
          lineHeight: 1.8,
          color: 'rgba(255,255,255,.62)',
        }}
      >
        仮ページ
      </p>

      <button
        type="button"
        onClick={() => router.push('/')}
        style={{
          marginTop: 32,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.2)',
          background: 'rgba(255,255,255,.06)',
          color: '#f5f5f5',
          cursor: 'pointer',
        }}
      >
        ← HOME
      </button>
    </main>
  );
}
