'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import {
  fetchGalleryPosts,
  getGalleryImages,
  getGalleryThumbnailImage,
  type GalleryPost,
} from '@/lib/galleryData';

type OrphanImage = {
  publicId: string;
  url: string;
  format?: string;
  bytes?: number;
  createdAt?: string;
};

type ScanResponse =
  | {
      ok: true;
      total: number;
      used: number;
      orphanCount: number;
      orphans: OrphanImage[];
    }
  | {
      error: string;
    };

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '-';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function collectUsedPublicIds(posts: GalleryPost[]) {
  const ids = new Set<string>();

  for (const post of posts) {
    for (const image of getGalleryImages(post)) {
      if (image.publicId) {
        ids.add(image.publicId);
      }
    }

    const thumbnail =
      getGalleryThumbnailImage(post);

    if (thumbnail?.publicId) {
      ids.add(thumbnail.publicId);
    }

    if (
      post.customThumbnail?.publicId
    ) {
      ids.add(
        post.customThumbnail.publicId
      );
    }
  }

  return [...ids];
}

export default function OrphanImagesPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [result, setResult] =
    useState<ScanResponse | null>(
      null
    );

  const orphans =
    useMemo(
      () =>
        result &&
        'ok' in result &&
        result.ok
          ? result.orphans
          : [],
      [result]
    );

  useEffect(() => {
    if (!isAdmin) {
      setResult(null);
    }
  }, [isAdmin]);

  const scan = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const posts =
        await fetchGalleryPosts();

      const usedPublicIds =
        collectUsedPublicIds(posts);

      const be =
        backend();

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

      const response =
        await fetch(
          '/api/cloudinary/orphans',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              usedPublicIds,
            }),
          }
        );

      const data =
        (await response.json()) as ScanResponse;

      if (
        !response.ok ||
        !('ok' in data) ||
        !data.ok
      ) {
        throw new Error(
          'error' in data
            ? data.error
            : '未使用画像の確認に失敗しました。'
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '未使用画像の確認に失敗しました。'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '80px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <h1>
          ACCESS DENIED
        </h1>

        <p
          style={{
            color:
              'rgba(255,255,255,.6)',
          }}
        >
          管理者専用ページです。
        </p>

        <button
          type="button"
          onClick={() =>
            router.push('/gallery')
          }
          style={{
            marginTop: 20,
            padding: '10px 18px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          BACK TO GALLERY
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '56px 32px 90px',
        color: '#f5f5f5',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          gap: 20,
          alignItems:
            'flex-start',
          marginBottom: 36,
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: 32,
              letterSpacing:
                '.08em',
            }}
          >
            UNUSED IMAGES
          </h1>

          <p
            style={{
              margin: 0,
              color:
                'rgba(255,255,255,.55)',
              fontSize: 13,
            }}
          >
            GALLERYから参照されていないCloudinary画像を確認します。
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push('/gallery')
          }
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border:
              '1px solid rgba(255,255,255,.25)',
            background:
              'transparent',
            color: '#f5f5f5',
            cursor: 'pointer',
          }}
        >
          ← GALLERY
        </button>
      </div>

      <div
        style={{
          padding: 20,
          border:
            '1px solid rgba(255,255,255,.16)',
          borderRadius: 12,
          background:
            'rgba(255,255,255,.035)',
          marginBottom: 28,
        }}
      >
        <button
          type="button"
          onClick={scan}
          disabled={loading}
          style={{
            padding:
              '12px 20px',
            borderRadius: 8,
            border: 0,
            background:
              '#f1f1f1',
            color: '#17191d',
            fontWeight: 700,
            cursor:
              loading
                ? 'wait'
                : 'pointer',
            opacity:
              loading ? .6 : 1,
          }}
        >
          {loading
            ? '確認中...'
            : '未使用画像を確認'}
        </button>

        <p
          style={{
            margin:
              '12px 0 0',
            fontSize: 12,
            color:
              'rgba(255,255,255,.5)',
          }}
        >
          この画面ではまだ削除しません。
        </p>
      </div>

      {error && (
        <p
          style={{
            padding: 14,
            borderRadius: 8,
            background:
              'rgba(180,60,70,.16)',
            border:
              '1px solid rgba(220,90,100,.35)',
            color:
              '#ff9ba2',
          }}
        >
          {error}
        </p>
      )}

      {result &&
        'ok' in result &&
        result.ok && (
          <>
            <div
              style={{
                display:
                  'flex',
                gap: 22,
                flexWrap:
                  'wrap',
                marginBottom: 28,
                fontSize: 13,
                color:
                  'rgba(255,255,255,.7)',
              }}
            >
              <span>
                Cloudinary総数：
                {result.total}
              </span>

              <span>
                使用中：
                {result.used}
              </span>

              <span>
                未使用候補：
                {result.orphanCount}
              </span>
            </div>

            {orphans.length === 0 ? (
              <p
                style={{
                  padding:
                    '60px 0',
                  textAlign:
                    'center',
                  color:
                    'rgba(255,255,255,.45)',
                }}
              >
                未使用画像はありません。
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 18,
                }}
              >
                {orphans.map(
                  image => (
                    <article
                      key={
                        image.publicId
                      }
                      style={{
                        border:
                          '1px solid rgba(255,255,255,.16)',
                        borderRadius:
                          10,
                        overflow:
                          'hidden',
                        background:
                          'rgba(255,255,255,.035)',
                      }}
                    >
                      <div
                        style={{
                          aspectRatio:
                            '1 / 1',
                          background:
                            'rgba(255,255,255,.04)',
                        }}
                      >
                        {image.url ? (
                          <img
                            src={
                              image.url
                            }
                            alt=""
                            style={{
                              width:
                                '100%',
                              height:
                                '100%',
                              objectFit:
                                'cover',
                              display:
                                'block',
                            }}
                          />
                        ) : null}
                      </div>

                      <div
                        style={{
                          padding:
                            12,
                          display:
                            'grid',
                          gap: 6,
                        }}
                      >
                        <code
                          style={{
                            fontSize:
                              10,
                            overflowWrap:
                              'anywhere',
                            color:
                              'rgba(255,255,255,.75)',
                          }}
                        >
                          {
                            image.publicId
                          }
                        </code>

                        <small
                          style={{
                            color:
                              'rgba(255,255,255,.45)',
                          }}
                        >
                          {formatBytes(
                            image.bytes
                          )}
                          {image.format
                            ? ` · ${image.format.toUpperCase()}`
                            : ''}
                        </small>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </>
        )}
    </main>
  );
}
