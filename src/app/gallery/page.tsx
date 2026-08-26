'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { useAuth } from '@/lib/auth';

import {
  fetchGalleryPosts,
  getCachedGalleryPosts,
  getGalleryCharacters,
  getGalleryCommission,
  getGalleryImages,
  getGalleryTags,
  getGalleryThumbnailImage,
  subscribeGallery,
  type GalleryCategory,
  type GalleryCharacter,
  type GalleryPost,
  type GalleryTag,
} from '@/lib/galleryData';

import { CropImg } from '@/components/ui/CropEditor';
import {
  WatermarkOverlay,
} from '@/components/gallery/WatermarkedImage';

type CharacterFilter =
  | 'all'
  | GalleryCharacter;

type TagFilter =
  | 'all'
  | GalleryTag;

type SortOrder =
  | 'newest'
  | 'oldest';

const PAGE_SIZE = 20;

function optimizeCloudinaryUrl(
  url: string
) {
  if (
    !url.includes('/upload/')
  ) {
    return url;
  }

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:best,c_limit,w_1000/'
  );
}

function characterLabel(
  character: GalleryCharacter
) {
  return character.toUpperCase();
}

function tagLabel(
  tag: GalleryTag
) {
  if (
    tag === 'song-parody'
  ) {
    return 'SONG PARODY';
  }

  if (
    tag === 'single-illustration'
  ) {
    return '一枚絵';
  }

  if (
    tag === 'deformed'
  ) {
    return 'デフォルメ';
  }

  return tag.toUpperCase();
}

function isCategory(
  value: string | null
): value is GalleryCategory {
  return (
    value === 'original' ||
    value === 'commission'
  );
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
    value === 'tachie' ||
    value === 'single-illustration' ||
    value === 'deformed'
  );
}

function isSortOrder(
  value: string | null
): value is SortOrder {
  return (
    value === 'newest' ||
    value === 'oldest'
  );
}

function buildGalleryQuery(
  category: GalleryCategory,
  character: CharacterFilter,
  tag: TagFilter,
  sortOrder: SortOrder
) {
  const params =
    new URLSearchParams();

  if (
    category !== 'original'
  ) {
    params.set(
      'category',
      category
    );
  }

  if (
    character !== 'all'
  ) {
    params.set(
      'character',
      character
    );
  }

  if (
    category === 'original' &&
    tag !== 'all'
  ) {
    params.set(
      'tag',
      tag
    );
  }

  if (
    sortOrder !== 'newest'
  ) {
    params.set(
      'sort',
      sortOrder
    );
  }

  return params.toString();
}

