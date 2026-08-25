'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  getGalleryCharacters,
  getGalleryCommission,
  getGalleryImages,
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

  const [category, setCategory] = useState<GalleryCategory>('original');
  const [character, setCharacter] = useState<CharacterFilter>('all');
  const [tag, setTag] = useState<TagFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [query, setQuery] = useState('');
  const [illustrations, setIllustrations] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const posts = await fetchGalleryPosts();

        if (alive) {
          setIllustrations(posts);
          setError('');
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
        if (alive) setLoading(false);
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return illustrations
      .filter((item) => item.category === category)
      .filter((item) => {
        if (character === 'all') return true;
        return getGalleryCharacters(item).includes(character);
      })
      .filter((item) => {
        if (category === 'commission' || tag === 'all') return true;
        return getGalleryTags(item).includes(tag);
      })
      .filter((item) => {
        if (!normalizedQuery) return true;

        const commission = getGalleryCommission(item);

        const searchableText = [
          item.date,
          item.category,
          ...getGalleryCharacters(item),
          ...getGalleryTags(item),
          commission?.artistName ?? '',
          commission?.snsId ?? '',
          item.memo ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
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
    query,
    sortOrder,
  ]);

  const pillStyle = (active: boolean) => ({
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,.2)',
    background: active
      ? 'rgba(255,255,255,.92)'
      : 'rgba(255,255,255,.06)',
    color: active ? '#17191d' : '#f5f5f5',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all .18s ease',
  });

  return (
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
              color: 'rgba(255,255,255,.55)',
              fontSize: '13px',
            }}
          >
            shiki & solas archive
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => router.push('/gallery/add')}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,.3)',
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
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '22px',
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search illustrations..."
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '11px 14px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,.2)',
            background: 'rgba(255,255,255,.06)',
            color: '#f5f5f5',
            outline: 'none',
          }}
        />

        <button
          type="button"
          onClick={() =>
            setSortOrder((current) =>
              current === 'newest' ? 'oldest' : 'newest'
            )
          }
          style={{
            padding: '10px 14px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,.2)',
            background: 'rgba(255,255,255,.06)',
            color: '#f5f5f5',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          {sortOrder === 'newest' ? 'NEWEST' : 'OLDEST'}
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
          onClick={() => setCategory('original')}
          style={pillStyle(category === 'original')}
        >
          ORIGINAL
        </button>

        <button
          onClick={() => setCategory('commission')}
          style={pillStyle(category === 'commission')}
        >
          COMMISSION
        </button>
      </section>

      <section style={{ marginBottom: '18px' }}>
        <p
          style={{
            margin: '0 0 9px',
            fontSize: '10px',
            letterSpacing: '.14em',
            color: 'rgba(255,255,255,.45)',
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
            onClick={() => setCharacter('all')}
            style={pillStyle(character === 'all')}
          >
            ALL CHARACTER
          </button>

          <button
            onClick={() => setCharacter('shiki')}
            style={pillStyle(character === 'shiki')}
          >
            SHIKI
          </button>

          <button
            onClick={() => setCharacter('solas')}
            style={pillStyle(character === 'solas')}
          >
            SOLAS
          </button>
        </div>
      </section>

      {category === 'original' && (
        <section style={{ marginBottom: '36px' }}>
          <p
            style={{
              margin: '0 0 9px',
              fontSize: '10px',
              letterSpacing: '.14em',
              color: 'rgba(255,255,255,.45)',
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
              onClick={() => setTag('all')}
              style={pillStyle(tag === 'all')}
            >
              ALL TAG
            </button>

            <button
              onClick={() => setTag('reference')}
              style={pillStyle(tag === 'reference')}
            >
              REFERENCE
            </button>

            <button
              onClick={() => setTag('song-parody')}
              style={pillStyle(tag === 'song-parody')}
            >
              SONG PARODY
            </button>

            <button
              onClick={() => setTag('manga')}
              style={pillStyle(tag === 'manga')}
            >
              MANGA
            </button>

            <button
              onClick={() => setTag('rakugaki')}
              style={pillStyle(tag === 'rakugaki')}
            >
              RAKUGAKI
            </button>
          </div>
        </section>
      )}

      {category === 'commission' && (
        <div style={{ marginBottom: '36px' }} />
      )}

      {loading && (
        <p
          style={{
            padding: '60px 0',
            textAlign: 'center',
            color: 'rgba(255,255,255,.45)',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '28px 22px',
          }}
        >
          {filtered.map((item) => {
            const images = getGalleryImages(item);
            const firstImage = images[0];
            const imageCount = images.length;
            const itemCharacters = getGalleryCharacters(item);
            const itemTags = getGalleryTags(item);
            const commission = getGalleryCommission(item);

            return (
              <article key={item.id}>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    background: 'rgba(255,255,255,.08)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {firstImage ? (
                    <img
                      src={optimizeCloudinaryUrl(firstImage.url)}
                      alt="illustration"
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'rgba(255,255,255,.35)',
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
                        borderRadius: '999px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(0,0,0,.68)',
                        border: '1px solid rgba(255,255,255,.28)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        backdropFilter: 'blur(6px)',
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
                    color: 'rgba(255,255,255,.55)',
                  }}
                >
                  {item.date}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    color: 'rgba(255,255,255,.7)',
                  }}
                >
                  {item.category === 'commission'
                    ? [
                        'COMMISSION',
                        ...itemCharacters.map(characterLabel),
                      ].join(' · ')
                    : [
                        'ORIGINAL',
                        ...itemCharacters.map(characterLabel),
                        ...itemTags.map(tagLabel),
                      ].join(' · ')}
                </p>

                {item.category === 'commission' && commission && (
                  <p
                    style={{
                      margin: '5px 0 0',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,.58)',
                    }}
                  >
                    Artist: {commission.artistName}
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

      {!loading && !error && filtered.length === 0 && (
        <p
          style={{
            padding: '60px 0',
            textAlign: 'center',
            color: 'rgba(255,255,255,.45)',
          }}
        >
          NO ILLUSTRATIONS
        </p>
      )}
    </main>
  );
}
