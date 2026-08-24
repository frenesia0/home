'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type Category = 'original' | 'commission';
type CharacterTag = 'shiki' | 'solas' | 'reference';
type FilterTag = 'all' | CharacterTag;

type GalleryPost = {
  id: string;
  title: string;
  date: string;
  category: Category;
  tags: CharacterTag[];
};

const STORAGE_KEY = 'shiki-solas-gallery-posts';

const demoPosts: GalleryPost[] = [
  {
    id: 'demo-1',
    title: 'Illustration 01',
    date: '2026-08-25',
    category: 'original',
    tags: ['shiki'],
  },
  {
    id: 'demo-2',
    title: 'Illustration 02',
    date: '2026-07-10',
    category: 'commission',
    tags: ['solas'],
  },
  {
    id: 'demo-3',
    title: 'Illustration 03',
    date: '2026-06-18',
    category: 'original',
    tags: ['shiki', 'solas', 'reference'],
  },
];

export default function GalleryPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [category, setCategory] = useState<Category>('original');
  const [tag, setTag] = useState<FilterTag>('all');
  const [query, setQuery] = useState('');
  const [savedPosts, setSavedPosts] = useState<GalleryPost[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      setSavedPosts([]);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as GalleryPost[];
      setSavedPosts(parsed);
    } catch {
      setSavedPosts([]);
    }
  }, []);

  const illustrations = useMemo(
    () => [...savedPosts, ...demoPosts],
    [savedPosts]
  );

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

      <div
        style={{
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
                background: 'rgba(255,255,255,.82)',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'grid',
                placeItems: 'center',
                color: '#17191d',
                fontSize: '12px',
              }}
            >
              IMAGE
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
              {item.tags.map((itemTag) => itemTag.toUpperCase()).join(' / ')}
            </p>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
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
