'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  saveGalleryPosts,
  type GalleryCategory,
  type GalleryCharacterTag,
  type GalleryPost,
} from '@/lib/galleryData';

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

export default function NewIllustrationPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<GalleryCategory>('original');
  const [tags, setTags] = useState<GalleryCharacterTag[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(image);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  const toggleTag = (tag: GalleryCharacterTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  };

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinaryの設定が見つかりません。');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: form,
      }
    );

    const result = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok || !result.secure_url || !result.public_id) {
      throw new Error(
        result.error?.message || '画像のアップロードに失敗しました。'
      );
    }

    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAdmin || !user) {
      setError('管理者としてログインしてください。');
      return;
    }

    if (!image) {
      setError('画像を選択してください。');
      return;
    }

    if (posting) return;

    setPosting(true);
    setError('');

    try {
      const { imageUrl, publicId } = await uploadToCloudinary(image);
      const previous = await fetchGalleryPosts();

      const newPost: GalleryPost = {
        id: crypto.randomUUID(),
        title: title.trim(),
        date,
        category,
        tags,
        imageUrl,
        cloudinaryPublicId: publicId,
        authorId: user.id,
        visibility: 'public',
        createdAt: new Date().toISOString(),
      };

      await saveGalleryPosts(previous, [newPost, ...previous], user.id);

      router.push('/gallery');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '投稿に失敗しました。'
      );
    } finally {
      setPosting(false);
    }
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

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '80px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            marginBottom: '12px',
            fontSize: '28px',
            letterSpacing: '.08em',
          }}
        >
          ACCESS DENIED
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,.6)',
            marginBottom: '28px',
          }}
        >
          このページは管理者のみ利用できます。
        </p>

        <button
          onClick={() => router.push('/gallery')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,.25)',
            background: '#f1f1f1',
            color: '#17191d',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          GALLERYへ戻る
        </button>
      </main>
    );
  }

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
        新しい作品をギャラリーに追加します。
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
              required
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
              placeholder="Illustration title"
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
            <legend style={{ padding: '0 8px' }}>
              CATEGORY
            </legend>

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
                  checked={category === 'original'}
                  onChange={() => setCategory('original')}
                />
                ORIGINAL
              </label>

              <label style={choiceStyle}>
                <input
                  type="radio"
                  name="category"
                  checked={category === 'commission'}
                  onChange={() => setCategory('commission')}
                />
                COMMISSION
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
            <legend style={{ padding: '0 8px' }}>
              TAGS
            </legend>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
              }}
            >
              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('shiki')}
                  onChange={() => toggleTag('shiki')}
                />
                SHIKI
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('solas')}
                  onChange={() => toggleTag('solas')}
                />
                SOLAS
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('reference')}
                  onChange={() => toggleTag('reference')}
                />
                REFERENCE
              </label>
            </div>
          </fieldset>

          {error && (
            <p
              style={{
                margin: 0,
                color: '#ff8d8d',
                fontSize: '13px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={posting}
            style={{
              marginTop: '6px',
              padding: '13px 20px',
              border: '1px solid rgba(255,255,255,.35)',
              borderRadius: '9px',
              background: '#f1f1f1',
              color: '#17191d',
              fontWeight: 700,
              cursor: posting ? 'wait' : 'pointer',
              opacity: posting ? 0.65 : 1,
            }}
          >
            {posting ? 'UPLOADING...' : 'POST'}
          </button>
        </section>
      </form>
    </main>
  );
}
