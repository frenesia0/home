'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';
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

type ScanSuccess = {
  ok: true;
  total: number;
  used: number;
  orphanCount: number;
  orphans: OrphanImage[];
};

type ScanError = {
  error: string;
};

type ScanResponse =
  | ScanSuccess
  | ScanError;

const PAGE_SIZE = 24;

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '-';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

/**
 * 管理画面の一覧で原寸画像を読ませない。
 * Cloudinary側で軽い正方形サムネイルを生成して表示する。
 */

function cloudinaryPublicIdFromRef(ref?: string): string | null {
  if (!ref || !/^https?:\/\//.test(ref) || !ref.includes('/upload/')) {
    return null;
  }

  try {
    const url = new URL(ref);
    const marker = '/upload/';
    const index = url.pathname.indexOf(marker);

    if (index < 0) return null;

    let rest = url.pathname.slice(index + marker.length);

    // Cloudinary URL:
    // /upload/[transformations]/v1234567890/folder/public_id.png
    const parts = rest.split('/').filter(Boolean);

    const versionIndex = parts.findIndex(part => /^v\d+$/.test(part));
    if (versionIndex >= 0) {
      parts.splice(0, versionIndex + 1);
    } else {
      // version無しの場合、既知の変換指定らしき先頭要素だけ除外
      while (
        parts.length > 1 &&
        /^(?:[a-z]+_[^/]+|f_[^/]+|q_[^/]+|c_[^/]+|w_\d+|h_\d+)(?:,|$)/.test(parts[0])
      ) {
        parts.shift();
      }
    }

    if (parts.length === 0) return null;

    const last = parts[parts.length - 1].replace(/\.[^.]+$/, '');
    parts[parts.length - 1] = last;

    return parts.join('/') || null;
  } catch {
    return null;
  }
}

function collectCharacterPublicIds(chars: Character[]): string[] {
  const ids = new Set<string>();

  const addRef = (ref?: string) => {
    const id = cloudinaryPublicIdFromRef(ref);
    if (id) ids.add(id);
  };

  for (const char of chars) {
    addRef(char.profileFullId);
    addRef(char.profileBustId);
    addRef(char.signId);
    addRef(char.artId);
    addRef(char.artUrl);
    addRef(char.thumbId);

    for (const ref of char.arts ?? []) {
      addRef(ref);
    }

    for (const outfit of char.outfits ?? []) {
      addRef(outfit.fullImageId);
      addRef(outfit.bustImageId);
    }

    for (const voice of char.voices ?? []) {
      // 現在は画像未使用判定なので audioId は対象外。
      // 将来画像参照が増えたらここへ追加する。
      void voice;
    }
  }

  return [...ids];
}

function thumbnailUrl(url: string) {
  if (
    !url ||
    !url.includes('/upload/')
  ) {
    return url;
  }

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:eco,c_fill,w_320,h_320/'
  );
}

