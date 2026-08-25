'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';

type UsageSuccess = {
  ok: true;
  imageCount: number;
  totalBytes: number;
};

type UsageError = {
  error: string;
};

type UsageResponse =
  | UsageSuccess
  | UsageError;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;
}

async function getAdminToken() {
  const be = backend();

  if (!be?.getIdToken) {
    throw new Error(
      '認証トークンを取得できません。'
    );
  }

  const token =
    await be.getIdToken();

  if (!token) {
    throw new Error(
      'ログイン情報を取得できませんでした。'
    );
  }

  return token;
}

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [usage, setUsage] =
    useState<UsageSuccess | null>(
      null
    );

  const formattedUsage =
    useMemo(
      () =>
        usage
          ? formatBytes(
              usage.totalBytes
            )
          : '-',
      [usage]
    );

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setUsage(null);
      return;
    }

    let alive = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const token =
          await getAdminToken();

        const response =
          await fetch(
            '/api/cloudinary/usage',
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: 'no-store',
            }
          );

        const data =
          (await response.json()) as UsageResponse;

        if (
          !response.ok ||
          !('ok' in data) ||
          !data.ok
        ) {
          throw new Error(
            'error' in data
              ? data.error
              : 'Cloudinaryの使用容量を取得できませんでした。'
          );
        }

        if (alive) {
          setUsage(data);
        }
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : 'Cloudinaryの使用容量を取得できませんでした。'
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding:
            '80px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin:
              '0 0 12px',
            fontSize: 30,
            letterSpacing:
              '.08em',
          }}
        >
          ACCESS DENIED
        </h1>

        <p
          style={{
            margin: 0,
            color:
              'rgba(255,255,255,.55)',
            fontSize: 13,
          }}
        >
          管理者専用ページです。
        </p>

        <button
          type="button"
          onClick={() =>
            router.push('/')
          }
          style={{
            marginTop: 28,
            padding:
              '10px 18px',
            borderRadius: 8,
            border:
              '1px solid rgba(255,255,255,.24)',
            background:
              'transparent',
            color: '#f5f5f5',
            cursor:
              'pointer',
          }}
        >
          ← HOME
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding:
          '56px 32px 90px',
        color: '#f5f5f5',
      }}
    >
      <div
        style={{
          marginBottom: 36,
        }}
      >
        <h1
          style={{
            margin:
              '0 0 8px',
            fontSize: 32,
            letterSpacing:
              '.08em',
          }}
        >
          ADMIN
        </h1>

        <p
          style={{
            margin: 0,
            color:
              'rgba(255,255,255,.52)',
            fontSize: 13,
            letterSpacing:
              '.04em',
          }}
        >
          site management
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginBottom: 24,
        }}
      >
        <article
          style={{
            padding: 22,
            border:
              '1px solid rgba(255,255,255,.16)',
            borderRadius: 12,
            background:
              'rgba(255,255,255,.035)',
          }}
        >
          <p
            style={{
              margin:
                '0 0 12px',
              fontSize: 10,
              letterSpacing:
                '.16em',
              color:
                'rgba(255,255,255,.42)',
            }}
          >
            CLOUDINARY STORAGE
          </p>

          {loading ? (
            <p
              style={{
                margin: 0,
                color:
                  'rgba(255,255,255,.55)',
              }}
            >
              LOADING...
            </p>
          ) : error ? (
            <p
              style={{
                margin: 0,
                color:
                  '#ff9b9b',
                fontSize: 12,
              }}
            >
              {error}
            </p>
          ) : (
            <>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing:
                    '-.02em',
                  marginBottom: 4,
                }}
              >
                {
                  formattedUsage
                }
              </div>

              <p
                style={{
                  margin:
                    '0 0 18px',
                  color:
                    'rgba(255,255,255,.5)',
                  fontSize: 12,
                }}
              >
                {
                  usage?.imageCount ??
                  0
                }{' '}
                IMAGES
              </p>

              <div
                style={{
                  height: 6,
                  borderRadius:
                    999,
                  overflow:
                    'hidden',
                  background:
                    'rgba(255,255,255,.08)',
                }}
              >
                <div
                  style={{
                    width:
                      usage &&
                      usage.totalBytes >
                        0
                        ? '36%'
                        : '0%',
                    height: '100%',
                    background:
                      'rgba(255,255,255,.72)',
                    borderRadius:
                      999,
                  }}
                />
              </div>

              <p
                style={{
                  margin:
                    '10px 0 0',
                  fontSize: 10,
                  color:
                    'rgba(255,255,255,.35)',
                }}
              >
                current image storage
              </p>
            </>
          )}
        </article>

        <article
          style={{
            padding: 22,
            border:
              '1px solid rgba(255,255,255,.16)',
            borderRadius: 12,
            background:
              'rgba(255,255,255,.035)',
          }}
        >
          <p
            style={{
              margin:
                '0 0 12px',
              fontSize: 10,
              letterSpacing:
                '.16em',
              color:
                'rgba(255,255,255,.42)',
            }}
          >
            FILE MANAGEMENT
          </p>

          <h2
            style={{
              margin:
                '0 0 8px',
              fontSize: 19,
              letterSpacing:
                '.03em',
            }}
          >
            UNUSED IMAGES
          </h2>

          <p
            style={{
              margin:
                '0 0 20px',
              color:
                'rgba(255,255,255,.5)',
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            GALLERYから参照されていないCloudinary画像を確認・整理します。
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/admin/orphans'
              )
            }
            style={{
              padding:
                '10px 16px',
              borderRadius: 8,
              border:
                '1px solid rgba(255,255,255,.26)',
              background:
                'transparent',
              color: '#f5f5f5',
              fontWeight: 700,
              cursor:
                'pointer',
              letterSpacing:
                '.02em',
            }}
          >
            OPEN UNUSED IMAGES →
          </button>
        </article>
      </section>

      <button
        type="button"
        onClick={() =>
          router.push(
            '/gallery'
          )
        }
        style={{
          padding:
            '10px 16px',
          borderRadius: 8,
          border:
            '1px solid rgba(255,255,255,.2)',
          background:
            'transparent',
          color:
            'rgba(255,255,255,.68)',
          cursor:
            'pointer',
          fontSize: 12,
        }}
      >
        ← GALLERY
      </button>
    </main>
  );
}
