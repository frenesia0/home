'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  getGalleryCharacters,
  getGalleryCommission,
  getGalleryImages,
  getGallerySong,
  getGalleryTags,
  getGalleryThumbnailImage,
  subscribeGallery,
  type GalleryCategory,
  type GalleryCharacter,
  type GalleryPost,
  type GalleryTag,
} from '@/lib/galleryData';
import { CropImg } from '@/components/ui/CropEditor';

type CharacterFilter = 'all' | GalleryCharacter;
type TagFilter = 'all' | GalleryTag;
type SortOrder = 'newest' | 'oldest';

function optimizeCloudinaryUrl(url: string) {
  if (!url.includes('/upload/')) return url;

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:best,c_limit,w_1200/'
  );
}

function characterLabel(character: GalleryCharacter) {
  return character.toUpperCase();
}

function tagLabel(tag: GalleryTag) {
  if (tag === 'song-parody') return 'SONG PARODY';
  return tag.toUpperCase();
}

export default function GalleryPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [category, setCategory] =
    useState<GalleryCategory>('original');
  const [character, setCharacter] =
    useState<CharacterFilter>('all');
  const [tag, setTag] =
    useState<TagFilter>('all');
  const [sortOrder, setSortOrder] =
    useState<SortOrder>('newest');

  const [illustrations, setIllustrations] =
    useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedPost, setSelectedPost] =
    useState<GalleryPost | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const posts = await fetchGalleryPosts();

        if (alive) {
          setIllustrations(posts);
          setError('');

          setSelectedPost((current) => {
            if (!current) return null;

            return (
              posts.find((post) => post.id === current.id) ??
              null
            );
          });
        }
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : 'ギャラリーを読み込めませんでした。'
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
  }, []);

  useEffect(() => {
    if (!selectedPost) return;

    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      const images = getGalleryImages(selectedPost);

      if (event.key === 'Escape') {
        setSelectedPost(null);
        return;
      }

      if (images.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((current) =>
          current <= 0
            ? images.length - 1
            : current - 1
        );
      }

      if (event.key === 'ArrowRight') {
        setSelectedImageIndex((current) =>
          current >= images.length - 1
            ? 0
            : current + 1
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedPost]);

  useEffect(() => {
    if (!selectedPost) {
      setSelectedImageIndex(0);
      return;
    }

    const count =
      getGalleryImages(selectedPost).length;

    if (
      count === 0 ||
      selectedImageIndex >= count
    ) {
      setSelectedImageIndex(0);
    }
  }, [selectedPost, selectedImageIndex]);

  const filtered = useMemo(() => {
    return illustrations
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
    illustrations,
    category,
    character,
    tag,
    sortOrder,
  ]);

  const pillStyle = (active: boolean) => ({
    padding: '8px 14px',
    borderRadius: '999px',
    border:
      '1px solid rgba(255,255,255,.2)',
    background: active
      ? 'rgba(255,255,255,.92)'
      : 'rgba(255,255,255,.06)',
    color:
      active
        ? '#17191d'
        : '#f5f5f5',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all .18s ease',
  });

  const openPost = (post: GalleryPost) => {
    setSelectedPost(post);
    setSelectedImageIndex(0);
  };

  const selectedImages =
    selectedPost
      ? getGalleryImages(selectedPost)
      : [];

  const selectedCharacters =
    selectedPost
      ? getGalleryCharacters(selectedPost)
      : [];

  const selectedTags =
    selectedPost
      ? getGalleryTags(selectedPost)
      : [];

  const selectedCommission =
    selectedPost
      ? getGalleryCommission(selectedPost)
      : null;

  const selectedSong =
    selectedPost
      ? getGallerySong(selectedPost)
      : null;

  return (
    <>
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '56px 32px 80px',
          color: '#f5f5f5',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            marginBottom: '34px',
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 8px',
                fontSize: '32px',
                letterSpacing: '.08em',
              }}
            >
              ILLUSTRATION
            </h1>

            <p
              style={{
                margin: 0,
                color:
                  'rgba(255,255,255,.55)',
                fontSize: '13px',
              }}
            >
              shiki & solas archive
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() =>
                router.push('/gallery/add')
              }
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border:
                  '1px solid rgba(255,255,255,.3)',
                background: '#f1f1f1',
                color: '#17191d',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ＋ ADD ILLUSTRATION
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            aria-label={
              sortOrder === 'newest'
                ? '新しい順。押すと古い順に切り替えます'
                : '古い順。押すと新しい順に切り替えます'
            }
            title={
              sortOrder === 'newest'
                ? '新しい順'
                : '古い順'
            }
            onClick={() =>
              setSortOrder((current) =>
                current === 'newest'
                  ? 'oldest'
                  : 'newest'
              )
            }
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              border:
                '1px solid rgba(255,255,255,.2)',
              background:
                'rgba(255,255,255,.06)',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              {sortOrder === 'newest'
                ? '↓'
                : '↑'}
            </span>
          </button>
        </div>

        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          <button
            onClick={() =>
              setCategory('original')
            }
            style={pillStyle(
              category === 'original'
            )}
          >
            ORIGINAL
          </button>

          <button
            onClick={() =>
              setCategory('commission')
            }
            style={pillStyle(
              category === 'commission'
            )}
          >
            COMMISSION
          </button>
        </section>

        <section
          style={{ marginBottom: '18px' }}
        >
          <p
            style={{
              margin: '0 0 9px',
              fontSize: '10px',
              letterSpacing: '.14em',
              color:
                'rgba(255,255,255,.45)',
            }}
          >
            CHARACTER
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <button
              onClick={() =>
                setCharacter('all')
              }
              style={pillStyle(
                character === 'all'
              )}
            >
              ALL CHARACTER
            </button>

            <button
              onClick={() =>
                setCharacter('shiki')
              }
              style={pillStyle(
                character === 'shiki'
              )}
            >
              SHIKI
            </button>

            <button
              onClick={() =>
                setCharacter('solas')
              }
              style={pillStyle(
                character === 'solas'
              )}
            >
              SOLAS
            </button>
          </div>
        </section>

        {category === 'original' && (
          <section
            style={{
              marginBottom: '36px',
            }}
          >
            <p
              style={{
                margin: '0 0 9px',
                fontSize: '10px',
                letterSpacing: '.14em',
                color:
                  'rgba(255,255,255,.45)',
              }}
            >
              TAG
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                onClick={() =>
                  setTag('all')
                }
                style={pillStyle(
                  tag === 'all'
                )}
              >
                ALL TAG
              </button>

              <button
                onClick={() =>
                  setTag('reference')
                }
                style={pillStyle(
                  tag === 'reference'
                )}
              >
                REFERENCE
              </button>

              <button
                onClick={() =>
                  setTag('song-parody')
                }
                style={pillStyle(
                  tag === 'song-parody'
                )}
              >
                SONG PARODY
              </button>

              <button
                onClick={() =>
                  setTag('manga')
                }
                style={pillStyle(
                  tag === 'manga'
                )}
              >
                MANGA
              </button>

              <button
                onClick={() =>
                  setTag('rakugaki')
                }
                style={pillStyle(
                  tag === 'rakugaki'
                )}
              >
                RAKUGAKI
              </button>

              <button
                onClick={() =>
                  setTag('tachie')
                }
                style={pillStyle(
                  tag === 'tachie'
                )}
              >
                TACHIE
              </button>
            </div>
          </section>
        )}

        {category === 'commission' && (
          <div
            style={{
              marginBottom: '36px',
            }}
          />
        )}

        {loading && (
          <p
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color:
                'rgba(255,255,255,.45)',
            }}
          >
            LOADING...
          </p>
        )}

        {error && (
          <p
            style={{
              padding: '20px 0',
              color: '#ff8d8d',
            }}
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '28px 22px',
            }}
          >
            {filtered.map((item) => {
              const images =
                getGalleryImages(item);

              const imageCount =
                images.length;

              const thumbnail =
                getGalleryThumbnailImage(item);

              const itemCharacters =
                getGalleryCharacters(item);

              const itemTags =
                getGalleryTags(item);

              const commission =
                getGalleryCommission(item);

              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openPost(item)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        'Enter' ||
                      event.key === ' '
                    ) {
                      event.preventDefault();
                      openPost(item);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      background:
                        'rgba(255,255,255,.08)',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    {thumbnail ? (
                      <CropImg
                        src={optimizeCloudinaryUrl(
                          thumbnail.url
                        )}
                        crop={
                          item.thumbnailCrop
                        }
                        alt="illustration thumbnail"
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          color:
                            'rgba(255,255,255,.35)',
                          fontSize: '12px',
                        }}
                      >
                        NO IMAGE
                      </div>
                    )}

                    {imageCount > 1 && (
                      <div
                        aria-label={`${imageCount}枚の画像`}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          minWidth: '30px',
                          height: '30px',
                          padding: '0 8px',
                          borderRadius:
                            '999px',
                          display: 'grid',
                          placeItems:
                            'center',
                          background:
                            'rgba(0,0,0,.68)',
                          border:
                            '1px solid rgba(255,255,255,.28)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          backdropFilter:
                            'blur(6px)',
                        }}
                      >
                        {imageCount}
                      </div>
                    )}
                  </div>

                  <p
                    style={{
                      margin: '0 0 5px',
                      fontSize: '11px',
                      color:
                        'rgba(255,255,255,.55)',
                    }}
                  >
                    {item.date}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      color:
                        'rgba(255,255,255,.7)',
                    }}
                  >
                    {item.category ===
                    'commission'
                      ? [
                          'COMMISSION',
                          ...itemCharacters.map(
                            characterLabel
                          ),
                        ].join(' · ')
                      : [
                          'ORIGINAL',
                          ...itemCharacters.map(
                            characterLabel
                          ),
                          ...itemTags.map(
                            tagLabel
                          ),
                        ].join(' · ')}
                  </p>

                  {item.category ===
                    'commission' &&
                    commission && (
                    <p
                      style={{
                        margin:
                          '5px 0 0',
                        fontSize:
                          '11px',
                        color:
                          'rgba(255,255,255,.58)',
                      }}
                    >
                      Artist:{' '}
                      {
                        commission.artistName
                      }
                      様
                      {commission.snsId
                        ? ` / ${commission.snsId}`
                        : ''}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading &&
          !error &&
          filtered.length === 0 && (
            <p
              style={{
                padding: '60px 0',
                textAlign: 'center',
                color:
                  'rgba(255,255,255,.45)',
              }}
            >
              NO ILLUSTRATIONS
            </p>
          )}
      </main>

      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="イラスト詳細"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedPost(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background:
              'rgba(8,10,14,.86)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
            padding: '28px',
          }}
        >
          <div
            style={{
              width: 'min(1180px, 100%)',
              maxHeight:
                'calc(100vh - 56px)',
              overflow: 'auto',
              borderRadius: '14px',
              border:
                '1px solid rgba(255,255,255,.16)',
              background: '#171a1f',
              boxShadow:
                '0 24px 80px rgba(0,0,0,.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '12px',
                padding:
                  '14px 16px',
                borderBottom:
                  '1px solid rgba(255,255,255,.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color:
                      'rgba(255,255,255,.55)',
                  }}
                >
                  {selectedPost.date}
                </span>

                {selectedImages.length >
                  1 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color:
                        'rgba(255,255,255,.45)',
                    }}
                  >
                    {selectedImageIndex +
                      1}{' '}
                    /{' '}
                    {
                      selectedImages.length
                    }
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/gallery/${selectedPost.id}/edit`
                      )
                    }
                    style={{
                      padding:
                        '8px 12px',
                      borderRadius:
                        '8px',
                      border:
                        '1px solid rgba(255,255,255,.2)',
                      background:
                        'rgba(255,255,255,.08)',
                      color: '#fff',
                      cursor:
                        'pointer',
                      fontSize:
                        '11px',
                      fontWeight: 700,
                    }}
                  >
                    EDIT
                  </button>
                )}

                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() =>
                    setSelectedPost(null)
                  }
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius:
                      '999px',
                    border:
                      '1px solid rgba(255,255,255,.2)',
                    background:
                      'rgba(255,255,255,.08)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1fr) minmax(240px, 310px)',
                minHeight: '540px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  minHeight: '540px',
                  background: '#0d0f12',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {selectedImages[
                  selectedImageIndex
                ] ? (
                  <img
                    src={
                      selectedImages[
                        selectedImageIndex
                      ].url
                    }
                    alt={`illustration ${
                      selectedImageIndex +
                      1
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

                {selectedImages.length >
                  1 && (
                  <>
                    <button
                      type="button"
                      aria-label="前の画像"
                      onClick={() =>
                        setSelectedImageIndex(
                          (current) =>
                            current <= 0
                              ? selectedImages.length -
                                1
                              : current -
                                1
                        )
                      }
                      style={{
                        position:
                          'absolute',
                        left: '14px',
                        top: '50%',
                        transform:
                          'translateY(-50%)',
                        width: '42px',
                        height: '42px',
                        borderRadius:
                          '999px',
                        border:
                          '1px solid rgba(255,255,255,.24)',
                        background:
                          'rgba(0,0,0,.55)',
                        color: '#fff',
                        cursor:
                          'pointer',
                        fontSize:
                          '20px',
                      }}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      aria-label="次の画像"
                      onClick={() =>
                        setSelectedImageIndex(
                          (current) =>
                            current >=
                            selectedImages.length -
                              1
                              ? 0
                              : current +
                                1
                        )
                      }
                      style={{
                        position:
                          'absolute',
                        right: '14px',
                        top: '50%',
                        transform:
                          'translateY(-50%)',
                        width: '42px',
                        height: '42px',
                        borderRadius:
                          '999px',
                        border:
                          '1px solid rgba(255,255,255,.24)',
                        background:
                          'rgba(0,0,0,.55)',
                        color: '#fff',
                        cursor:
                          'pointer',
                        fontSize:
                          '20px',
                      }}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              <aside
                style={{
                  padding: '24px',
                  borderLeft:
                    '1px solid rgba(255,255,255,.1)',
                  display: 'grid',
                  alignContent: 'start',
                  gap: '20px',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '0 0 7px',
                      fontSize: '11px',
                      color:
                        'rgba(255,255,255,.48)',
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
                        'rgba(255,255,255,.84)',
                    }}
                  >
                    {selectedPost.category ===
                    'commission'
                      ? [
                          'COMMISSION',
                          ...selectedCharacters.map(
                            characterLabel
                          ),
                        ].join(' · ')
                      : [
                          'ORIGINAL',
                          ...selectedCharacters.map(
                            characterLabel
                          ),
                          ...selectedTags.map(
                            tagLabel
                          ),
                        ].join(' · ')}
                  </p>
                </div>

                {selectedPost.category ===
                  'commission' &&
                  selectedCommission && (
                  <div>
                    <p
                      style={{
                        margin:
                          '0 0 7px',
                        fontSize:
                          '11px',
                        color:
                          'rgba(255,255,255,.48)',
                      }}
                    >
                      ARTIST
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize:
                          '12px',
                        lineHeight:
                          1.8,
                        color:
                          'rgba(255,255,255,.84)',
                      }}
                    >
                      {
                        selectedCommission.artistName
                      }
                      様
                    </p>

                    {selectedCommission.snsUrl ? (
                      <a
                        href={
                          selectedCommission.snsUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display:
                            'inline-block',
                          marginTop:
                            '6px',
                          fontSize:
                            '12px',
                          color:
                            '#fff',
                          textDecoration:
                            'underline',
                          textUnderlineOffset:
                            '3px',
                        }}
                      >
                        {selectedCommission.snsId ||
                          'SNSを見る'}
                      </a>
                    ) : (
                      selectedCommission.snsId && (
                        <p
                          style={{
                            margin:
                              '6px 0 0',
                            fontSize:
                              '12px',
                            color:
                              'rgba(255,255,255,.65)',
                          }}
                        >
                          {
                            selectedCommission.snsId
                          }
                        </p>
                      )
                    )}
                  </div>
                )}

                {selectedSong && (
                  <div>
                    <p
                      style={{
                        margin:
                          '0 0 7px',
                        fontSize:
                          '11px',
                        color:
                          'rgba(255,255,255,.48)',
                      }}
                    >
                      SONG
                    </p>

                    {selectedSong.title && (
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            '12px',
                          lineHeight:
                            1.8,
                          color:
                            'rgba(255,255,255,.84)',
                        }}
                      >
                        {
                          selectedSong.title
                        }
                      </p>
                    )}

                    {selectedSong.url && (
                      <a
                        href={
                          selectedSong.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display:
                            'inline-block',
                          marginTop:
                            selectedSong.title
                              ? '6px'
                              : 0,
                          fontSize:
                            '12px',
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

                {selectedImages.length >
                  1 && (
                  <div>
                    <p
                      style={{
                        margin:
                          '0 0 8px',
                        fontSize:
                          '11px',
                        color:
                          'rgba(255,255,255,.48)',
                      }}
                    >
                      IMAGES
                    </p>

                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'repeat(4, minmax(0, 1fr))',
                        gap: '7px',
                      }}
                    >
                      {selectedImages.map(
                        (
                          image,
                          index
                        ) => (
                          <button
                            key={
                              image.publicId
                            }
                            type="button"
                            onClick={() =>
                              setSelectedImageIndex(
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
                                selectedImageIndex ===
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
                              src={optimizeCloudinaryUrl(
                                image.url
                              )}
                              alt={`${index + 1}枚目`}
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
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
