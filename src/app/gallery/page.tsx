'use client';

import { useEffect, useState } from 'react';

type Category = 'mine' | 'commission';
type CharacterTag = 'shiki' | 'solas';

export default function NewIllustrationPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<Category>('mine');
  const [tags, setTags] = useState<CharacterTag[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(image);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

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

    alert(
      `投稿データを受け取りました！\n\n` +
      `TITLE: ${title}\n` +
      `DATE: ${date}\n` +
      `CATEGORY: ${category}\n` +
      `TAGS: ${tags.join(', ') || 'なし'}\n\n` +
      `※まだ保存はされません。`
    );
  };

  const fieldStyle = {
    display: 'grid',
    gap: '8px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(255,255,255,.08)',
    color: '#f5f5f5',
    boxSizing: 'border-box' as const,
  };

  const choiceStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    cursor: 'pointer',
  };

  return (
    <main
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '56px 32px 80px',
        color: '#f5f5f5',
      }}
    >
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '32px',
          letterSpacing: '.08em',
        }}
      >
        ADD ILLUSTRATION
      </h1>

      <p
        style={{
          margin: '0 0 36px',
          color: 'rgba(255,255,255,.6)',
          fontSize: '13px',
        }}
      >
        イラスト情報を入力して投稿します。
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) 1fr',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        <section>
          <div
            style={{
              aspectRatio: '4 / 5',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.06)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <span
                style={{
                  color: 'rgba(255,255,255,.4)',
                  fontSize: '12px',
                }}
              >
                IMAGE PREVIEW
              </span>
            )}
          </div>

          <label
            style={{
              ...fieldStyle,
              marginTop: '14px',
            }}
          >
            <span>IMAGE</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              style={{ color: '#f5f5f5' }}
            />
          </label>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '26px',
          }}
        >
          <label style={fieldStyle}>
            <span>TITLE</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="イラストのタイトル"
              required
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>DATE</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                ...inputStyle,
                maxWidth: '220px',
              }}
            />
          </label>

          <fieldset
            style={{
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <legend style={{ padding: '0 8px' }}>CATEGORY</legend>

            <div
              style={{
                display: 'flex',
                gap: '24px',
              }}
            >
              <label style={choiceStyle}>
                <input
                  type="radio"
                  name="category"
                  checked={category === 'mine'}
                  onChange={() => setCategory('mine')}
                />
                mine
              </label>

              <label style={choiceStyle}>
                <input
                  type="radio"
                  name="category"
                  checked={category === 'commission'}
                  onChange={() => setCategory('commission')}
                />
                commission
              </label>
            </div>
          </fieldset>

          <fieldset
            style={{
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <legend style={{ padding: '0 8px' }}>TAGS</legend>

            <div
              style={{
                display: 'flex',
                gap: '24px',
              }}
            >
              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('shiki')}
                  onChange={() => toggleTag('shiki')}
                />
                shiki
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('solas')}
                  onChange={() => toggleTag('solas')}
                />
                solas
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            style={{
              marginTop: '6px',
              padding: '13px 20px',
              border: '1px solid rgba(255,255,255,.35)',
              borderRadius: '9px',
              background: '#f1f1f1',
              color: '#17191d',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            POST
          </button>
        </section>
      </form>
    </main>
  );
}
