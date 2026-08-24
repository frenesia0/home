'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = 'all' | 'original' | 'commission';
type CharacterTag = 'all' | 'shiki' | 'solas';

type GalleryPost = {
  id: string;
  title: string;
  date: string;
  category: 'original' | 'commission';
  tags: ('shiki' | 'solas')[];
};

const STORAGE_KEY = 'shiki-solas-gallery-posts';

const demoPosts: GalleryPost[] = [
  {
    id: 'demo-1',
    title: 'Illustration 01',
    date: '2026.08.25',
    category: 'original',
    tags: ['shiki'],
  },
  {
    id: 'demo-2',
    title: 'Illustration 02',
    date: '2026.07.10',
    category: 'commission',
    tags: ['solas'],
  },
  {
    id: 'demo-3',
    title: 'Illustration 03',
    date: '2026.06.18',
    category: 'original',
    tags: ['shiki', 'solas'],
  },
];

export default function GalleryPage() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>('all');
  const [tag, setTag] = useState<CharacterTag>('all');
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

  const illustrations = [...savedPosts, ...demoPosts];

  const filtered = illustrations.filter((item) => {
    const categoryMatch =
      category === 'all' || item.category === category;

    const tagMatch =
      tag === 'all' || item.tags.includes(tag);

    return categoryMatch && tagMatch;
  });

  const buttonStyle = (active: boolean) => ({
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,.2)',
    background: active
      ? 'rgba(255,255,255,.9)'
      : 'rgba(255,255,255,.06)',
    color: active ? '#17191d' : '#f5f5f5',
    cursor: 'pointer',
    fontSize: '12px',
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
      </div>

      <section style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setCategory('all')}
            style={buttonStyle(category === 'all')}
          >
            ALL
          </button>

          <button
            onClick={() => setCategory('original')}
            style={buttonStyle(category === 'original')}
          >
            ORIGINAL
          </button>

          <button
            onClick={() => setCategory('commission')}
            style={buttonStyle(category === 'commission')}
          >
            COMMISSION
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '36px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setTag('all')}
            style={buttonStyle(tag === 'all')}
          >
            ALL CHARACTERS
          </button>

          <button
            onClick={() => setTag('shiki')}
            style={buttonStyle(tag === 'shiki')}
          >
            SHIKI
          </button>

          <button
            onClick={() => setTag('solas')}
            style={buttonStyle(tag === 'solas')}
          >
            SOLAS
          </button>
        </div>
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
              {item.category.toUpperCase()} · {item.tags.join(' / ')}
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