function collectUsedPublicIds(
  posts: GalleryPost[]
) {
  const ids =
    new Set<string>();

  for (const post of posts) {
    for (
      const image of
      getGalleryImages(post)
    ) {
      if (image.publicId) {
        ids.add(
          image.publicId
        );
      }
    }

    const thumbnail =
      getGalleryThumbnailImage(
        post
      );

    if (
      thumbnail?.publicId
    ) {
      ids.add(
        thumbnail.publicId
      );
    }

    if (
      post.customThumbnail
        ?.publicId
    ) {
      ids.add(
        post.customThumbnail
          .publicId
      );
    }
  }

  return [...ids];
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

export default function OrphanImagesPage() {
  const router =
    useRouter();

  const { isAdmin } =
    useAuth();

  const [chars, , charsLoaded] =
    useLocalList<Character>(
      'ohome.chars.v1',
      CHAR_SEED
    );

  const effectiveChars =
    chars.length > 0
      ? chars
      : CHAR_SEED;

  const [loading, setLoading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [result, setResult] =
    useState<ScanSuccess | null>(
      null
    );

  const [selected, setSelected] =
    useState<Set<string>>(
      () => new Set()
    );

  const [page, setPage] =
    useState(1);

  const orphans =
    useMemo(
      () =>
        result?.orphans ?? [],
      [result]
    );

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        orphans.length /
          PAGE_SIZE
      )
    );

  const currentPage =
    Math.min(
      page,
      pageCount
    );

  const visibleImages =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE;

      return orphans.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      orphans,
      currentPage,
    ]);

  const selectedCount =
    selected.size;

  const allVisibleSelected =
    visibleImages.length > 0 &&
    visibleImages.every(
      image =>
        selected.has(
          image.publicId
        )
    );

  useEffect(() => {
    if (!isAdmin) {
      setResult(null);
      setSelected(
        new Set()
      );
    }
  }, [isAdmin]);

  useEffect(() => {
    if (
      page > pageCount
    ) {
      setPage(pageCount);
    }
  }, [
    page,
    pageCount,
  ]);

  const scan =
    async () => {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const posts =
          await fetchGalleryPosts();

        const galleryPublicIds =
          collectUsedPublicIds(
            posts
          );

        const characterPublicIds =
          collectCharacterPublicIds(
            effectiveChars
          );

        const usedPublicIds =
          [...new Set([
            ...galleryPublicIds,
            ...characterPublicIds,
          ])];

        const token =
          await getAdminToken();

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
              body:
                JSON.stringify({
                  usedPublicIds,
                }),
            }
          );

        const data =
          (await response.json()) as
            ScanResponse;

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
        setSelected(
          new Set()
        );
        setPage(1);
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

  const toggleSelected = (
    publicId: string
  ) => {
    setSelected(
      current => {
        const next =
          new Set(current);

        if (
          next.has(publicId)
        ) {
          next.delete(
            publicId
          );
        } else {
          next.add(
            publicId
          );
        }

        return next;
      }
    );
  };

  const toggleVisible =
    () => {
      setSelected(
        current => {
          const next =
            new Set(current);

          if (
            allVisibleSelected
          ) {
            for (
              const image of
              visibleImages
            ) {
              next.delete(
                image.publicId
              );
            }
          } else {
            for (
              const image of
              visibleImages
            ) {
              next.add(
                image.publicId
              );
            }
          }

          return next;
        }
      );
    };

  const clearSelection =
    () => {
      setSelected(
        new Set()
      );
    };

  const deleteSelected =
    async () => {
      const publicIds =
        [...selected];

      if (
        publicIds.length === 0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `${publicIds.length}件の画像をCloudinaryから完全削除します。\n\nこの操作は元に戻せません。本当に削除しますか？`
        );

      if (!confirmed) {
        return;
      }

      setDeleting(true);
      setError('');
      setMessage('');

      try {
        const token =
          await getAdminToken();

        const response =
          await fetch(
            '/api/cloudinary/delete',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
              body:
                JSON.stringify({
                  publicIds,
                }),
            }
          );

        const data =
          (await response.json()) as {
            ok?: boolean;
            deleted?: string[];
            error?: string;
          };

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ??
              '画像を削除できませんでした。'
          );
        }

        const deleted =
          new Set(
            data.deleted ??
              publicIds
          );

        setResult(
          current =>
            current
              ? {
                  ...current,
                  total:
                    Math.max(
                      0,
                      current.total -
                        deleted.size
                    ),
                  orphanCount:
                    Math.max(
                      0,
                      current.orphanCount -
                        deleted.size
                    ),
                  orphans:
                    current.orphans.filter(
                      image =>
                        !deleted.has(
                          image.publicId
                        )
                    ),
                }
              : current
        );

        setSelected(
          new Set()
        );

        setMessage(
          `${deleted.size}件をCloudinaryから完全削除しました。`
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '画像の削除に失敗しました。'
        );
      } finally {
        setDeleting(false);
      }
    };

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin:
            '0 auto',
          padding:
            '80px 32px',
          color:
            '#f5f5f5',
          textAlign:
            'center',
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
            router.push(
              '/gallery'
            )
          }
          style={{
            marginTop: 20,
            padding:
              '10px 18px',
            borderRadius: 8,
            cursor:
              'pointer',
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
        margin:
          '0 auto',
        padding:
          '56px 32px 90px',
        color:
          '#f5f5f5',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              margin:
                '0 0 8px',
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
            GALLERY・CHARACTERから参照されていないCloudinary画像を確認・整理します。
          </p>
        </div>

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
              '1px solid rgba(255,255,255,.25)',
            background:
              'transparent',
            color:
              '#f5f5f5',
            cursor:
              'pointer',
          }}
        >
          ← GALLERY
        </button>
      </div>

      <div
        style={{
          padding: 18,
          border:
            '1px solid rgba(255,255,255,.16)',
          borderRadius: 12,
          background:
            'rgba(255,255,255,.035)',
          marginBottom: 22,
          display: 'flex',
          gap: 10,
          alignItems:
            'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={scan}
          disabled={
            loading ||
            deleting ||
            !charsLoaded
          }
          style={{
            padding:
              '11px 18px',
            borderRadius: 8,
            border: 0,
            background:
              '#f1f1f1',
            color:
              '#17191d',
            fontWeight: 700,
            cursor:
              loading
                ? 'wait'
                : 'pointer',
            opacity:
              loading ||
              deleting
                ? .6
                : 1,
          }}
        >
          {!charsLoaded
            ? 'キャラクター情報を読込中...'
            : loading
              ? '確認中...'
              : '未使用画像を確認'}
        </button>

        {result && (
          <>
            <button
              type="button"
              onClick={
                toggleVisible
              }
              disabled={
                deleting
              }
              style={{
                padding:
                  '11px 16px',
                borderRadius: 8,
                border:
                  '1px solid rgba(255,255,255,.24)',
                background:
                  'transparent',
                color:
                  '#f5f5f5',
                cursor:
                  'pointer',
              }}
            >
              {allVisibleSelected
                ? 'このページの選択を解除'
                : 'このページを全選択'}
            </button>

            {selectedCount >
              0 && (
              <>
                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  disabled={
                    deleting
                  }
                  style={{
                    padding:
                      '11px 16px',
                    borderRadius:
                      8,
                    border:
                      '1px solid rgba(255,255,255,.24)',
                    background:
                      'transparent',
                    color:
                      '#f5f5f5',
                    cursor:
                      'pointer',
                  }}
                >
                  選択解除
                </button>

                <button
                  type="button"
                  onClick={
                    deleteSelected
                  }
                  disabled={
                    deleting
                  }
                  style={{
                    padding:
                      '11px 18px',
                    borderRadius:
                      8,
                    border:
                      '1px solid rgba(220,90,100,.55)',
                    background:
                      'rgba(170,45,55,.18)',
                    color:
                      '#ffb4ba',
                    fontWeight:
                      700,
                    cursor:
                      deleting
                        ? 'wait'
                        : 'pointer',
                  }}
                >
                  {deleting
                    ? '削除中...'
                    : `選択した${selectedCount}件を完全削除`}
                </button>
              </>
            )}
          </>
        )}
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

      {message && (
        <p
          style={{
            padding: 14,
            borderRadius: 8,
            background:
              'rgba(255,255,255,.06)',
            border:
              '1px solid rgba(255,255,255,.16)',
          }}
        >
          {message}
        </p>
      )}

      {result && (
        <>
          <div
            style={{
              display:
                'flex',
              gap: 20,
              flexWrap:
                'wrap',
              margin:
                '0 0 18px',
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
              {
                result.orphanCount
              }
            </span>

            <span>
              選択中：
              {selectedCount}
            </span>
          </div>

          {orphans.length ===
          0 ? (
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
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                {visibleImages.map(
                  image => {
                    const active =
                      selected.has(
                        image.publicId
                      );

                    return (
                      <article
                        key={
                          image.publicId
                        }
                        onClick={() =>
                          toggleSelected(
                            image.publicId
                          )
                        }
                        style={{
                          position:
                            'relative',
                          border:
                            active
                              ? '2px solid #f5f5f5'
                              : '1px solid rgba(255,255,255,.16)',
                          borderRadius:
                            10,
                          overflow:
                            'hidden',
                          background:
                            'rgba(255,255,255,.035)',
                          cursor:
                            'pointer',
                          boxSizing:
                            'border-box',
                        }}
                      >
                        <div
                          style={{
                            aspectRatio:
                              '1 / 1',
                            background:
                              'rgba(255,255,255,.04)',
                            position:
                              'relative',
                          }}
                        >
                          {image.url && (
                            <img
                              src={thumbnailUrl(
                                image.url
                              )}
                              alt=""
                              loading="lazy"
                              decoding="async"
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
                          )}

                          <div
                            style={{
                              position:
                                'absolute',
                              top: 9,
                              right: 9,
                              width: 24,
                              height: 24,
                              borderRadius:
                                '50%',
                              border:
                                '1px solid rgba(255,255,255,.65)',
                              background:
                                active
                                  ? '#f5f5f5'
                                  : 'rgba(10,12,15,.6)',
                              color:
                                '#17191d',
                              display:
                                'grid',
                              placeItems:
                                'center',
                              fontSize:
                                14,
                              fontWeight:
                                900,
                            }}
                          >
                            {active
                              ? '✓'
                              : ''}
                          </div>
                        </div>

                        <div
                          style={{
                            padding:
                              11,
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
                    );
                  }
                )}
              </div>

              {pageCount >
                1 && (
                <div
                  style={{
                    marginTop:
                      28,
                    display:
                      'flex',
                    justifyContent:
                      'center',
                    alignItems:
                      'center',
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      currentPage <=
                      1
                    }
                    onClick={() =>
                      setPage(
                        current =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                    style={{
                      padding:
                        '9px 14px',
                      borderRadius:
                        8,
                      cursor:
                        'pointer',
                    }}
                  >
                    ←
                  </button>

                  <span
                    style={{
                      fontSize:
                        12,
                      color:
                        'rgba(255,255,255,.65)',
                    }}
                  >
                    {
                      currentPage
                    }{' '}
                    /{' '}
                    {
                      pageCount
                    }
                  </span>

                  <button
                    type="button"
                    disabled={
                      currentPage >=
                      pageCount
                    }
                    onClick={() =>
                      setPage(
                        current =>
                          Math.min(
                            pageCount,
                            current +
                              1
                          )
                      )
                    }
                    style={{
                      padding:
                        '9px 14px',
                      borderRadius:
                        8,
                      cursor:
                        'pointer',
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
