'use client';

import { useState } from 'react';

type Category = 'original' | 'commission';
type CharacterTag = 'shiki' | 'solas';

export default function NewIllustrationPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<Category>('original');
  const [tags, setTags] = useState<CharacterTag[]>([]);
  const [image, setImage] = useState<File | null>(null);

  const toggleTag = (tag: CharacterTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log({
      image,
      title,
      date,
      category,
      tags,
    });

    alert('入力内容を受け取りました！保存機能は次に接続します。');
  };

  return (
    <main
      style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '48px',
      }}
    >
      <h1 style={{ marginBottom: '36px' }}>ADD ILLUSTRATION</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}
      >
        <label>
          <div style={{ marginBottom: '8px' }}>IMAGE</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          <div style={{ marginBottom: '8px' }}>TITLE</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="イラストのタイトル"
            required
            style={{
              width: '100%',
              padding: '10px',
            }}
          />
        </label>

        <label>
          <div style={{ marginBottom: '8px' }}>DATE</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              padding: '10px',
            }}
          />
        </label>

        <fieldset>
          <legend>CATEGORY</legend>

          <label style={{ marginRight: '20px' }}>
            <input
              type="radio"
              name="category"
              checked={category === 'original'}
              onChange={() => setCategory('original')}
            />
            {' '}自作
          </label>

          <label>
            <input
              type="radio"
              name="category"
              checked={category === 'commission'}
              onChange={() => setCategory('commission')}
            />
            {' '}依頼
          </label>
        </fieldset>

        <fieldset>
          <legend>TAGS</legend>

          <label style={{ marginRight: '20px' }}>
            <input
              type="checkbox"
              checked={tags.includes('shiki')}
              onChange={() => toggleTag('shiki')}
            />
            {' '}shiki
          </label>

          <label>
            <input
              type="checkbox"
              checked={tags.includes('solas')}
              onChange={() => toggleTag('solas')}
            />
            {' '}solas
          </label>
        </fieldset>

        <button
          type="submit"
          style={{
            padding: '12px 20px',
            cursor: 'pointer',
          }}
        >
          POST
        </button>
      </form>
    </main>
  );
}
