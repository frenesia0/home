'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  getGalleryCharacters,
  getGalleryCommission,
  getGalleryImages,
  getGallerySong,
  getGalleryTags,
  subscribeGallery,
  type GalleryCategory,
  type GalleryCharacter,
  type GalleryPost,
  type GalleryTag,
} from '@/lib/galleryData';

type CharacterFilter = 'all' | GalleryCharacter;
type TagFilter = 'all' | GalleryTag;
type SortOrder = 'newest' | 'oldest';

function characterLabel(character: GalleryCharacter) {
  return character.toUpperCase();
}

function tagLabel(tag: GalleryTag) {
  if (tag === 'song-parody') return 'SONG PARODY';
  return tag.toUpperCase();
}

function optimizeThumbUrl(url: string) {
  if (!url.includes('/upload/')) return url;

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:good,c_limit,w_360/'
  );
}

function isCategory(value: string | null): value is GalleryCategory {
  return value === 'original' || value === 'commission';
}

function isCharacterFilter(
  value: string | null
): value is CharacterFilter {
  return (
    value === 'all' ||
    value === 'shiki' ||
    value === 'solas'
  );
}

function isTagFilter(
  value: string | null
): value is TagFilter {
  return (
    value === 'all' ||
    value === 'reference' ||
    value === 'song-parody' ||
    value === 'manga' ||
    value === 'rakugaki' ||
    value === 'tachie'
  );
}

function isSortOrder(
  value: string | null
): value is SortOrder {
  return value === 'newest' || value === 'oldest';
}

export default function GalleryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const id =
    typeof params?.id === 'string'
      ? decodeURIComponent(params.id)
      : '';

  const category: GalleryCategory =
    isCategory(searchParams.get('category'))
      ? searchParams.get('category') as GalleryCategory
      : 'original';

  const character: CharacterFilter =
    isCharacterFilter(searchParams.get('character'))
      ? searchParams.get('character') as CharacterFilter
      : 'all';

  const tag: TagFilter =
    isTagFilter(searchParams.get('tag'))
      ? searchParams.get('tag') as TagFilter
      : 'all';

  const sortOrder: SortOrder =
    isSortOrder(searchParams.get('sort'))
      ? searchParams.get('sort') as SortOrder
      : 'newest';

  const [allPosts, setAllPosts] =
    useState<GalleryPost[]>([]);
  const [post, setPost] =
    useState<GalleryPost | null>(null);
  const [imageIndex, setImageIndex] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!id) {
        if (alive) {
          setPost(null);
          setAllPosts([]);
          setLoading(false);
        }
        return;
      }

      try {
        const posts =
          await fetchGalleryPosts();

        const found =
          posts.find(
            (item) => item.id === id
          ) ?? null;

        if (alive) {
          setAllPosts(posts);
          setPost(found);
          setError('');
        }
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : '作品を読み込めませんでした。'
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void load();

    const off = subscribeGallery(() => {
      void load();
    });

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

  const filteredPosts = useMemo(() => {
    return allPosts
      .filter((item) => item.category === category)
      .filter((item) => {
        if (character === 'all') return true;

        return getGalleryCharacters(item).includes(
          character
        );
      })
      .filter((item) => {
        if (
          category === 'commission' ||
          tag === 'all'
        ) {
          return true;
        }

        return getGalleryTags(item).includes(tag);
      })
      .sort((a, b) =>
        sortOrder === 'newest'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date)
      );
  }, [
    allPosts,
    category,
    character,
    tag,
    sortOrder,
  ]);

  const currentIndex = useMemo(
    () =>
      filteredPosts.findIndex(
        (item) => item.id === id
      ),
    [filteredPosts, id]
  );

  const previousPost =
    currentIndex > 0
      ? filteredPosts[currentIndex - 1]
      : null;

  const nextPost =
    currentIndex >= 0 &&
    currentIndex < filteredPosts.length - 1
      ? filteredPosts[currentIndex + 1]
      : null;

  const contextQuery = useMemo(() => {
    const query = new URLSearchParams();

    if (category !== 'original') {
      query.set('category', category);
    }

    if (character !== 'all') {
      query.set('character', character);
    }

    if (
      category === 'original' &&
      tag !== 'all'
    ) {
      query.set('tag', tag);
    }

    if (sortOrder !== 'newest') {
      query.set('sort', sortOrder);
    }

    return query.toString();
  }, [
    category,
    character,
    tag,
    sortOrder,
  ]);

  const goToPost = (
    target: GalleryPost | null
  ) => {
    if (!target) return;

    const base =
      `/gallery/${encodeURIComponent(
        target.id
      )}`;

    router.push(
      contextQuery
        ? `${base}?${contextQuery}`
        : base
    );
  };

  const goBackToGallery = () => {
    router.push(
      contextQuery
        ? `/gallery?${contextQuery}`
        : '/gallery'
    );
  };

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
        LOADING...
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
          onClick={goBackToGallery}
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

  return (
    <main
      style={{
        maxWidth: '1220px',
        margin: '0 auto',
        padding: '42px 32px 80px',
        color: '#f5f5f5',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr auto 1fr',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <button
            type="button"
            onClick={goBackToGallery}
            style={{
              padding: '9px 13px',
              borderRadius: '8px',
              border:
                '1px solid rgba(255,255,255,.18)',
              background:
                'rgba(255,255,255,.07)',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '.05em',
            }}
          >
            ← GALLERY
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            aria-label="前の作品"
            title={
              previousPost
                ? '前の作品'
                : '前の作品はありません'
            }
            disabled={!previousPost}
            onClick={() =>
              goToPost(previousPost)
            }
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '999px',
              border:
                '1px solid rgba(255,255,255,.2)',
              background:
                'rgba(255,255,255,.07)',
              color: '#fff',
              cursor:
                previousPost
                  ? 'pointer'
                  : 'default',
              opacity:
                previousPost
                  ? 1
                  : 0.28,
              fontSize: '18px',
            }}
          >
            ←
          </button>

          <span
            style={{
              minWidth: '84px',
              textAlign: 'center',
              fontSize: '11px',
              color:
                'rgba(255,255,255,.5)',
            }}
          >
            {currentIndex >= 0
              ? `${currentIndex + 1} / ${filteredPosts.length}`
              : ''}
          </span>

          <button
            type="button"
            aria-label="次の作品"
            title={
              nextPost
                ? '次の作品'
                : '次の作品はありません'
            }
            disabled={!nextPost}
            onClick={() =>
              goToPost(nextPost)
            }
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '999px',
              border:
                '1px solid rgba(255,255,255,.2)',
              background:
                'rgba(255,255,255,.07)',
              color: '#fff',
              cursor:
                nextPost
                  ? 'pointer'
                  : 'default',
              opacity:
                nextPost
                  ? 1
                  : 0.28,
              fontSize: '18px',
            }}
          >
            →
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            alignItems: 'center',
          }}
        >
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
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 1fr) minmax(250px, 320px)',
          }}
        >
          <section
            style={{
              position: 'relative',
              minHeight: '620px',
              background: '#0c0f12',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={`illustration ${
                  imageIndex + 1
                }`}
                draggable={false}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight:
                    'calc(100vh - 150px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
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
            style={{
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
    </main>
  );
}