export default function GalleryPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const { isAdmin } =
    useAuth();

  const initialCategory =
    isCategory(
      searchParams.get(
        'category'
      )
    )
      ? (
          searchParams.get(
            'category'
          ) as GalleryCategory
        )
      : 'original';

  const initialCharacter =
    isCharacterFilter(
      searchParams.get(
        'character'
      )
    )
      ? (
          searchParams.get(
            'character'
          ) as CharacterFilter
        )
      : 'all';

  const initialTag =
    isTagFilter(
      searchParams.get(
        'tag'
      )
    )
      ? (
          searchParams.get(
            'tag'
          ) as TagFilter
        )
      : 'all';

  const initialSort =
    isSortOrder(
      searchParams.get(
        'sort'
      )
    )
      ? (
          searchParams.get(
            'sort'
          ) as SortOrder
        )
      : 'newest';

  const [
    category,
    setCategory,
  ] =
    useState<GalleryCategory>(
      initialCategory
    );

  const [
    character,
    setCharacter,
  ] =
    useState<CharacterFilter>(
      initialCharacter
    );

  const [
    tag,
    setTag,
  ] =
    useState<TagFilter>(
      initialTag
    );

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState<SortOrder>(
      initialSort
    );

  const [
    illustrations,
    setIllustrations,
  ] =
    useState<GalleryPost[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  useEffect(() => {
    let alive = true;
    let firstSnapshot = true;

    const cachedPosts =
      getCachedGalleryPosts();

    if (
      cachedPosts &&
      cachedPosts.length > 0
    ) {
      setIllustrations(
        cachedPosts
      );
      setLoading(false);
    }

    const load =
      async () => {
        try {
          const posts =
            await fetchGalleryPosts();

          if (alive) {
            setIllustrations(
              posts
            );

            setError('');
          }
        } catch (err) {
          if (
            alive &&
            !cachedPosts
          ) {
            setError(
              err instanceof
                Error
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

          void load();
        }
      );

    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    const query =
      buildGalleryQuery(
        category,
        character,
        tag,
        sortOrder
      );

    router.replace(
      query
        ? `/gallery?${query}`
        : '/gallery',
      {
        scroll: false,
      }
    );
  }, [
    category,
    character,
    tag,
    sortOrder,
    router,
  ]);

  /**
   * フィルター条件を変更したら
   * 必ず1ページ目へ戻る。
   */
  useEffect(() => {
    setPage(1);
  }, [
    category,
    character,
    tag,
    sortOrder,
  ]);

  const filtered =
    useMemo(() => {
      return illustrations
        .filter(
          item =>
            item.category ===
            category
        )
        .filter(
          item => {
            if (
              character ===
              'all'
            ) {
              return true;
            }

            return getGalleryCharacters(
              item
            ).includes(
              character
            );
          }
        )
        .filter(
          item => {
            if (
              category ===
                'commission' ||
              tag === 'all'
            ) {
              return true;
            }

            return getGalleryTags(
              item
            ).includes(
              tag
            );
          }
        )
        .sort(
          (a, b) =>
            sortOrder ===
            'newest'
              ? b.date.localeCompare(
                  a.date
                )
              : a.date.localeCompare(
                  b.date
                )
        );
    }, [
      illustrations,
      category,
      character,
      tag,
      sortOrder,
    ]);

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          PAGE_SIZE
      )
    );

  const currentPage =
    Math.min(
      page,
      pageCount
    );

  const pagedFiltered =
    useMemo(() => {
      const start =
        (currentPage -
          1) *
        PAGE_SIZE;

      return filtered.slice(
        start,
        start +
          PAGE_SIZE
      );
    }, [
      filtered,
      currentPage,
    ]);

  /**
   * 削除などで総ページ数が減った場合、
   * 存在しないページに残らないようにする。
   */
  useEffect(() => {
    if (
      page >
      pageCount
    ) {
      setPage(
        pageCount
      );
    }
  }, [
    page,
    pageCount,
  ]);

  const currentQuery =
    useMemo(
      () =>
        buildGalleryQuery(
          category,
          character,
          tag,
          sortOrder
        ),
      [
        category,
        character,
        tag,
        sortOrder,
      ]
    );

  const openIllustration =
    (id: string) => {
      const base =
        `/gallery/${encodeURIComponent(
          id
        )}`;

      router.push(
        currentQuery
          ? `${base}?${currentQuery}`
          : base
      );
    };

  const changePage =
    (nextPage: number) => {
      setPage(
        Math.min(
          pageCount,
          Math.max(
            1,
            nextPage
          )
        )
      );

      window.scrollTo({
        top: 120,
        behavior:
          'smooth',
      });
    };

  const pillStyle =
    (active: boolean) => ({
      padding:
        '8px 14px',
      borderRadius:
        '999px',
      border:
        '1px solid rgba(255,255,255,.2)',
      background:
        active
          ? 'rgba(255,255,255,.92)'
          : 'rgba(255,255,255,.06)',
      color:
        active
          ? '#17191d'
          : '#f5f5f5',
      cursor:
        'pointer',
      fontSize:
        '12px',
      transition:
        'all .18s ease',
    });

  return (
    <main
      className="gallery-page"
      style={{
        maxWidth:
          '1200px',
        margin:
          '0 auto',
        padding:
          '56px 32px 80px',
        color:
          '#f5f5f5',
      }}
    >
      {/* =====================
          HEADER
      ====================== */}

      <div
        className="gallery-heading"
        style={{
          display:
            'flex',
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          gap: '24px',
          marginBottom:
            '34px',
        }}
      >
        <div>
          <h1
            style={{
              margin:
                '0 0 8px',
              fontSize:
                '32px',
              letterSpacing:
                '.08em',
            }}
          >
            GALLERY
          </h1>

          <p
            style={{
              margin: 0,
              color:
                'rgba(255,255,255,.55)',
              fontSize:
                '13px',
              letterSpacing:
                '.04em',
            }}
          >
            shiki & solas
            visual archive
          </p>
        </div>

        {isAdmin && (
          <div
            className="gallery-admin-actions"
            style={{
              display:
                'flex',
              gap: '10px',
              alignItems:
                'center',
              flexWrap:
                'wrap',
              justifyContent:
                'flex-end',
            }}
          >
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
                borderRadius:
                  '8px',
                border:
                  '1px solid rgba(255,255,255,.3)',
                background:
                  'rgba(255,255,255,.05)',
                color:
                  '#f5f5f5',
                fontWeight:
                  700,
                cursor:
                  'pointer',
                letterSpacing:
                  '.02em',
              }}
            >
              UNUSED IMAGES
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/gallery/add'
                )
              }
              style={{
                padding:
                  '10px 16px',
                borderRadius:
                  '8px',
                border:
                  '1px solid rgba(255,255,255,.3)',
                background:
                  '#f1f1f1',
                color:
                  '#17191d',
                fontWeight:
                  700,
                cursor:
                  'pointer',
                letterSpacing:
                  '.02em',
              }}
            >
              ＋ ADD WORK
            </button>
          </div>
        )}
      </div>

      {/* =====================
          SORT
      ====================== */}

      <div
        style={{
          display:
            'flex',
          justifyContent:
            'flex-end',
          marginBottom:
            '22px',
        }}
      >
        <button
          type="button"
          aria-label={
            sortOrder ===
            'newest'
              ? '新しい順。押すと古い順に切り替えます'
              : '古い順。押すと新しい順に切り替えます'
          }
          title={
            sortOrder ===
            'newest'
              ? '新しい順'
              : '古い順'
          }
          onClick={() =>
            setSortOrder(
              current =>
                current ===
                'newest'
                  ? 'oldest'
                  : 'newest'
            )
          }
          style={{
            padding:
              '10px 14px',
            borderRadius:
              '9px',
            border:
              '1px solid rgba(255,255,255,.2)',
            background:
              'rgba(255,255,255,.06)',
            color:
              '#f5f5f5',
            cursor:
              'pointer',
            fontSize:
              '11px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize:
                '16px',
              lineHeight: 1,
            }}
          >
            {sortOrder ===
            'newest'
              ? '↓'
              : '↑'}
          </span>
        </button>
      </div>

      {/* =====================
          CATEGORY
      ====================== */}

      <section
        style={{
          display:
            'flex',
          flexWrap:
            'wrap',
          gap: '8px',
          marginBottom:
            '18px',
        }}
      >
        <button
          onClick={() => {
            setCategory(
              'original'
            );

            setTag(
              'all'
            );
          }}
          style={pillStyle(
            category ===
              'original'
          )}
        >
          ORIGINAL
        </button>

        <button
          onClick={() => {
            setCategory(
              'commission'
            );

            setTag(
              'all'
            );
          }}
          style={pillStyle(
            category ===
              'commission'
          )}
        >
          COMMISSION
        </button>
      </section>

      {/* =====================
          CHARACTER
      ====================== */}

      <section
        style={{
          marginBottom:
            '18px',
        }}
      >
        <p
          style={{
            margin:
              '0 0 9px',
            fontSize:
              '10px',
            letterSpacing:
              '.14em',
            color:
              'rgba(255,255,255,.45)',
          }}
        >
          CHARACTER
        </p>

        <div
          style={{
            display:
              'flex',
            flexWrap:
              'wrap',
            gap: '8px',
          }}
        >
          <button
            onClick={() =>
              setCharacter(
                'all'
              )
            }
            style={pillStyle(
              character ===
                'all'
            )}
          >
            ALL CHARACTER
          </button>

          <button
            onClick={() =>
              setCharacter(
                'shiki'
              )
            }
            style={pillStyle(
              character ===
                'shiki'
            )}
          >
            SHIKI
          </button>

          <button
            onClick={() =>
              setCharacter(
                'solas'
              )
            }
            style={pillStyle(
              character ===
                'solas'
            )}
          >
            SOLAS
          </button>
        </div>
      </section>

      {/* =====================
          TAG
      ====================== */}

      {category ===
        'original' && (
        <section
          style={{
            marginBottom:
              '36px',
          }}
        >
          <p
            style={{
              margin:
                '0 0 9px',
              fontSize:
                '10px',
              letterSpacing:
                '.14em',
              color:
                'rgba(255,255,255,.45)',
            }}
          >
            TAG
          </p>

          <div
            style={{
              display:
                'flex',
              flexWrap:
                'wrap',
              gap: '8px',
            }}
          >
            <button
              onClick={() =>
                setTag(
                  'all'
                )
              }
              style={pillStyle(
                tag === 'all'
              )}
            >
              ALL TAG
            </button>

            <button
              onClick={() =>
                setTag(
                  'reference'
                )
              }
              style={pillStyle(
                tag ===
                  'reference'
              )}
            >
              REFERENCE
            </button>

            <button
              onClick={() =>
                setTag(
                  'song-parody'
                )
              }
              style={pillStyle(
                tag ===
                  'song-parody'
              )}
            >
              SONG PARODY
            </button>

            <button
              onClick={() =>
                setTag(
                  'manga'
                )
              }
              style={pillStyle(
                tag ===
                  'manga'
              )}
            >
              MANGA
            </button>

            <button
              onClick={() =>
                setTag(
                  'rakugaki'
                )
              }
              style={pillStyle(
                tag ===
                  'rakugaki'
              )}
            >
              RAKUGAKI
            </button>

            <button
              onClick={() =>
                setTag(
                  'tachie'
                )
              }
              style={pillStyle(
                tag ===
                  'tachie'
              )}
            >
              TACHIE
            </button>

            <button
              onClick={() =>
                setTag(
                  'single-illustration'
                )
              }
              style={pillStyle(
                tag ===
                  'single-illustration'
              )}
            >
              一枚絵
            </button>

            <button
              onClick={() =>
                setTag(
                  'deformed'
                )
              }
              style={pillStyle(
                tag ===
                  'deformed'
              )}
            >
              デフォルメ
            </button>
          </div>
        </section>
      )}

      {category ===
        'commission' && (
        <div
          style={{
            marginBottom:
              '36px',
          }}
        />
      )}

      {/* =====================
          LOADING
      ====================== */}

      {loading && (
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
          LOADING...
        </p>
      )}

      {/* =====================
          ERROR
      ====================== */}

      {error && (
        <p
          style={{
            padding:
              '20px 0',
            color:
              '#ff8d8d',
          }}
        >
          {error}
        </p>
      )}

      {/* =====================
          WORK GRID
      ====================== */}

      {!loading &&
        !error &&
        filtered.length >
          0 && (
          <div
            className="gallery-grid"
          >
            {pagedFiltered.map(
              item => {
                const images =
                  getGalleryImages(
                    item
                  );

                const imageCount =
                  images.length;

                const thumbnail =
                  getGalleryThumbnailImage(
                    item
                  );

                const itemCharacters =
                  getGalleryCharacters(
                    item
                  );

                const itemTags =
                  getGalleryTags(
                    item
                  );

                const commission =
                  getGalleryCommission(
                    item
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    role="link"
                    tabIndex={
                      0
                    }
                    className="gallery-work"
                    onClick={() =>
                      openIllustration(
                        item.id
                      )
                    }
                    onKeyDown={
                      event => {
                        if (
                          event.key ===
                            'Enter' ||
                          event.key ===
                            ' '
                        ) {
                          event.preventDefault();

                          openIllustration(
                            item.id
                          );
                        }
                      }
                    }
                    style={{
                      cursor:
                        'pointer',
                      outline:
                        'none',
                      minWidth: 0,
                    }}
                  >
                    <div
                      className="gallery-thumbnail"
                      style={{
                        position:
                          'relative',
                        aspectRatio:
                          '1 / 1',
                        background:
                          'rgba(255,255,255,.08)',
                        borderRadius:
                          '8px',
                        marginBottom:
                          '10px',
                        overflow:
                          'hidden',
                      }}
                    >
                      {thumbnail ? (
                        <>
                          <CropImg
                            src={optimizeCloudinaryUrl(
                              thumbnail.url
                            )}
                            crop={
                              item.thumbnailCrop
                            }
                            alt="gallery thumbnail"
                          />

                          <WatermarkOverlay
                            watermark={
                              thumbnail.watermark
                            }
                            referenceWidth={
                              240
                            }
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            width:
                              '100%',
                            height:
                              '100%',
                            display:
                              'grid',
                            placeItems:
                              'center',
                            color:
                              'rgba(255,255,255,.35)',
                            fontSize:
                              '12px',
                          }}
                        >
                          NO IMAGE
                        </div>
                      )}

                      {imageCount >
                        1 && (
                        <div
                          aria-label={`${imageCount}枚の画像`}
                          style={{
                            position:
                              'absolute',
                            top:
                              '10px',
                            right:
                              '10px',
                            minWidth:
                              '30px',
                            height:
                              '30px',
                            padding:
                              '0 8px',
                            borderRadius:
                              '999px',
                            display:
                              'grid',
                            placeItems:
                              'center',
                            background:
                              'rgba(0,0,0,.68)',
                            border:
                              '1px solid rgba(255,255,255,.28)',
                            color:
                              '#fff',
                            fontSize:
                              '12px',
                            fontWeight:
                              700,
                            backdropFilter:
                              'blur(6px)',
                          }}
                        >
                          {
                            imageCount
                          }
                        </div>
                      )}
                    </div>

                    <p
                      style={{
                        margin:
                          '0 0 5px',
                        fontSize:
                          '11px',
                        color:
                          'rgba(255,255,255,.55)',
                      }}
                    >
                      {
                        item.date
                      }
                    </p>

                    <p
                      className="gallery-work-meta"
                      style={{
                        margin: 0,
                        fontSize:
                          '11px',
                        lineHeight:
                          1.55,
                        color:
                          'rgba(255,255,255,.7)',
                        overflowWrap:
                          'anywhere',
                      }}
                    >
                      {item.category ===
                      'commission'
                        ? [
                            'COMMISSION',
                            ...itemCharacters.map(
                              characterLabel
                            ),
                          ].join(
                            ' · '
                          )
                        : [
                            'ORIGINAL',
                            ...itemCharacters.map(
                              characterLabel
                            ),
                            ...itemTags.map(
                              tagLabel
                            ),
                          ].join(
                            ' · '
                          )}
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
                            lineHeight:
                              1.5,
                            color:
                              'rgba(255,255,255,.58)',
                            overflowWrap:
                              'anywhere',
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
              }
            )}
          </div>
        )}

      {/* =====================
          EMPTY
      ====================== */}

      {!loading &&
        !error &&
        filtered.length ===
          0 && (
          <p
            style={{
              padding:
                '60px 0',
              textAlign:
                'center',
              color:
                'rgba(255,255,255,.45)',
              fontSize:
                '12px',
              letterSpacing:
                '.1em',
            }}
          >
            NO WORKS YET
          </p>
        )}

      {/* =====================
          PAGINATION
      ====================== */}

      {!loading &&
        !error &&
        filtered.length >
          0 &&
        pageCount > 1 && (
          <nav
            className="gallery-pagination"
            aria-label="ギャラリーページ送り"
          >
            <button
              type="button"
              disabled={
                currentPage <=
                1
              }
              onClick={() =>
                changePage(
                  currentPage -
                    1
                )
              }
            >
              ←
            </button>

            <span>
              {
                currentPage
              }
              {' / '}
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
                changePage(
                  currentPage +
                    1
                )
              }
            >
              →
            </button>
          </nav>
        )}

      {/* =====================
          RESPONSIVE STYLE
      ====================== */}

      <style jsx global>{`
        .gallery-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 30px 22px;
        }

        .gallery-work {
          min-width: 0;
        }

        .gallery-thumbnail {
          transition:
            transform 0.18s ease,
            opacity 0.18s ease;
        }

        @media (hover: hover) {
          .gallery-work:hover
            .gallery-thumbnail {
            transform:
              translateY(-2px);
            opacity: 0.92;
          }
        }

        .gallery-pagination {
          margin-top: 46px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
        }

        .gallery-pagination
          button {
          min-width: 46px;
          height: 40px;
          padding: 0 13px;
          border-radius: 8px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.2
            );
          background:
            rgba(
              255,
              255,
              255,
              0.04
            );
          color: #f5f5f5;
          cursor: pointer;
          font-size: 14px;
          transition:
            opacity 0.15s ease,
            background 0.15s ease;
        }

        .gallery-pagination
          button:not(
            :disabled
          ):hover {
          background:
            rgba(
              255,
              255,
              255,
              0.09
            );
        }

        .gallery-pagination
          button:disabled {
          cursor: default;
          opacity: 0.25;
        }

        .gallery-pagination
          span {
          min-width: 74px;
          text-align: center;
          font-size: 11px;
          letter-spacing:
            0.12em;
          color:
            rgba(
              255,
              255,
              255,
              0.55
            );
        }

        /* タブレット */
        @media (
          max-width: 900px
        ) {
          .gallery-grid {
            grid-template-columns:
              repeat(
                3,
                minmax(
                  0,
                  1fr
                )
              );
            gap: 25px 18px;
          }
        }

        /* スマホ */
        @media (
          max-width: 620px
        ) {
          .gallery-page {
  padding:
    40px 18px
    calc(160px + env(safe-area-inset-bottom))
    !important;
}

          .gallery-heading {
            gap:
              18px !important;
          }

          .gallery-heading h1 {
            font-size:
              30px !important;
          }

          .gallery-admin-actions {
            gap:
              8px !important;
          }

          .gallery-admin-actions
            button {
            padding:
              9px 12px !important;
            font-size:
              10px !important;
          }

          .gallery-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
            gap: 25px 14px;
          }

          .gallery-thumbnail {
            margin-bottom:
              8px !important;
          }

          .gallery-work
            > p {
            font-size:
              9.5px !important;
          }

          .gallery-work-meta {
            line-height:
              1.45 !important;
          }

          .gallery-thumbnail
            [aria-label$='枚の画像'] {
            top:
              7px !important;
            right:
              7px !important;
            min-width:
              25px !important;
            height:
              25px !important;
            font-size:
              10px !important;
          }

          .gallery-pagination {
            margin-top:
              38px;
          }
        }

        /* かなり狭いスマホでも2列を維持 */
        @media (
          max-width: 390px
        ) {
          .gallery-page {
            padding-left:
              14px !important;
            padding-right:
              14px !important;
          }

          .gallery-grid {
            gap:
              22px 10px;
          }
        }
      `}</style>
    </main>
  );
}
