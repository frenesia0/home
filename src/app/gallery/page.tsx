'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  subscribeGallery,
  type GalleryCategory,
  type GalleryCharacterTag,
  type GalleryPost,
} from '@/lib/galleryData';

type FilterTag = 'all' | GalleryCharacterTag;

export default function GalleryPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [category, setCategory] = useState<GalleryCategory>('original');
  const [tag, setTag] = useState<FilterTag>('all');
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
        if (tag === 'all') return true;
        return item.tags.includes(tag);
      })
      .filter((item) => {
        if (!normalizedQuery) return true;

        const searchableText = [
          item.title,
          item.date,
          item.category,
          ...item.tags,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [illustrations, category, tag, query]);

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
            onClick={() => router.push('/gallery/new')}
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

      <div style={{ marginBottom: '22px' }}>
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

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '36px',
        }}
      >
        <button
          onClick={() => setTag('all')}
          style={pillStyle(tag === 'all')}
        >
          ALL
        </button>

        <button
          onClick={() => setTag('shiki')}
          style={pillStyle(tag === 'shiki')}
        >
          SHIKI
        </button>

        <button
          onClick={() => setTag('solas')}
          style={pillStyle(tag === 'solas')}
        >
          SOLAS
        </button>

        <button
          onClick={() => setTag('reference')}
          style={pillStyle(tag === 'reference')}
        >
          REFERENCE
        </button>
      </section>

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
          {filtered.map((item) => (
            <article key={item.id}>
              <div
                style={{
                  aspectRatio: '1 / 1',
                  background: 'rgba(255,255,255,.08)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              <h2
                style={{
                  fontSize: '15px',
                  margin: '0 0 5px',
                  fontWeight: 600,
                }}
              >
                {item.title}
              </h2>

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
                {item.category.toUpperCase()} ·{' '}
                {item.tags
                  .map((itemTag) => itemTag.toUpperCase())
                  .join(' / ')}
              </p>
            </article>
          ))}
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
