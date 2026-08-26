'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  getCachedGalleryPosts,
  getGalleryCharacters,
  getGalleryCommission,
  getGalleryImages,
  getGallerySong,
  getGalleryTags,
  subscribeGallery,
  type GalleryCharacter,
  type GalleryPost,
  type GalleryTag,
} from '@/lib/galleryData';
import { WatermarkedImage } from '@/components/gallery/WatermarkedImage';

function characterLabel(character: GalleryCharacter) {
  return character.toUpperCase();
}

function tagLabel(tag: GalleryTag) {
  if (tag === 'song-parody') return 'SONG PARODY';
  if (tag === 'single-illustration') return '一枚絵';
  if (tag === 'deformed') return 'デフォルメ';
  return tag.toUpperCase();
}

function optimizeThumbUrl(url: string) {
  if (!url.includes('/upload/')) return url;

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:good,c_limit,w_360/'
  );
}

export default function GalleryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isAdmin } = useAuth();

  const id =
    typeof params?.id === 'string'
      ? decodeURIComponent(params.id)
      : '';

  const [post, setPost] =
    useState<GalleryPost | null>(null);
  const [imageIndex, setImageIndex] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');

  const [allPosts, setAllPosts] =
    useState<GalleryPost[]>([]);

  useEffect(() => {
    let alive = true;
    let firstSnapshot = true;

    const cachedPosts =
      getCachedGalleryPosts();

    const applyPosts = (
      posts: GalleryPost[]
    ) => {
      const found =
        posts.find(
          item =>
            item.id === id
        ) ?? null;

      if (!alive) return;

      setAllPosts(posts);
      setPost(found);
      setImageIndex(0);
      setError(
        found
          ? ''
          : '作品が見つかりませんでした。'
      );
      setLoading(false);
    };

    if (
      cachedPosts &&
      cachedPosts.length > 0
    ) {
      applyPosts(
        cachedPosts
      );
    } else {
      setLoading(true);
    }

    const loadFresh =
      async () => {
        try {
          const posts =
            await fetchGalleryPosts();

          applyPosts(
            posts
          );
        } catch (err) {
          if (
            alive &&
            !cachedPosts
          ) {
            setError(
              err instanceof Error
                ? err.message
                : '作品を読み込めませんでした。'
            );
            setLoading(false);
          }
        }
      };

    void loadFresh();

    const off =
      subscribeGallery(
        () => {
          if (
            firstSnapshot
          ) {
            firstSnapshot =
              false;
            return;
          }

          void loadFresh();
        }
      );

    return () => {
      alive = false;
      off();
    };
  }, [id]);

  useEffect(() => {
    setImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (!post) return;

    const images =
      getGalleryImages(post);

    if (
      images.length === 0 ||
      imageIndex >= images.length
    ) {
      setImageIndex(0);
    }
  }, [post, imageIndex]);

  useEffect(() => {
    if (!post) return;

    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      const images =
        getGalleryImages(post);

      if (
        event.key === 'ArrowLeft' &&
        images.length > 1
      ) {
        setImageIndex((current) =>
          current <= 0
            ? images.length - 1
            : current - 1
        );
      }

      if (
        event.key === 'ArrowRight' &&
        images.length > 1
      ) {
        setImageIndex((current) =>
          current >= images.length - 1
            ? 0
            : current + 1
        );
      }
    };

    window.addEventListener(
      'keydown',
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown
      );
  }, [post]);

  if (loading) {
    return (
      <main
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '70px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <div
          aria-label="読み込み中"
          style={{
            display: 'inline-grid',
            justifyItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border:
                '2px solid rgba(255,255,255,.18)',
              borderTopColor:
                'rgba(255,255,255,.78)',
              animation:
                'galleryDetailSpin .8s linear infinite',
            }}
          />

          <span
            style={{
              fontSize: '11px',
              letterSpacing: '.12em',
              color:
                'rgba(255,255,255,.52)',
            }}
          >
            LOADING
          </span>
        </div>

        <style jsx global>{`
          @keyframes galleryDetailSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '70px 32px',
          color: '#ff8d8d',
        }}
      >
        <p>{error}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '70px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: '24px',
          }}
        >
          NOT FOUND
        </h1>

        <p
          style={{
            color:
              'rgba(255,255,255,.55)',
          }}
        >
          指定された作品が見つかりませんでした。
        </p>

        <button
          type="button"
          onClick={() =>
            router.push('/gallery')
          }
          style={{
            marginTop: '20px',
            padding: '10px 16px',
            borderRadius: '8px',
            border:
              '1px solid rgba(255,255,255,.2)',
            background:
              'rgba(255,255,255,.08)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          GALLERYへ戻る
        </button>
      </main>
    );
  }

  const images =
    getGalleryImages(post);

  const characters =
    getGalleryCharacters(post);

  const tags =
    getGalleryTags(post);

  const commission =
    getGalleryCommission(post);

  const song =
    getGallerySong(post);

  const currentImage =
    images[imageIndex] ?? null;

  const sortedPosts =
    allPosts
      .filter(
        (item) =>
          item.category ===
          post.category
      )
      .sort(
      (a, b) => {
        const dateCompare =
          b.date.localeCompare(
            a.date
          );

        if (
          dateCompare !== 0
        ) {
          return dateCompare;
        }

        return b.id.localeCompare(
          a.id
        );
      }
    );

  const currentPostIndex =
    sortedPosts.findIndex(
      (item) =>
        item.id === post.id
    );

  const prevPost =
    currentPostIndex > 0
      ? sortedPosts[
          currentPostIndex - 1
        ]
      : null;

  const nextPost =
    currentPostIndex >= 0 &&
    currentPostIndex <
      sortedPosts.length - 1
      ? sortedPosts[
          currentPostIndex + 1
        ]
      : null;

  const goPost = (
    target: GalleryPost | null
  ) => {
    if (!target) return;

    /*
     * 先に手元のデータへ表示を切り替える。
     * その後URLを更新するため、PREV / NEXTで
     * LOADING表示を挟みにくくする。
     */
    setPost(target);
    setImageIndex(0);
    setError('');

    router.push(
      `/gallery/${encodeURIComponent(
        target.id
      )}`
    );
  };

  return (
    <main
      className="gallery-detail-page"
      style={{
        maxWidth: '1220px',
        margin: '0 auto',
        padding: '42px 32px 80px',
        color: '#f5f5f5',
      }}
    >
      <div
        className="gallery-detail-topline"
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          gap: '18px',
          marginBottom: '18px',
        }}
      >
        <button
          type="button"
          onClick={() =>
            router.push('/gallery')
          }
          style={{
            padding: 0,
            border: 0,
            background:
              'transparent',
            color:
              'rgba(255,255,255,.62)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ← GALLERY
        </button>

        <div
          className="gallery-detail-navgroup"
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            disabled={!prevPost}
            onClick={() =>
              goPost(prevPost)
            }
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border:
                '1px solid rgba(255,255,255,.2)',
              background:
                prevPost
                  ? 'rgba(255,255,255,.06)'
                  : 'rgba(255,255,255,.025)',
              color:
                prevPost
                  ? '#fff'
                  : 'rgba(255,255,255,.28)',
              cursor:
                prevPost
                  ? 'pointer'
                  : 'default',
              fontSize: '10px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            ← PREV
          </button>

          <button
            type="button"
            disabled={!nextPost}
            onClick={() =>
              goPost(nextPost)
            }
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border:
                '1px solid rgba(255,255,255,.2)',
              background:
                nextPost
                  ? 'rgba(255,255,255,.06)'
                  : 'rgba(255,255,255,.025)',
              color:
                nextPost
                  ? '#fff'
                  : 'rgba(255,255,255,.28)',
              cursor:
                nextPost
                  ? 'pointer'
                  : 'default',
              fontSize: '10px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            NEXT →
          </button>

          <span
            style={{
              color:
                'rgba(255,255,255,.45)',
              fontSize: '11px',
            }}
          >
            {post.id}
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/gallery/${encodeURIComponent(
                    post.id
                  )}/edit`
                )
              }
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border:
                  '1px solid rgba(255,255,255,.2)',
                background:
                  'rgba(255,255,255,.08)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              EDIT
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          border:
            '1px solid rgba(255,255,255,.14)',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#15181d',
        }}
      >
        <div
          className="gallery-detail-layout"
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 1fr) minmax(250px, 320px)',
          }}
        >
          <section
            className="gallery-detail-viewer"
            style={{
              position: 'relative',
              minWidth: 0,
              height:
                'clamp(420px, calc(100dvh - 220px), 820px)',
              background: '#0c0f12',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            {currentImage ? (
              <WatermarkedImage
                src={currentImage.url}
                alt={`illustration ${
                  imageIndex + 1
                }`}
                watermark={currentImage.watermark}
                fit="contain"
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <div
                style={{
                  color:
                    'rgba(255,255,255,.4)',
                  fontSize: '12px',
                }}
              >
                NO IMAGE
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="前の画像"
                  onClick={() =>
                    setImageIndex(
                      (current) =>
                        current <= 0
                          ? images.length -
                            1
                          : current - 1
                    )
                  }
                  style={{
                    position:
                      'absolute',
                    left: '16px',
                    top: '50%',
                    transform:
                      'translateY(-50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius:
                      '999px',
                    border:
                      '1px solid rgba(255,255,255,.24)',
                    background:
                      'rgba(0,0,0,.55)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  aria-label="次の画像"
                  onClick={() =>
                    setImageIndex(
                      (current) =>
                        current >=
                        images.length -
                          1
                          ? 0
                          : current +
                            1
                    )
                  }
                  style={{
                    position:
                      'absolute',
                    right: '16px',
                    top: '50%',
                    transform:
                      'translateY(-50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius:
                      '999px',
                    border:
                      '1px solid rgba(255,255,255,.24)',
                    background:
                      'rgba(0,0,0,.55)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                >
                  ›
                </button>
              </>
            )}
          </section>

          <aside
            className="gallery-detail-info"
            style={{
              minWidth: 0,
              padding: '24px',
              borderLeft:
                '1px solid rgba(255,255,255,.1)',
              display: 'grid',
              alignContent: 'start',
              gap: '22px',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 7px',
                  fontSize: '11px',
                  color:
                    'rgba(255,255,255,.46)',
                }}
              >
                DATE
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color:
                    'rgba(255,255,255,.86)',
                }}
              >
                {post.date}
              </p>
            </div>

            <div>
              <p
                style={{
                  margin: '0 0 7px',
                  fontSize: '11px',
                  color:
                    'rgba(255,255,255,.46)',
                }}
              >
                CATEGORY
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  lineHeight: 1.7,
                  color:
                    'rgba(255,255,255,.86)',
                }}
              >
                {post.category ===
                'commission'
                  ? [
                      'COMMISSION',
                      ...characters.map(
                        characterLabel
                      ),
                    ].join(' · ')
                  : [
                      'ORIGINAL',
                      ...characters.map(
                        characterLabel
                      ),
                      ...tags.map(
                        tagLabel
                      ),
                    ].join(' · ')}
              </p>
            </div>

            {post.category ===
              'commission' &&
              commission && (
              <div>
                <p
                  style={{
                    margin: '0 0 7px',
                    fontSize: '11px',
                    color:
                      'rgba(255,255,255,.46)',
                  }}
                >
                  ARTIST
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    lineHeight: 1.8,
                    color:
                      'rgba(255,255,255,.86)',
                  }}
                >
                  {commission.artistName}
                  様
                </p>

                {commission.snsUrl ? (
                  <a
                    href={
                      commission.snsUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:
                        'inline-block',
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#fff',
                      textDecoration:
                        'underline',
                      textUnderlineOffset:
                        '3px',
                    }}
                  >
                    {commission.snsId ||
                      'SNSを見る'}
                  </a>
                ) : (
                  commission.snsId && (
                    <p
                      style={{
                        margin:
                          '6px 0 0',
                        fontSize: '12px',
                        color:
                          'rgba(255,255,255,.65)',
                      }}
                    >
                      {
                        commission.snsId
                      }
                    </p>
                  )
                )}
              </div>
            )}

            {song && (
              <div>
                <p
                  style={{
                    margin: '0 0 7px',
                    fontSize: '11px',
                    color:
                      'rgba(255,255,255,.46)',
                  }}
                >
                  SONG
                </p>

                {song.title && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      lineHeight: 1.8,
                      color:
                        'rgba(255,255,255,.86)',
                    }}
                  >
                    {song.title}
                  </p>
                )}

                {song.url && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:
                        'inline-block',
                      marginTop:
                        song.title
                          ? '6px'
                          : 0,
                      fontSize: '12px',
                      color: '#fff',
                      textDecoration:
                        'underline',
                      textUnderlineOffset:
                        '3px',
                    }}
                  >
                    曲のリンクを開く
                  </a>
                )}

                {song.audioUrl && (
                  <div
                    style={{
                      marginTop:
                        song.title ||
                        song.url
                          ? '12px'
                          : 0,
                    }}
                  >
                    <audio
                      controls
                      preload="metadata"
                      src={song.audioUrl}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                      }}
                    >
                      お使いのブラウザは音声再生に対応していません。
                    </audio>
                  </div>
                )}
              </div>
            )}

            {images.length > 1 && (
              <div>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '11px',
                    color:
                      'rgba(255,255,255,.46)',
                  }}
                >
                  IMAGES
                </p>

                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: '11px',
                    color:
                      'rgba(255,255,255,.56)',
                  }}
                >
                  {imageIndex + 1} /{' '}
                  {images.length}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(4, minmax(0, 1fr))',
                    gap: '7px',
                  }}
                >
                  {images.map(
                    (image, index) => (
                      <button
                        key={
                          image.publicId
                        }
                        type="button"
                        onClick={() =>
                          setImageIndex(
                            index
                          )
                        }
                        style={{
                          padding: 0,
                          borderRadius:
                            '6px',
                          overflow:
                            'hidden',
                          aspectRatio:
                            '1 / 1',
                          border:
                            imageIndex ===
                            index
                              ? '2px solid #fff'
                              : '1px solid rgba(255,255,255,.18)',
                          background:
                            'rgba(255,255,255,.05)',
                          cursor:
                            'pointer',
                        }}
                      >
                        <img
                          src={optimizeThumbUrl(
                            image.url
                          )}
                          alt={`${index + 1}枚目`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit:
                              'cover',
                            display:
                              'block',
                          }}
                        />
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 760px) {
          .gallery-detail-page {
            padding:
              28px 16px
              calc(
                96px +
                env(safe-area-inset-bottom)
              ) !important;
          }

          .gallery-detail-topline {
            gap: 12px !important;
            margin-bottom:
              16px !important;
            align-items:
              flex-start !important;
          }

          .gallery-detail-navgroup {
            max-width: 70%;
          }

          .gallery-detail-layout {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }

          .gallery-detail-viewer {
            width: 100% !important;
            min-width: 0 !important;
            height:
              clamp(
                320px,
                62dvh,
                620px
              ) !important;
          }

          .gallery-detail-info {
            min-width: 0 !important;
            padding:
              22px 18px
              24px !important;
            border-left:
              0 !important;
            border-top:
              1px solid
              rgba(
                255,
                255,
                255,
                .1
              ) !important;
          }

          .gallery-detail-info audio {
            display: block;
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        @media (max-width: 430px) {
          .gallery-detail-page {
            padding-left:
              12px !important;
            padding-right:
              12px !important;
          }

          .gallery-detail-viewer {
            height:
              clamp(
                300px,
                58dvh,
                560px
              ) !important;
          }

          .gallery-detail-info {
            padding:
              20px 16px
              22px !important;
          }
        }
      `}</style>
    </main>
  );
}
