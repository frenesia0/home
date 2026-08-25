'use client';

// ログインページ — Googleログイン専用
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();
  const toast = useToast();

  const [error, setError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  // すでにログイン済みならトップへ
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const doGoogleLogin = async () => {
    if (googleBusy) return;

    setError('');
    setGoogleBusy(true);

    try {
      const result = await loginWithGoogle();

      if (!result.ok) {
        setError(
          result.error ??
            'Googleログインに失敗しました。時間をおいてもう一度お試しください。'
        );
        return;
      }

      toast('Googleアカウントでログインしました。');
      router.push('/');
    } catch {
      setError(
        'Googleログイン中にエラーが発生しました。時間をおいてもう一度お試しください。'
      );
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <section className="page">
      <div
        className="panel"
        style={{
          padding: 28,
          maxWidth: 420,
          margin: '56px auto 0',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            letterSpacing: '.3em',
            textAlign: 'center',
            margin: '4px 0 8px',
            color: 'var(--ink)',
          }}
        >
          LOGIN
        </h1>

        <p
          style={{
            margin: '0 0 24px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 11,
            lineHeight: 1.7,
          }}
        >
          管理者用Googleアカウントでログインします。
        </p>

        <button
          className="btn btn-dark"
          type="button"
          style={{
            width: '100%',
            minHeight: 46,
            justifyContent: 'center',
            padding: '12px 16px',
            fontWeight: 700,
            letterSpacing: '.04em',
          }}
          onClick={doGoogleLogin}
          disabled={googleBusy}
        >
          {googleBusy
            ? 'Googleに接続中...'
            : 'Googleでログイン'}
        </button>

        {error && (
          <p
            role="alert"
            style={{
              margin: '14px 0 0',
              fontSize: 11.5,
              lineHeight: 1.6,
              color: 'var(--accent)',
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
