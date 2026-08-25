'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';

type UsageValue = {
  usage?: number;
  limit?: number;
  used_percent?: number;
};

type UsageSuccess = {
  ok: true;

  // samples/ を除いた、君自身の画像
  imageCount: number;
  totalBytes: number;

  // Cloudinary公式Usage API
  storageUsage: number | null;
  storageLimit: number | null;
  storagePercent: number | null;

  plan?: string | null;
  credits?: UsageValue | null;
};

type UsageError = {
  error: string;
};

type UsageResponse =
  | UsageSuccess
  | UsageError;

function formatBytes(
  bytes: number | null | undefined
) {
  if (
    bytes === null ||
    bytes === undefined ||
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
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

function formatPercent(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  if (value === 0) {
    return '0%';
  }

  if (value < 0.01) {
    return '<0.01%';
  }

  if (value < 1) {
    return `${value.toFixed(2)}%`;
  }

  return `${value.toFixed(1)}%`;
}

function clampPercent(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
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

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setUsage(null);
      return;
    }

    let alive = true;

    const load =
      async () => {
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
                cache:
                  'no-store',
              }
            );

          const data =
            (await response.json()) as
              UsageResponse;

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

  const hasStorageLimit =
    !!usage &&
    usage.storageLimit !== null &&
    usage.storageLimit > 0;

  const storagePercent =
    useMemo(() => {
      if (!usage) {
        return null;
      }

      if (
        usage.storagePercent !== null
      ) {
        return usage.storagePercent;
      }

      if (
        usage.storageUsage !== null &&
        usage.storageLimit !== null &&
        usage.storageLimit > 0
      ) {
        return (
          usage.storageUsage /
          usage.storageLimit
        ) * 100;
      }

      return null;
    }, [usage]);

  const creditPercent =
    usage?.credits?.used_percent ??
    (
      usage?.credits?.usage !==
        undefined &&
      usage?.credits?.limit !==
        undefined &&
      usage.credits.limit > 0
        ? (
            usage.credits.usage /
            usage.credits.limit
          ) * 100
        : null
    );

  const barPercent =
    hasStorageLimit
      ? clampPercent(
          storagePercent
        )
      : clampPercent(
          creditPercent
        );

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding:
            '80px 32px',
          color: '#f5f5f5',
          textAlign:
            'center',
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
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                letterSpacing:
                  '.16em',
                color:
                  'rgba(255,255,255,.42)',
              }}
            >
              CLOUDINARY STORAGE
            </p>

            {usage?.plan && (
              <span
                style={{
                  padding:
                    '4px 8px',
                  border:
                    '1px solid rgba(255,255,255,.14)',
                  borderRadius:
                    999,
                  fontSize: 9,
                  letterSpacing:
                    '.08em',
                  color:
                    'rgba(255,255,255,.48)',
                }}
              >
                {usage.plan.toUpperCase()}
              </span>
            )}
          </div>

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
          ) : usage ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'baseline',
                  gap: 8,
                  flexWrap:
                    'wrap',
                }}
              >
                <strong
                  style={{
                    fontSize: 34,
                    letterSpacing:
                      '-.02em',
                  }}
                >
                  {formatBytes(
                    usage.totalBytes
                  )}
                </strong>

                {hasStorageLimit && (
                  <span
                    style={{
                      color:
                        'rgba(255,255,255,.42)',
                      fontSize: 13,
                    }}
                  >
                    /{' '}
                    {formatBytes(
                      usage.storageLimit
                    )}
                  </span>
                )}
              </div>

              <div
                style={{
                  display:
                    'flex',
                  gap: 14,
                  flexWrap:
                    'wrap',
                  margin:
                    '5px 0 20px',
                  fontSize: 11,
                  color:
                    'rgba(255,255,255,.5)',
                }}
              >
                <span>
                  {
                    usage.imageCount
                  }{' '}
                  IMAGES
                </span>

                {hasStorageLimit &&
                  storagePercent !==
                    null && (
                    <span>
                      {formatPercent(
                        storagePercent
                      )}{' '}
                      USED
                    </span>
                  )}
              </div>

              <div
                style={{
                  height: 7,
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
                      `${barPercent}%`,
                    minWidth:
                      barPercent > 0
                        ? 2
                        : 0,
                    height:
                      '100%',
                    background:
                      'rgba(255,255,255,.75)',
                    borderRadius:
                      999,
                    transition:
                      'width .35s ease',
                  }}
                />
              </div>

              {hasStorageLimit ? (
                <p
                  style={{
                    margin:
                      '10px 0 0',
                    fontSize: 10,
                    color:
                      'rgba(255,255,255,.36)',
                  }}
                >
                  {formatBytes(
                    usage.storageUsage
                  )}{' '}
                  registered by Cloudinary
                </p>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                  }}
                >
                  <p
                    style={{
                      margin:
                        '0 0 5px',
                      fontSize: 10,
                      color:
                        'rgba(255,255,255,.38)',
                    }}
                  >
                    STORAGE LIMIT IS NOT REPORTED SEPARATELY
                  </p>

                  {creditPercent !==
                    null && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color:
                          'rgba(255,255,255,.55)',
                      }}
                    >
                      CLOUDINARY CREDITS:{' '}
                      {formatPercent(
                        creditPercent
                      )}{' '}
                      USED
                      {usage.credits
                        ?.limit !==
                        undefined &&
                        usage.credits
                          ?.usage !==
                          undefined
                        ? ` (${usage.credits.usage} / ${usage.credits.limit})`
                        : ''}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}
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
