'use client';

import {
  useEffect,
  useMemo,
  useRef,
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
    return 'SINGLE ILLUSTRATION';
  }

  if (
    tag === 'deformed'
  ) {
    return 'DEFORMED';
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
  sortOrder: SortOrder,
  page: number
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

  if (page > 1) {
    params.set(
      'page',
      String(page)
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

  const initialPageRaw =
    Number(
      searchParams.get(
        'page'
      ) ?? '1'
    );

  const initialPage =
    Number.isFinite(
      initialPageRaw
    ) &&
    initialPageRaw >= 1
      ? Math.floor(
          initialPageRaw
        )
      : 1;

  const [
    page,
    setPage,
  ] =
    useState(
      initialPage
    );

  const [
    heroPostId,
    setHeroPostId,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    /*
     * Next.jsが前ページのスクロール位置を引き継いだ場合でも、
     * GALLERYを開いた直後はページ最上部から始める。
     */
    window.requestAnimationFrame(
      () => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto',
        });
      }
    );
  }, []);

  useEffect(() => {
    let alive = true;
    let firstSnapshot = true;

    const cachedPosts =
      getCachedGalleryPosts();

    let browserCachedPosts:
      GalleryPost[] | null =
        null;

    if (
      !cachedPosts &&
      typeof window !==
        'undefined'
    ) {
      try {
        const raw =
          window.localStorage.getItem(
            'frenesia.gallery.cache.v1'
          );

        if (raw) {
          const parsed =
            JSON.parse(raw) as {
              savedAt?: number;
              posts?: GalleryPost[];
            };

          const freshEnough =
            typeof parsed.savedAt ===
              'number' &&
            Date.now() -
              parsed.savedAt <
              30 * 60 * 1000;

          if (
            freshEnough &&
            Array.isArray(
              parsed.posts
            )
          ) {
            browserCachedPosts =
              parsed.posts;
          }
        }
      } catch {
        browserCachedPosts =
          null;
      }
    }

    const immediatePosts =
      cachedPosts ??
      browserCachedPosts;

    if (
      immediatePosts &&
      immediatePosts.length > 0
    ) {
      setIllustrations(
        immediatePosts
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

            try {
              window.localStorage.setItem(
                'frenesia.gallery.cache.v1',
                JSON.stringify({
                  savedAt:
                    Date.now(),
                  posts,
                })
              );
            } catch {
              // キャッシュ保存に失敗しても表示自体は続行する。
            }
          }
        } catch (err) {
          if (
            alive &&
            !immediatePosts
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
    const candidates =
      illustrations.filter(
        (item) => {
          if (
            item.category !== 'original' ||
            item.heroEnabled !== true ||
            item.heroCrop == null
          ) {
            return false;
          }

          if (
            item.heroMode === 'custom'
          ) {
            return !!item.customHeroImage?.url;
          }

          const images =
            getGalleryImages(item);
          const index =
            typeof item.heroImageIndex === 'number'
              ? item.heroImageIndex
              : 0;

          return !!images[index];
        }
      );

    if (
      candidates.length ===
      0
    ) {
      setHeroPostId(
        null
      );
      return;
    }

    const currentStillExists =
      heroPostId &&
      candidates.some(
        (item) =>
          item.id ===
          heroPostId
      );

    if (
      currentStillExists
    ) {
      return;
    }

    const randomIndex =
      Math.floor(
        Math.random() *
          candidates.length
      );

    setHeroPostId(
      candidates[
        randomIndex
      ]?.id ?? null
    );
  }, [
    illustrations,
    heroPostId,
  ]);

  useEffect(() => {
    const query =
      buildGalleryQuery(
        category,
        character,
        tag,
        sortOrder,
        page
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
    page,
    router,
  ]);

  /**
   * フィルター条件を変更したら
   * 必ず1ページ目へ戻る。
   */
  const didMountFilters =
    useRef(false);

  useEffect(() => {
    if (
      !didMountFilters.current
    ) {
      didMountFilters.current =
        true;
      return;
    }

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
          sortOrder,
          currentPage
        ),
      [
        category,
        character,
        tag,
        sortOrder,
        currentPage,
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

  const categoryPillStyle =
    (active: boolean) => ({
      ...pillStyle(active),
      padding:
        '16px 38px',
      minWidth:
        '174px',
      minHeight:
        '54px',
      fontSize:
        '15px',
      fontWeight:
        800,
      letterSpacing:
        '.045em',
    });

  const heroPost =
    heroPostId
      ? illustrations.find(
          (item) =>
            item.id === heroPostId
        ) ?? null
      : null;

  const heroImage =
    heroPost
      ? (
          heroPost.heroMode === 'custom'
            ? heroPost.customHeroImage ?? null
            : (
                getGalleryImages(heroPost)[
                  typeof heroPost.heroImageIndex === 'number'
                    ? heroPost.heroImageIndex
                    : 0
                ] ?? null
              )
        )
      : null;

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
          GALLERY BANNER
      ====================== */}

      <section
        className="gallery-banner"
      >
        <div
          className="gallery-banner-copy"
        >
          <h1>
            GALLERY
          </h1>

          <p>
            shiki &amp; solas
            illustration archive
          </p>
        </div>

        {heroImage ? (
          <div
            className="gallery-banner-hero"
            aria-hidden="true"
          >
            <CropImg
              src={optimizeCloudinaryUrl(
                heroImage.url
              )}
              crop={
                heroPost
                  ?.heroCrop
              }
              alt=""
            />
          </div>
        ) : (
          <div
            className="gallery-banner-hero gallery-banner-hero-empty"
            aria-hidden="true"
          />
        )}

        {isAdmin && (
          <div
            className="gallery-admin-actions"
          >
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/gallery/add'
                )
              }
            >
              ＋ ADD WORK
            </button>
          </div>
        )}
      </section>

      {/* =====================
          CATEGORY
      ====================== */}

      <section
        className="gallery-category-row"
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
          style={categoryPillStyle(
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
          style={categoryPillStyle(
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
              SINGLE ILLUSTRATION
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
              DEFORMED
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
          </div>
        </section>
      )}

      {category ===
        'commission' && (
        <div
          style={{
            marginBottom:
              '18px',
          }}
        />
      )}

      {/* =====================
          SORT
      ====================== */}

      <div
        className="gallery-sort-row"
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
        >
          <span
            aria-hidden="true"
          >
            {sortOrder ===
            'newest'
              ? '↓'
              : '↑'}
          </span>
        </button>
      </div>

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
        .gallery-banner {
          position: relative;
          display: grid;
          grid-template-columns:
            minmax(260px, 0.78fr)
            minmax(0, 1.22fr);
          align-items: stretch;
          min-height: 188px;
          margin-bottom: 24px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
          overflow: hidden;
        }

        .gallery-banner-copy {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding:
            30px 30px 28px;
          background:
            linear-gradient(
              90deg,
              rgba(31,35,42,1) 0%,
              rgba(31,35,42,.98) 72%,
              rgba(31,35,42,.86) 100%
            );
        }

        .gallery-banner-copy h1 {
          margin: 0 0 8px;
          font-size: 34px;
          line-height: 1;
          letter-spacing: .08em;
        }

        .gallery-banner-copy p {
          margin: 0;
          max-width: 290px;
          color:
            rgba(
              255,
              255,
              255,
              0.56
            );
          font-size: 13px;
          line-height: 1.6;
          letter-spacing: .04em;
        }

        .gallery-banner-hero {
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #1f232a;
        }

        .gallery-banner-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          box-shadow:
            inset 16px 0 18px rgba(31,35,42,.95),
            inset -12px 0 16px rgba(31,35,42,.55),
            inset 0 10px 14px rgba(31,35,42,.5),
            inset 0 -10px 14px rgba(31,35,42,.5);
        }

        .gallery-banner-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              #1f232a 0,
              rgba(31,35,42,.72) 10px,
              transparent 26px,
              transparent calc(100% - 18px),
              rgba(31,35,42,.34) calc(100% - 8px),
              #1f232a 100%
            ),
            linear-gradient(
              180deg,
              #1f232a 0,
              transparent 18px,
              transparent calc(100% - 18px),
              #1f232a 100%
            );
        }

        .gallery-banner-hero > * {
          width: 100% !important;
          height: 100% !important;
        }

        .gallery-banner-hero-empty {
          min-height: 188px;
        }

        .gallery-admin-actions {
          position: absolute;
          right: 12px;
          top: 12px;
          z-index: 10;
          display: flex;
          gap: 8px;
        }

        .gallery-admin-actions button {
          padding: 9px 13px;
          border-radius: 8px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.3
            );
          background: #f1f1f1;
          color: #17191d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .02em;
          cursor: pointer;
        }

        .gallery-sort-row {
          display: flex;
          justify-content: flex-end;
          margin:
            -10px 0 22px;
        }

        .gallery-sort-row button {
          width: 44px;
          height: 40px;
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: 9px;
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
              0.06
            );
          color: #f5f5f5;
          cursor: pointer;
        }

        .gallery-sort-row span {
          font-size: 17px;
          line-height: 1;
        }

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
              34px 18px
              calc(160px + env(safe-area-inset-bottom))
              !important;
          }

          .gallery-banner {
            grid-template-columns:
              minmax(150px, 0.92fr)
              minmax(0, 1.08fr);
            min-height: 132px;
            margin-bottom: 18px;
          }

          .gallery-banner-copy {
            padding:
              20px 16px 18px;
          }

          .gallery-banner-copy h1 {
            font-size:
              28px !important;
            margin-bottom: 7px;
          }

          .gallery-banner-copy p {
            max-width: 160px;
            font-size: 10px;
            line-height: 1.45;
            letter-spacing: .025em;
          }

          .gallery-banner-hero {
            min-height: 132px;
          }

          .gallery-banner-hero::before {
            box-shadow:
              inset 10px 0 14px rgba(31,35,42,.9),
              inset -8px 0 12px rgba(31,35,42,.42),
              inset 0 8px 10px rgba(31,35,42,.48),
              inset 0 -8px 10px rgba(31,35,42,.48);
          }

          .gallery-banner-hero::after {
            background:
              linear-gradient(
                90deg,
                #1f232a 0,
                rgba(31,35,42,.72) 8px,
                transparent 20px,
                transparent calc(100% - 14px),
                rgba(31,35,42,.28) calc(100% - 6px),
                #1f232a 100%
              ),
              linear-gradient(
                180deg,
                #1f232a 0,
                transparent 14px,
                transparent calc(100% - 14px),
                #1f232a 100%
              );
          }

          .gallery-admin-actions {
            right: 8px;
            top: 8px;
          }

          .gallery-admin-actions button {
            padding:
              7px 9px !important;
            font-size:
              9px !important;
          }

          .gallery-category-row {
            display:
              grid !important;
            grid-template-columns:
              minmax(0, 1fr)
              minmax(0, 1fr);
            gap:
              10px !important;
            margin-bottom:
              18px !important;
          }

          .gallery-category-row
            button {
            width:
              100% !important;
            min-width:
              0 !important;
            min-height:
              52px !important;
            padding:
              13px 12px !important;
            font-size:
              13px !important;
          }

          .gallery-sort-row {
            margin:
              -20px 0 20px;
          }

          .gallery-sort-row button {
            width: 42px;
            height: 40px;
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
