'use client';

import { useState } from 'react';

type Category = 'all' | 'mine' | 'commission';

const illustrations = [
  {
    id: 1,
    title: 'イラストA',
    date: '2026.08.25',
    category: 'mine',
    tags: ['キャラA'],
  },
  {
    id: 2,
    title: 'イラストB',
    date: '2026.07.10',
    category: 'commission',
    tags: ['キャラB'],
  },
  {
    id: 3,
    title: 'イラストC',
    date: '2026.06.18',
    category: 'mine',
    tags: ['キャラA', 'キャラB'],
  },
];

export default function GalleryPage() {
  const [category, setCategory] = useState<Category>('all');
  const [tag, setTag] = useState<string>('all');

  const filtered = illustrations.filter((item) => {
    const categoryMatch =
      category === 'all' || item.category === category;

    const tagMatch =
      tag === 'all' || item.tags.includes(tag);

    return categoryMatch && tagMatch;
  });

  return (
    <main style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '32px' }}>ILLUSTRATION</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setCategory('all')}>ALL</button>
        <button onClick={() => setCategory('mine')}>自作</button>
        <button onClick={() => setCategory('commission')}>依頼</button>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => setTag('all')}>すべてのキャラ</button>
        <button onClick={() => setTag('キャラA')}>キャラA</button>
        <button onClick={() => setTag('キャラB')}>キャラB</button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '24px',
        }}
      >
        {filtered.map((item) => (
          <article key={item.id}>
            <div
              style={{
                aspectRatio: '1 / 1',
                background: '#dddddd',
                marginBottom: '10px',
              }}
            />

            <h2 style={{ fontSize: '16px', margin: '0 0 4px' }}>
              {item.title}
            </h2>

            <p style={{ fontSize: '12px', margin: 0 }}>
              {item.date}
            </p>

            <p style={{ fontSize: '12px' }}>
              {item.tags.join(' / ')}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
